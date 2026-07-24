use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{auth::extractor::AuthUser, error::AppError, pagination, ws, AppState};

const MESSAGE_MAX_LEN: usize = 2000;

#[derive(Serialize, Clone)]
pub struct MessageDto {
    pub id: Uuid,
    pub listing_id: Uuid,
    pub sender_id: Uuid,
    pub recipient_id: Uuid,
    pub body: String,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

async fn listing_seller_id(db: &PgPool, listing_id: Uuid) -> Result<Uuid, AppError> {
    sqlx::query_scalar!(r#"SELECT seller_id FROM listings WHERE id = $1"#, listing_id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound("listing not found".into()))
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    body: String,
    recipient_id: Option<Uuid>,
}

#[derive(Serialize)]
struct WsNewMessageEvent<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    message: &'a MessageDto,
}

/// A thread is always buyer<->seller about one listing — not general P2P messaging. The buyer
/// omits `recipient_id` (defaults to the seller); the seller must supply it, since they may have
/// several concurrent buyer threads on the same listing.
pub async fn send(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
    Json(req): Json<SendMessageRequest>,
) -> Result<(StatusCode, Json<MessageDto>), AppError> {
    let body = req.body.trim();
    if body.is_empty() || body.len() > MESSAGE_MAX_LEN {
        return Err(AppError::BadRequest(format!(
            "message must be 1-{MESSAGE_MAX_LEN} characters"
        )));
    }

    let seller_id = listing_seller_id(&state.db, listing_id).await?;

    let recipient_id = match req.recipient_id {
        Some(rid) => {
            if rid == auth_user.user_id {
                return Err(AppError::BadRequest("cannot message yourself".into()));
            }
            if auth_user.user_id != seller_id && rid != seller_id {
                return Err(AppError::BadRequest(
                    "messages about a listing must include its seller".into(),
                ));
            }
            rid
        }
        None => {
            if auth_user.user_id == seller_id {
                return Err(AppError::BadRequest(
                    "recipient_id is required when replying as the seller".into(),
                ));
            }
            seller_id
        }
    };

    let message = sqlx::query_as!(
        MessageDto,
        r#"INSERT INTO messages (listing_id, sender_id, recipient_id, body)
           VALUES ($1, $2, $3, $4)
           RETURNING id, listing_id, sender_id, recipient_id, body, read_at, created_at"#,
        listing_id,
        auth_user.user_id,
        recipient_id,
        body,
    )
    .fetch_one(&state.db)
    .await?;

    let event = WsNewMessageEvent {
        kind: "new_message",
        message: &message,
    };
    if let Ok(json) = serde_json::to_string(&event) {
        ws::push_to_user(&state.ws_registry, recipient_id, &json).await;
    }

    Ok((StatusCode::CREATED, Json(message)))
}

#[derive(Deserialize)]
pub struct ThreadQuery {
    with: Option<Uuid>,
    cursor: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ThreadMessagesResponse {
    /// Chronological order (oldest first) within this page. When paginating for older history,
    /// prepend the next page's items to the front of the list, not append.
    items: Vec<MessageDto>,
    next_cursor: Option<String>,
}

pub async fn thread_messages(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
    Query(query): Query<ThreadQuery>,
) -> Result<Json<ThreadMessagesResponse>, AppError> {
    let seller_id = listing_seller_id(&state.db, listing_id).await?;

    let counterpart_id = if auth_user.user_id == seller_id {
        query.with.ok_or_else(|| {
            AppError::BadRequest("with is required when viewing as the seller".into())
        })?
    } else {
        match query.with {
            Some(w) if w != seller_id => {
                return Err(AppError::BadRequest(
                    "with must be the listing's seller".into(),
                ))
            }
            _ => seller_id,
        }
    };

    let limit = pagination::normalize_limit(query.limit);
    let cursor = query.cursor.as_deref().map(pagination::decode).transpose()?;

    let mut rows = sqlx::query_as!(
        MessageDto,
        r#"SELECT id, listing_id, sender_id, recipient_id, body, read_at, created_at
           FROM messages
           WHERE listing_id = $1
             AND ((sender_id = $2 AND recipient_id = $3) OR (sender_id = $3 AND recipient_id = $2))
             AND ($4::timestamptz IS NULL OR (created_at, id) < ($4, $5))
           ORDER BY created_at DESC, id DESC
           LIMIT $6"#,
        listing_id,
        auth_user.user_id,
        counterpart_id,
        cursor.as_ref().map(|c| c.created_at),
        cursor.as_ref().map(|c| c.id),
        limit + 1,
    )
    .fetch_all(&state.db)
    .await?;

    let has_more = rows.len() as i64 > limit;
    rows.truncate(limit as usize);
    let next_cursor = has_more
        .then(|| rows.last().map(|r| pagination::encode(r.created_at, r.id)))
        .flatten();

    sqlx::query!(
        r#"UPDATE messages SET read_at = now()
           WHERE listing_id = $1 AND sender_id = $2 AND recipient_id = $3 AND read_at IS NULL"#,
        listing_id,
        counterpart_id,
        auth_user.user_id,
    )
    .execute(&state.db)
    .await?;

    rows.reverse();

    Ok(Json(ThreadMessagesResponse {
        items: rows,
        next_cursor,
    }))
}

#[derive(Serialize)]
pub struct ThreadSummary {
    listing_id: Uuid,
    listing_title: String,
    counterpart_id: Uuid,
    counterpart_name: String,
    counterpart_avatar_url: Option<String>,
    last_message_body: String,
    last_message_at: DateTime<Utc>,
    last_message_from_me: bool,
    unread_count: i64,
}

#[derive(Deserialize)]
pub struct ThreadsQuery {
    cursor: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ThreadsResponse {
    items: Vec<ThreadSummary>,
    next_cursor: Option<String>,
}

/// One row per (listing, counterpart) pair the user has ever exchanged messages on, most
/// recently active first.
pub async fn threads(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<ThreadsQuery>,
) -> Result<Json<ThreadsResponse>, AppError> {
    let limit = pagination::normalize_limit(query.limit);
    let cursor = query.cursor.as_deref().map(pagination::decode).transpose()?;

    let rows = sqlx::query!(
        r#"
        WITH thread_rows AS (
            SELECT
                listing_id,
                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS counterpart_id,
                body,
                sender_id,
                created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY listing_id, (CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END)
                    ORDER BY created_at DESC
                ) AS rn
            FROM messages
            WHERE sender_id = $1 OR recipient_id = $1
        )
        SELECT
            tr.listing_id AS "listing_id!",
            tr.counterpart_id AS "counterpart_id!",
            tr.body AS "last_message_body!",
            tr.created_at AS "last_message_at!",
            (tr.sender_id = $1) AS "last_message_from_me!",
            l.title AS "listing_title!",
            u.display_name AS "counterpart_name!",
            u.avatar_url AS counterpart_avatar_url,
            (SELECT count(*) FROM messages m2
               WHERE m2.listing_id = tr.listing_id AND m2.sender_id = tr.counterpart_id
                 AND m2.recipient_id = $1 AND m2.read_at IS NULL) AS "unread_count!"
        FROM thread_rows tr
        JOIN listings l ON l.id = tr.listing_id
        JOIN users u ON u.id = tr.counterpart_id
        WHERE tr.rn = 1
          AND ($2::timestamptz IS NULL OR (tr.created_at, tr.counterpart_id) < ($2, $3))
        ORDER BY tr.created_at DESC, tr.counterpart_id DESC
        LIMIT $4
        "#,
        auth_user.user_id,
        cursor.as_ref().map(|c| c.created_at),
        cursor.as_ref().map(|c| c.id),
        limit + 1,
    )
    .fetch_all(&state.db)
    .await?;

    let has_more = rows.len() as i64 > limit;
    let mut rows = rows;
    rows.truncate(limit as usize);
    let next_cursor = has_more
        .then(|| {
            rows.last()
                .map(|r| pagination::encode(r.last_message_at, r.counterpart_id))
        })
        .flatten();

    let items = rows
        .into_iter()
        .map(|r| ThreadSummary {
            listing_id: r.listing_id,
            listing_title: r.listing_title,
            counterpart_id: r.counterpart_id,
            counterpart_name: r.counterpart_name,
            counterpart_avatar_url: r.counterpart_avatar_url,
            last_message_body: r.last_message_body,
            last_message_at: r.last_message_at,
            last_message_from_me: r.last_message_from_me,
            unread_count: r.unread_count,
        })
        .collect();

    Ok(Json(ThreadsResponse { items, next_cursor }))
}
