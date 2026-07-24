use std::net::SocketAddr;

use axum::{extract::ConnectInfo, extract::State, http::StatusCode, Json};
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{cookies, jwt, otp, password, rate_limit, refresh_token},
    error::AppError,
    AppState,
};

#[derive(Deserialize)]
pub struct SignupRequest {
    email: String,
    password: String,
    phone_number: String,
    display_name: String,
}

#[derive(Serialize)]
pub struct SignupResponse {
    user_id: Uuid,
    message: &'static str,
}

pub async fn signup(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(req): Json<SignupRequest>,
) -> Result<(StatusCode, Json<SignupResponse>), AppError> {
    let mut redis = state.redis.clone();
    rate_limit::enforce(&mut redis, "signup", &addr.ip().to_string(), 5, 3600).await?;

    validate_email(&req.email)?;
    validate_password(&req.password)?;
    validate_phone(&req.phone_number)?;
    if req.display_name.trim().is_empty() {
        return Err(AppError::BadRequest("display_name is required".into()));
    }

    let existing = sqlx::query_scalar!(
        r#"SELECT id FROM users WHERE email = $1 OR phone_number = $2"#,
        req.email,
        req.phone_number,
    )
    .fetch_optional(&state.db)
    .await?;

    if existing.is_some() {
        return Err(AppError::Conflict(
            "an account with that email or phone number already exists".into(),
        ));
    }

    let password_hash = password::hash_password(&req.password)?;

    let user_id = sqlx::query_scalar!(
        r#"INSERT INTO users (email, password_hash, phone_number, display_name)
           VALUES ($1, $2, $3, $4) RETURNING id"#,
        req.email,
        password_hash,
        req.phone_number,
        req.display_name.trim(),
    )
    .fetch_one(&state.db)
    .await?;

    let code = otp::issue(&state.db, user_id).await?;
    state
        .sms
        .send_otp(&req.phone_number, &code)
        .await
        .map_err(AppError::Internal)?;

    Ok((
        StatusCode::CREATED,
        Json(SignupResponse {
            user_id,
            message: "verification code sent",
        }),
    ))
}

#[derive(Deserialize)]
pub struct VerifyOtpRequest {
    user_id: Uuid,
    code: String,
}

#[derive(Serialize)]
pub struct MessageResponse {
    message: &'static str,
}

pub async fn verify_otp(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(req): Json<VerifyOtpRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    let mut redis = state.redis.clone();
    rate_limit::enforce(&mut redis, "verify-otp", &addr.ip().to_string(), 20, 3600).await?;

    otp::verify(&state.db, req.user_id, &req.code).await?;

    sqlx::query!(
        r#"UPDATE users SET phone_verified_at = now(), updated_at = now() WHERE id = $1"#,
        req.user_id,
    )
    .execute(&state.db)
    .await?;

    Ok(Json(MessageResponse {
        message: "phone verified",
    }))
}

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    access_token: String,
    user_id: Uuid,
}

pub async fn login(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    jar: CookieJar,
    Json(req): Json<LoginRequest>,
) -> Result<(CookieJar, Json<LoginResponse>), AppError> {
    let mut redis = state.redis.clone();
    let rate_key = format!("{}:{}", addr.ip(), req.email);
    rate_limit::enforce(&mut redis, "login", &rate_key, 10, 900).await?;

    let user = sqlx::query!(
        r#"SELECT id, password_hash, phone_verified_at FROM users WHERE email = $1"#,
        req.email,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if !password::verify_password(&req.password, &user.password_hash)? {
        return Err(AppError::Unauthorized);
    }

    if user.phone_verified_at.is_none() {
        return Err(AppError::Forbidden(
            "phone number not verified, complete OTP verification first".into(),
        ));
    }

    let access_token = jwt::issue_access_token(user.id, &state.jwt_access_secret)?;
    let refresh_token = refresh_token::issue(&state.db, user.id).await?;
    let jar = jar.add(cookies::build_refresh_cookie(
        refresh_token,
        state.cookie_secure,
    ));

    Ok((
        jar,
        Json(LoginResponse {
            access_token,
            user_id: user.id,
        }),
    ))
}

#[derive(Serialize)]
pub struct RefreshResponse {
    access_token: String,
}

pub async fn refresh(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, Json<RefreshResponse>), AppError> {
    let presented = jar
        .get(cookies::REFRESH_COOKIE_NAME)
        .map(|c| c.value().to_string())
        .ok_or(AppError::Unauthorized)?;

    let (new_token, user_id) = refresh_token::rotate(&state.db, &presented).await?;
    let access_token = jwt::issue_access_token(user_id, &state.jwt_access_secret)?;
    let jar = jar.add(cookies::build_refresh_cookie(new_token, state.cookie_secure));

    Ok((jar, Json(RefreshResponse { access_token })))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, StatusCode), AppError> {
    if let Some(presented) = jar.get(cookies::REFRESH_COOKIE_NAME) {
        refresh_token::revoke(&state.db, presented.value()).await?;
    }

    let jar = jar.add(cookies::removal_cookie(state.cookie_secure));
    Ok((jar, StatusCode::NO_CONTENT))
}

fn validate_email(email: &str) -> Result<(), AppError> {
    if email.contains('@') && email.contains('.') && email.len() <= 254 {
        Ok(())
    } else {
        Err(AppError::BadRequest("invalid email address".into()))
    }
}

fn validate_password(password: &str) -> Result<(), AppError> {
    if password.len() >= 8 {
        Ok(())
    } else {
        Err(AppError::BadRequest(
            "password must be at least 8 characters".into(),
        ))
    }
}

fn validate_phone(phone: &str) -> Result<(), AppError> {
    let digits_only = phone.strip_prefix('+').unwrap_or(phone);
    let valid = !digits_only.is_empty()
        && digits_only.len() <= 15
        && digits_only.chars().all(|c| c.is_ascii_digit());

    if phone.starts_with('+') && valid {
        Ok(())
    } else {
        Err(AppError::BadRequest(
            "phone_number must be in E.164 format, e.g. +2348012345678".into(),
        ))
    }
}
