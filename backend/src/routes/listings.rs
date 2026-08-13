use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{auth::extractor::AuthUser, error::AppError, pagination, AppState};

/// Free tier concurrent (active/expiring) listing cap; pro subscribers are unlimited. Chosen as
/// a reasonable default — not specified numerically in the brief, worth revisiting.
const FREE_TIER_LISTING_LIMIT: i64 = 5;
const LISTING_ACTIVE_WINDOW_DAYS: i64 = 30;

const TITLE_MAX_LEN: usize = 200;
const DESCRIPTION_MAX_LEN: usize = 5000;

const MAX_PHOTOS_PER_LISTING: i64 = 8;
const MAX_PHOTO_BYTES: usize = 5 * 1024 * 1024;
const ALLOWED_PHOTO_CONTENT_TYPES: [&str; 3] = ["image/jpeg", "image/png", "image/webp"];

#[derive(Serialize)]
pub struct ListingPhoto {
    pub id: Uuid,
    pub url: String,
    pub position: i16,
}

/// Public-safe seller info for embedding on a listing — deliberately excludes phone_number,
/// which stays behind the auth-gated `/users/{id}` endpoint (see routes::users::seller_profile).
#[derive(Serialize)]
pub struct SellerSummary {
    pub id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub member_since: DateTime<Utc>,
    pub phone_verified: bool,
}

#[derive(Serialize)]
pub struct Listing {
    pub id: Uuid,
    pub seller_id: Uuid,
    pub category_id: Uuid,
    pub listing_type: String,
    pub title: String,
    pub description: String,
    pub price_kobo: i64,
    pub currency: String,
    pub location: String,
    pub condition: Option<String>,
    pub service_area: Option<String>,
    pub status: String,
    pub is_boosted: bool,
    pub published_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub photos: Vec<ListingPhoto>,
    /// Only populated by the single-listing `get` endpoint, which is the only place the UI
    /// needs it (a guest browsing a listing should see who's selling without logging in). Other
    /// endpoints that return a `Listing` (mine, by_seller, create/update/renew) leave this `None`
    /// rather than paying for the extra lookup on every row.
    pub seller: Option<SellerSummary>,
}

struct ListingRow {
    id: Uuid,
    seller_id: Uuid,
    category_id: Uuid,
    listing_type: String,
    title: String,
    description: String,
    price_kobo: i64,
    currency: String,
    location: String,
    condition: Option<String>,
    service_area: Option<String>,
    status: String,
    is_boosted: bool,
    published_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

async fn attach_photos(db: &PgPool, row: ListingRow) -> Result<Listing, AppError> {
    let photos = sqlx::query_as!(
        ListingPhoto,
        r#"SELECT id, url, position FROM listing_photos WHERE listing_id = $1 ORDER BY position ASC, created_at ASC"#,
        row.id,
    )
    .fetch_all(db)
    .await?;

    Ok(Listing {
        id: row.id,
        seller_id: row.seller_id,
        category_id: row.category_id,
        listing_type: row.listing_type,
        title: row.title,
        description: row.description,
        price_kobo: row.price_kobo,
        currency: row.currency,
        location: row.location,
        condition: row.condition,
        service_area: row.service_area,
        status: row.status,
        is_boosted: row.is_boosted,
        published_at: row.published_at,
        expires_at: row.expires_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        photos,
        seller: None,
    })
}

async fn fetch_seller_summary(db: &PgPool, seller_id: Uuid) -> Result<SellerSummary, AppError> {
    let row = sqlx::query!(
        r#"SELECT id, display_name, avatar_url, created_at, phone_verified_at
           FROM users WHERE id = $1"#,
        seller_id,
    )
    .fetch_one(db)
    .await?;

    Ok(SellerSummary {
        id: row.id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        member_since: row.created_at,
        phone_verified: row.phone_verified_at.is_some(),
    })
}

async fn resolve_top_category_id(db: &PgPool, category_id: Uuid) -> Result<Uuid, AppError> {
    let top_id = sqlx::query_scalar!(
        r#"SELECT COALESCE(parent_id, id) AS "top_id!" FROM categories WHERE id = $1"#,
        category_id,
    )
    .fetch_one(db)
    .await?;
    Ok(top_id)
}

/// Keeps the search index in sync with a write. Propagates failures for create/update/renew —
/// silently letting a listing become unsearchable would be a worse failure mode than a 500.
async fn sync_listing_to_search(state: &AppState, row: &ListingRow) -> Result<(), AppError> {
    let top_category_id = resolve_top_category_id(&state.db, row.category_id).await?;
    let doc = crate::search::ListingDocument {
        id: row.id,
        seller_id: row.seller_id,
        category_id: row.category_id,
        top_category_id,
        listing_type: row.listing_type.clone(),
        title: row.title.clone(),
        description: row.description.clone(),
        price_kobo: row.price_kobo,
        currency: row.currency.clone(),
        location: row.location.clone(),
        condition: row.condition.clone(),
        service_area: row.service_area.clone(),
        is_boosted: row.is_boosted,
        published_at: row.published_at.timestamp(),
    };
    crate::search::index_listing(&state.meilisearch, &doc)
        .await
        .map_err(AppError::Internal)
}

#[derive(Deserialize)]
pub struct ListingRequest {
    category_id: Uuid,
    listing_type: String,
    title: String,
    description: String,
    price_kobo: i64,
    location: String,
    condition: Option<String>,
    service_area: Option<String>,
}

fn validate_listing_request(req: &ListingRequest) -> Result<(), AppError> {
    if req.title.trim().is_empty() || req.title.len() > TITLE_MAX_LEN {
        return Err(AppError::BadRequest(format!(
            "title must be 1-{TITLE_MAX_LEN} characters"
        )));
    }
    if req.description.trim().is_empty() || req.description.len() > DESCRIPTION_MAX_LEN {
        return Err(AppError::BadRequest(format!(
            "description must be 1-{DESCRIPTION_MAX_LEN} characters"
        )));
    }
    if req.price_kobo < 0 {
        return Err(AppError::BadRequest("price_kobo must not be negative".into()));
    }
    if req.location.trim().is_empty() {
        return Err(AppError::BadRequest("location is required".into()));
    }

    match req.listing_type.as_str() {
        "good" => {
            let condition_ok = matches!(req.condition.as_deref(), Some("new") | Some("used"));
            if !condition_ok {
                return Err(AppError::BadRequest(
                    "goods require condition to be \"new\" or \"used\"".into(),
                ));
            }
            if req.service_area.is_some() {
                return Err(AppError::BadRequest(
                    "service_area must not be set for goods".into(),
                ));
            }
        }
        "service" => {
            if req.service_area.as_deref().is_none_or(|s| s.trim().is_empty()) {
                return Err(AppError::BadRequest(
                    "services require a non-empty service_area".into(),
                ));
            }
            if req.condition.is_some() {
                return Err(AppError::BadRequest(
                    "condition must not be set for services".into(),
                ));
            }
        }
        _ => {
            return Err(AppError::BadRequest(
                "listing_type must be \"good\" or \"service\"".into(),
            ))
        }
    }

    Ok(())
}

async fn category_exists(db: &PgPool, category_id: Uuid) -> Result<bool, AppError> {
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1) AS "exists!""#,
        category_id,
    )
    .fetch_one(db)
    .await?;
    Ok(exists)
}

async fn is_pro_subscriber(db: &PgPool, user_id: Uuid) -> Result<bool, AppError> {
    let is_pro = sqlx::query_scalar!(
        r#"SELECT EXISTS(
             SELECT 1 FROM subscriptions
             WHERE user_id = $1 AND tier = 'pro' AND status = 'active'
           ) AS "exists!""#,
        user_id,
    )
    .fetch_one(db)
    .await?;
    Ok(is_pro)
}

pub async fn create(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req): Json<ListingRequest>,
) -> Result<(StatusCode, Json<Listing>), AppError> {
    validate_listing_request(&req)?;

    if !category_exists(&state.db, req.category_id).await? {
        return Err(AppError::BadRequest("category_id does not exist".into()));
    }

    if !is_pro_subscriber(&state.db, auth_user.user_id).await? {
        let active_count = sqlx::query_scalar!(
            r#"SELECT count(*) AS "count!" FROM listings
               WHERE seller_id = $1 AND status IN ('active', 'expiring')"#,
            auth_user.user_id,
        )
        .fetch_one(&state.db)
        .await?;

        if active_count >= FREE_TIER_LISTING_LIMIT {
            return Err(AppError::Forbidden(format!(
                "free tier is limited to {FREE_TIER_LISTING_LIMIT} concurrent listings; upgrade to post more"
            )));
        }
    }

    let now = Utc::now();
    let expires_at = now + Duration::days(LISTING_ACTIVE_WINDOW_DAYS);

    let row = sqlx::query_as!(
        ListingRow,
        r#"INSERT INTO listings
             (seller_id, category_id, listing_type, title, description, price_kobo, location,
              condition, service_area, published_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, seller_id, category_id, listing_type, title, description, price_kobo,
                     currency, location, condition, service_area, status, is_boosted,
                     published_at, expires_at, created_at, updated_at"#,
        auth_user.user_id,
        req.category_id,
        req.listing_type,
        req.title.trim(),
        req.description.trim(),
        req.price_kobo,
        req.location.trim(),
        req.condition,
        req.service_area,
        now,
        expires_at,
    )
    .fetch_one(&state.db)
    .await?;

    sync_listing_to_search(&state, &row).await?;

    let listing = attach_photos(&state.db, row).await?;
    Ok((StatusCode::CREATED, Json(listing)))
}

pub async fn get(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
) -> Result<Json<Listing>, AppError> {
    let row = sqlx::query_as!(
        ListingRow,
        r#"SELECT id, seller_id, category_id, listing_type, title, description, price_kobo,
                  currency, location, condition, service_area, status, is_boosted,
                  published_at, expires_at, created_at, updated_at
           FROM listings WHERE id = $1"#,
        listing_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("listing not found".into()))?;

    let seller = fetch_seller_summary(&state.db, row.seller_id).await?;
    let mut listing = attach_photos(&state.db, row).await?;
    listing.seller = Some(seller);

    Ok(Json(listing))
}

async fn fetch_owned_listing(
    db: &PgPool,
    listing_id: Uuid,
    user_id: Uuid,
) -> Result<ListingRow, AppError> {
    let row = sqlx::query_as!(
        ListingRow,
        r#"SELECT id, seller_id, category_id, listing_type, title, description, price_kobo,
                  currency, location, condition, service_area, status, is_boosted,
                  published_at, expires_at, created_at, updated_at
           FROM listings WHERE id = $1"#,
        listing_id,
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::NotFound("listing not found".into()))?;

    if row.seller_id != user_id {
        return Err(AppError::Forbidden(
            "you do not own this listing".into(),
        ));
    }

    Ok(row)
}

pub async fn update(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
    Json(req): Json<ListingRequest>,
) -> Result<Json<Listing>, AppError> {
    validate_listing_request(&req)?;
    fetch_owned_listing(&state.db, listing_id, auth_user.user_id).await?;

    if !category_exists(&state.db, req.category_id).await? {
        return Err(AppError::BadRequest("category_id does not exist".into()));
    }

    let row = sqlx::query_as!(
        ListingRow,
        r#"UPDATE listings SET
             category_id = $1, listing_type = $2, title = $3, description = $4,
             price_kobo = $5, location = $6, condition = $7, service_area = $8,
             updated_at = now()
           WHERE id = $9
           RETURNING id, seller_id, category_id, listing_type, title, description, price_kobo,
                     currency, location, condition, service_area, status, is_boosted,
                     published_at, expires_at, created_at, updated_at"#,
        req.category_id,
        req.listing_type,
        req.title.trim(),
        req.description.trim(),
        req.price_kobo,
        req.location.trim(),
        req.condition,
        req.service_area,
        listing_id,
    )
    .fetch_one(&state.db)
    .await?;

    sync_listing_to_search(&state, &row).await?;

    Ok(Json(attach_photos(&state.db, row).await?))
}

pub async fn delete(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    fetch_owned_listing(&state.db, listing_id, auth_user.user_id).await?;

    let photo_keys = sqlx::query_scalar!(
        r#"SELECT object_key FROM listing_photos WHERE listing_id = $1"#,
        listing_id,
    )
    .fetch_all(&state.db)
    .await?;

    // The listing row is the source of truth; DB delete cascades to listing_photos rows
    // regardless of whether the underlying S3 objects are cleaned up.
    sqlx::query!(r#"DELETE FROM listings WHERE id = $1"#, listing_id)
        .execute(&state.db)
        .await?;

    for key in photo_keys {
        if let Err(err) = crate::storage::delete_object(&state.s3_client, &state.s3_bucket, &key).await {
            tracing::warn!(?err, key, "failed to delete listing photo object from storage");
        }
    }

    if let Err(err) = crate::search::delete_listing(&state.meilisearch, listing_id).await {
        tracing::warn!(?err, %listing_id, "failed to remove listing from search index");
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn renew(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
) -> Result<Json<Listing>, AppError> {
    fetch_owned_listing(&state.db, listing_id, auth_user.user_id).await?;

    let now = Utc::now();
    let expires_at = now + Duration::days(LISTING_ACTIVE_WINDOW_DAYS);

    let row = sqlx::query_as!(
        ListingRow,
        r#"UPDATE listings SET
             status = 'active', published_at = $1, expires_at = $2, updated_at = now()
           WHERE id = $3
           RETURNING id, seller_id, category_id, listing_type, title, description, price_kobo,
                     currency, location, condition, service_area, status, is_boosted,
                     published_at, expires_at, created_at, updated_at"#,
        now,
        expires_at,
        listing_id,
    )
    .fetch_one(&state.db)
    .await?;

    sync_listing_to_search(&state, &row).await?;

    Ok(Json(attach_photos(&state.db, row).await?))
}

#[derive(Deserialize)]
pub struct MineQuery {
    cursor: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct MineResponse {
    items: Vec<Listing>,
    next_cursor: Option<String>,
}

pub async fn mine(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<MineQuery>,
) -> Result<Json<MineResponse>, AppError> {
    let limit = pagination::normalize_limit(query.limit);
    let cursor = query.cursor.as_deref().map(pagination::decode).transpose()?;

    let rows = sqlx::query_as!(
        ListingRow,
        r#"SELECT id, seller_id, category_id, listing_type, title, description, price_kobo,
                  currency, location, condition, service_area, status, is_boosted,
                  published_at, expires_at, created_at, updated_at
           FROM listings
           WHERE seller_id = $1
             AND ($2::timestamptz IS NULL OR (created_at, id) < ($2, $3))
           ORDER BY created_at DESC, id DESC
           LIMIT $4"#,
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

    let next_cursor = if has_more {
        rows.last().map(|r| pagination::encode(r.created_at, r.id))
    } else {
        None
    };

    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(attach_photos(&state.db, row).await?);
    }

    Ok(Json(MineResponse { items, next_cursor }))
}

const SELLER_LISTINGS_DEFAULT_LIMIT: i64 = 5;
const SELLER_LISTINGS_MAX_LIMIT: i64 = 20;

#[derive(Deserialize)]
pub struct BySellerQuery {
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct BySellerResponse {
    items: Vec<Listing>,
}

/// A seller's public storefront preview (e.g. "top items" on their messaging profile card) —
/// a fixed, bounded top-N, not an infinite scroll, so plain LIMIT is used rather than cursor
/// pagination.
pub async fn by_seller(
    State(state): State<AppState>,
    Path(seller_id): Path<Uuid>,
    Query(query): Query<BySellerQuery>,
) -> Result<Json<BySellerResponse>, AppError> {
    let limit = query
        .limit
        .unwrap_or(SELLER_LISTINGS_DEFAULT_LIMIT)
        .clamp(1, SELLER_LISTINGS_MAX_LIMIT);

    let rows = sqlx::query_as!(
        ListingRow,
        r#"SELECT id, seller_id, category_id, listing_type, title, description, price_kobo,
                  currency, location, condition, service_area, status, is_boosted,
                  published_at, expires_at, created_at, updated_at
           FROM listings
           WHERE seller_id = $1 AND status IN ('active', 'expiring')
           ORDER BY is_boosted DESC, published_at DESC
           LIMIT $2"#,
        seller_id,
        limit,
    )
    .fetch_all(&state.db)
    .await?;

    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(attach_photos(&state.db, row).await?);
    }

    Ok(Json(BySellerResponse { items }))
}

pub async fn upload_photo(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(listing_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<ListingPhoto>), AppError> {
    fetch_owned_listing(&state.db, listing_id, auth_user.user_id).await?;

    let existing_count = sqlx::query_scalar!(
        r#"SELECT count(*) AS "count!" FROM listing_photos WHERE listing_id = $1"#,
        listing_id,
    )
    .fetch_one(&state.db)
    .await?;

    if existing_count >= MAX_PHOTOS_PER_LISTING {
        return Err(AppError::BadRequest(format!(
            "a listing can have at most {MAX_PHOTOS_PER_LISTING} photos"
        )));
    }

    let field = multipart
        .next_field()
        .await
        .map_err(|err| AppError::BadRequest(format!("invalid multipart body: {err}")))?
        .ok_or_else(|| AppError::BadRequest("missing photo field".into()))?;

    let content_type = field.content_type().unwrap_or_default().to_string();
    if !ALLOWED_PHOTO_CONTENT_TYPES.contains(&content_type.as_str()) {
        return Err(AppError::BadRequest(
            "photo must be image/jpeg, image/png, or image/webp".into(),
        ));
    }

    let bytes = field
        .bytes()
        .await
        .map_err(|err| AppError::BadRequest(format!("failed to read photo bytes: {err}")))?;

    if bytes.is_empty() {
        return Err(AppError::BadRequest("photo is empty".into()));
    }
    if bytes.len() > MAX_PHOTO_BYTES {
        return Err(AppError::BadRequest(format!(
            "photo must be under {}MB",
            MAX_PHOTO_BYTES / 1024 / 1024
        )));
    }

    let extension = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => unreachable!("checked against ALLOWED_PHOTO_CONTENT_TYPES above"),
    };
    let object_key = format!("listings/{listing_id}/{}.{extension}", Uuid::new_v4());

    crate::storage::upload_object(
        &state.s3_client,
        &state.s3_bucket,
        &object_key,
        bytes.to_vec(),
        &content_type,
    )
    .await
    .map_err(AppError::Internal)?;

    let url = crate::storage::public_url(&state.s3_public_url_base, &object_key);
    let position = existing_count as i16;

    let photo = sqlx::query_as!(
        ListingPhoto,
        r#"INSERT INTO listing_photos (listing_id, object_key, url, position)
           VALUES ($1, $2, $3, $4) RETURNING id, url, position"#,
        listing_id,
        object_key,
        url,
        position,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(photo)))
}

pub async fn delete_photo(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((listing_id, photo_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, AppError> {
    fetch_owned_listing(&state.db, listing_id, auth_user.user_id).await?;

    let photo = sqlx::query!(
        r#"SELECT object_key FROM listing_photos WHERE id = $1 AND listing_id = $2"#,
        photo_id,
        listing_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("photo not found".into()))?;

    sqlx::query!(r#"DELETE FROM listing_photos WHERE id = $1"#, photo_id)
        .execute(&state.db)
        .await?;

    if let Err(err) =
        crate::storage::delete_object(&state.s3_client, &state.s3_bucket, &photo.object_key).await
    {
        tracing::warn!(?err, "failed to delete photo object from storage");
    }

    Ok(StatusCode::NO_CONTENT)
}
