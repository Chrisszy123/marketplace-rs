use axum::{extract::State, Json};
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
