use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::{auth::extractor::AuthUser, error::AppError, AppState};

#[derive(Serialize)]
pub struct UserProfile {
    id: Uuid,
    email: String,
    display_name: String,
    avatar_url: Option<String>,
    location: Option<String>,
    phone_verified: bool,
    member_since: DateTime<Utc>,
    /// Ratings ship in Phase 7 (post-interaction reviews); no data to aggregate yet.
    rating: Option<f64>,
}

pub async fn me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<UserProfile>, AppError> {
    let row = sqlx::query!(
        r#"SELECT id, email, display_name, avatar_url, location, phone_verified_at, created_at
           FROM users WHERE id = $1"#,
        auth_user.user_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    Ok(Json(UserProfile {
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        location: row.location,
        phone_verified: row.phone_verified_at.is_some(),
        member_since: row.created_at,
        rating: None,
    }))
}

/// Public-facing seller profile, e.g. for the messaging screen's seller detail panel and call
/// button. Includes `phone_number`, so this is gated on auth (not fully anonymous) even though
/// the underlying listings are public — matches the messaging surfaces that are the only place
/// this is currently surfaced from.
#[derive(Serialize)]
pub struct SellerProfile {
    id: Uuid,
    display_name: String,
    avatar_url: Option<String>,
    location: Option<String>,
    phone_number: String,
    phone_verified: bool,
    member_since: DateTime<Utc>,
    /// Ratings ship in Phase 7 (post-interaction reviews); no data to aggregate yet.
    rating: Option<f64>,
}

pub async fn seller_profile(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
) -> Result<Json<SellerProfile>, AppError> {
    let row = sqlx::query!(
        r#"SELECT id, display_name, avatar_url, location, phone_number, phone_verified_at, created_at
           FROM users WHERE id = $1"#,
        user_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("user not found".into()))?;

    Ok(Json(SellerProfile {
        id: row.id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        location: row.location,
        phone_number: row.phone_number,
        phone_verified: row.phone_verified_at.is_some(),
        member_since: row.created_at,
        rating: None,
    }))
}
