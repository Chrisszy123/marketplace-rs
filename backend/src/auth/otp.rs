use chrono::{Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

pub const OTP_TTL_MINUTES: i64 = 10;
const MAX_ATTEMPTS: i32 = 5;

fn generate_code() -> String {
    let code: u32 = rand::thread_rng().gen_range(0..1_000_000);
    format!("{code:06}")
}

fn hash_code(code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(code.as_bytes());
    hex::encode(hasher.finalize())
}

/// Creates a fresh OTP for the user and returns the plaintext code to send via SMS.
pub async fn issue(db: &PgPool, user_id: Uuid) -> Result<String, AppError> {
    let code = generate_code();
    let code_hash = hash_code(&code);
    let expires_at = Utc::now() + Duration::minutes(OTP_TTL_MINUTES);

    sqlx::query!(
        r#"INSERT INTO otp_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)"#,
        user_id,
        code_hash,
        expires_at,
    )
    .execute(db)
    .await?;

    Ok(code)
}

/// Verifies the most recent unconsumed OTP for the user. Each call counts as an attempt so that
/// repeated wrong guesses eventually lock the code out, independent of the endpoint-level rate
/// limit on how often /auth/verify-otp itself can be hit.
pub async fn verify(db: &PgPool, user_id: Uuid, code: &str) -> Result<(), AppError> {
    let row = sqlx::query!(
        r#"SELECT id, code_hash, attempts, expires_at FROM otp_codes
           WHERE user_id = $1 AND consumed_at IS NULL
           ORDER BY created_at DESC LIMIT 1"#,
        user_id,
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::BadRequest("no active verification code".into()))?;

    if row.attempts >= MAX_ATTEMPTS {
        return Err(AppError::BadRequest(
            "too many incorrect attempts, request a new code".into(),
        ));
    }

    if row.expires_at < Utc::now() {
        return Err(AppError::BadRequest("code has expired".into()));
    }

    if row.code_hash != hash_code(code) {
        sqlx::query!(
            r#"UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1"#,
            row.id,
        )
        .execute(db)
        .await?;
        return Err(AppError::BadRequest("incorrect code".into()));
    }

    sqlx::query!(
        r#"UPDATE otp_codes SET consumed_at = now() WHERE id = $1"#,
        row.id,
    )
    .execute(db)
    .await?;

    Ok(())
}
