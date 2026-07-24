use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

pub const DEFAULT_PAGE_SIZE: i64 = 20;
pub const MAX_PAGE_SIZE: i64 = 50;

/// Every listing query the user might scroll through orders by (created_at DESC, id DESC) and
/// paginates via keyset/cursor rather than OFFSET, so results stay stable as rows are inserted.
#[derive(Serialize, Deserialize)]
struct CursorPayload {
    created_at: DateTime<Utc>,
    id: Uuid,
}

pub struct Cursor {
    pub created_at: DateTime<Utc>,
    pub id: Uuid,
}

pub fn encode(created_at: DateTime<Utc>, id: Uuid) -> String {
    let payload = CursorPayload { created_at, id };
    let json = serde_json::to_vec(&payload).expect("cursor payload always serializes");
    URL_SAFE_NO_PAD.encode(json)
}

pub fn decode(cursor: &str) -> Result<Cursor, AppError> {
    let bytes = URL_SAFE_NO_PAD
        .decode(cursor)
        .map_err(|_| AppError::BadRequest("invalid cursor".into()))?;
    let payload: CursorPayload = serde_json::from_slice(&bytes)
        .map_err(|_| AppError::BadRequest("invalid cursor".into()))?;
    Ok(Cursor {
        created_at: payload.created_at,
        id: payload.id,
    })
}

pub fn normalize_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE)
}
