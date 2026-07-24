mod auth;
mod categories;
mod health;
mod listings;
mod messages;
mod search;
mod users;

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};

use crate::{ws, AppState};

const PHOTO_UPLOAD_BODY_LIMIT_BYTES: usize = 6 * 1024 * 1024;

pub fn router() -> Router<AppState> {
    let listing_photo_routes = Router::new()
        .route("/listings/{id}/photos", post(listings::upload_photo))
        .route(
            "/listings/{id}/photos/{photo_id}",
            axum::routing::delete(listings::delete_photo),
        )
        .route_layer(DefaultBodyLimit::max(PHOTO_UPLOAD_BODY_LIMIT_BYTES));

    Router::new()
        .route("/health", get(health::health))
        .route("/auth/signup", post(auth::signup))
        .route("/auth/verify-otp", post(auth::verify_otp))
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/auth/logout", post(auth::logout))
        .route("/users/me", get(users::me))
        .route("/users/{id}", get(users::seller_profile))
        .route("/users/{id}/listings", get(listings::by_seller))
        .route("/categories", get(categories::list))
        .route("/search", get(search::search))
        .route("/listings", post(listings::create))
        .route("/listings/mine", get(listings::mine))
        .route(
            "/listings/{id}",
            get(listings::get).put(listings::update).delete(listings::delete),
        )
        .route("/listings/{id}/renew", post(listings::renew))
        .merge(listing_photo_routes)
        .route("/listings/{id}/messages", post(messages::send).get(messages::thread_messages))
        .route("/threads", get(messages::threads))
        .route("/ws", get(ws::upgrade))
}
