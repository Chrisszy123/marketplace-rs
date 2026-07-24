use axum::{extract::State, Json};
use serde::Serialize;
use uuid::Uuid;

use crate::{error::AppError, AppState};

#[derive(Serialize)]
pub struct Category {
    id: Uuid,
    parent_id: Option<Uuid>,
    name: String,
    slug: String,
}

/// Flat list; the frontend groups by parent_id into a two-level tree for the category picker.
pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<Category>>, AppError> {
    let categories = sqlx::query_as!(
        Category,
        r#"SELECT id, parent_id, name, slug FROM categories ORDER BY parent_id NULLS FIRST, name"#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(categories))
}
