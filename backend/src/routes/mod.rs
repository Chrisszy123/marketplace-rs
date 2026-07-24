mod auth;
mod health;
mod users;

use axum::{
    routing::{get, post},
    Router,
};

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .route("/auth/signup", post(auth::signup))
        .route("/auth/verify-otp", post(auth::verify_otp))
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/auth/logout", post(auth::logout))
        .route("/users/me", get(users::me))
}
