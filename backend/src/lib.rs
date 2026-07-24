pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod routes;

use std::sync::Arc;

use auth::sms::SmsSender;
use axum::http::{header, HeaderValue, Method};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: ConnectionManager,
    pub sms: Arc<dyn SmsSender>,
    pub jwt_access_secret: String,
    pub cookie_secure: bool,
}

pub fn app(state: AppState, cors_allowed_origin: &str) -> axum::Router {
    let cors = CorsLayer::new()
        .allow_origin(
            cors_allowed_origin
                .parse::<HeaderValue>()
                .expect("CORS_ALLOWED_ORIGIN must be a valid header value"),
        )
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    routes::router()
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
}
