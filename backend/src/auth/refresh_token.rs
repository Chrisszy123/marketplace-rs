use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{Duration, Utc};
use rand::RngCore;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

pub const REFRESH_TOKEN_TTL_DAYS: i64 = 30;

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Issues a brand-new refresh token for a user (used at login), unrelated to any prior chain.
pub async fn issue(db: &PgPool, user_id: Uuid) -> Result<String, AppError> {
    let token = generate_token();
    let token_hash = hash_token(&token);
    let expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_TTL_DAYS);

    sqlx::query!(
        r#"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)"#,
        user_id,
        token_hash,
        expires_at,
    )
    .execute(db)
    .await?;

    Ok(token)
}

/// Validates a presented refresh token and rotates it: the old row is marked revoked (pointing
/// at the new row via replaced_by) and a fresh token is issued in its place. If the presented
/// token was already revoked, that's a sign of token reuse (theft or a replay of a stale
/// cookie), so the entire chain for that user is revoked defensively and the request rejected.
pub async fn rotate(db: &PgPool, presented_token: &str) -> Result<(String, Uuid), AppError> {
    let token_hash = hash_token(presented_token);

    let row = sqlx::query!(
        r#"SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1"#,
        token_hash,
    )
    .fetch_optional(db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if row.revoked_at.is_some() {
        revoke_all_for_user(db, row.user_id).await?;
        return Err(AppError::Unauthorized);
    }

    if row.expires_at < Utc::now() {
        return Err(AppError::Unauthorized);
    }

    let new_token = generate_token();
    let new_token_hash = hash_token(&new_token);
    let new_expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_TTL_DAYS);

    let mut tx = db.begin().await?;

    let new_id = sqlx::query_scalar!(
        r#"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)
           RETURNING id"#,
        row.user_id,
        new_token_hash,
        new_expires_at,
    )
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query!(
        r#"UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $1 WHERE id = $2"#,
        new_id,
        row.id,
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((new_token, row.user_id))
}

pub async fn revoke(db: &PgPool, presented_token: &str) -> Result<(), AppError> {
    let token_hash = hash_token(presented_token);
    sqlx::query!(
        r#"UPDATE refresh_tokens SET revoked_at = now()
           WHERE token_hash = $1 AND revoked_at IS NULL"#,
        token_hash,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn revoke_all_for_user(db: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    sqlx::query!(
        r#"UPDATE refresh_tokens SET revoked_at = now()
           WHERE user_id = $1 AND revoked_at IS NULL"#,
        user_id,
    )
    .execute(db)
    .await?;
    Ok(())
}
