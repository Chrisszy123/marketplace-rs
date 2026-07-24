use axum_extra::extract::cookie::{Cookie, SameSite};
use time::Duration;

use super::refresh_token::REFRESH_TOKEN_TTL_DAYS;

pub const REFRESH_COOKIE_NAME: &str = "refresh_token";

pub fn build_refresh_cookie(token: String, secure: bool) -> Cookie<'static> {
    Cookie::build((REFRESH_COOKIE_NAME, token))
        .path("/auth")
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .max_age(Duration::days(REFRESH_TOKEN_TTL_DAYS))
        .build()
}

pub fn removal_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((REFRESH_COOKIE_NAME, ""))
        .path("/auth")
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .max_age(Duration::seconds(0))
        .build()
}
