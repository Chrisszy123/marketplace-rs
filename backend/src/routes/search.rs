use std::collections::HashMap;

use axum::{extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{error::AppError, pagination, search as search_lib, AppState};

#[derive(Deserialize)]
pub struct SearchQuery {
    q: Option<String>,
    category_id: Option<Uuid>,
    location: Option<String>,
    min_price_kobo: Option<i64>,
    max_price_kobo: Option<i64>,
    sort: Option<String>,
    cursor: Option<String>,
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct SearchHit {
    id: Uuid,
    category_id: Uuid,
    listing_type: String,
    title: String,
    price_kobo: i64,
    currency: String,
    location: String,
    is_boosted: bool,
    thumbnail_url: Option<String>,
}

#[derive(Serialize)]
pub struct SearchResponse {
    items: Vec<SearchHit>,
    next_cursor: Option<String>,
}

pub async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, AppError> {
    let limit = pagination::normalize_limit(query.limit) as usize;
    let offset = query
        .cursor
        .as_deref()
        .map(pagination::decode_offset)
        .transpose()?
        .unwrap_or(0);

    let mut filters = Vec::new();
    if let Some(category_id) = query.category_id {
        filters.push(format!(
            r#"(category_id = "{category_id}" OR top_category_id = "{category_id}")"#
        ));
    }
    if let Some(min) = query.min_price_kobo {
        filters.push(format!("price_kobo >= {min}"));
    }
    if let Some(max) = query.max_price_kobo {
        filters.push(format!("price_kobo <= {max}"));
    }
    let filter = (!filters.is_empty()).then(|| filters.join(" AND "));

    let search_text = [query.q.as_deref(), query.location.as_deref()]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(" ");
    let search_text = (!search_text.trim().is_empty()).then(|| search_text.trim().to_string());

    // Boosted ("Top Ad") listings always rank first, regardless of the chosen sort.
    let mut sort = vec!["is_boosted:desc".to_string()];
    match query.sort.as_deref() {
        Some("date") => sort.push("published_at:desc".to_string()),
        Some("price_asc") => sort.push("price_kobo:asc".to_string()),
        Some("price_desc") => sort.push("price_kobo:desc".to_string()),
        _ => {}
    }

    let outcome = search_lib::search(
        &state.meilisearch,
        search_lib::SearchParams {
            query: search_text,
            filter,
            sort,
            offset,
            limit,
        },
    )
    .await
    .map_err(AppError::Internal)?;

    let listing_ids: Vec<Uuid> = outcome.hits.iter().map(|h| h.id).collect();
    let thumbnails = fetch_thumbnails(&state, &listing_ids).await?;

    let items = outcome
        .hits
        .into_iter()
        .map(|doc| SearchHit {
            thumbnail_url: thumbnails.get(&doc.id).cloned(),
            id: doc.id,
            category_id: doc.category_id,
            listing_type: doc.listing_type,
            title: doc.title,
            price_kobo: doc.price_kobo,
            currency: doc.currency,
            location: doc.location,
            is_boosted: doc.is_boosted,
        })
        .collect::<Vec<_>>();

    let has_more = offset + items.len() < outcome.estimated_total_hits;
    let next_cursor = has_more.then(|| pagination::encode_offset(offset + limit));

    Ok(Json(SearchResponse { items, next_cursor }))
}

async fn fetch_thumbnails(
    state: &AppState,
    listing_ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, AppError> {
    if listing_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query!(
        r#"SELECT DISTINCT ON (listing_id) listing_id, url
           FROM listing_photos
           WHERE listing_id = ANY($1)
           ORDER BY listing_id, position ASC, created_at ASC"#,
        listing_ids,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(rows.into_iter().map(|r| (r.listing_id, r.url)).collect())
}
