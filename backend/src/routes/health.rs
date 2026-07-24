use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;

use crate::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    status: &'static str,
    database: &'static str,
}

pub async fn health(State(state): State<AppState>) -> (StatusCode, Json<HealthResponse>) {
    match sqlx::query_scalar!("SELECT 1 as \"one!\"").fetch_one(&state.db).await {
        Ok(_) => (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ok",
                database: "ok",
            }),
        ),
        Err(err) => {
            tracing::error!(?err, "health check database ping failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    status: "degraded",
                    database: "unreachable",
                }),
            )
        }
    }
}
