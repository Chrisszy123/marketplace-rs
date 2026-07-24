use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

pub const ACCESS_TOKEN_TTL_MINUTES: i64 = 15;

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: Uuid,
    pub exp: i64,
    pub iat: i64,
}

pub fn issue_access_token(user_id: Uuid, secret: &str) -> Result<String, AppError> {
    let now = Utc::now();
    let claims = AccessTokenClaims {
        sub: user_id,
        iat: now.timestamp(),
        exp: (now + Duration::minutes(ACCESS_TOKEN_TTL_MINUTES)).timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|err| AppError::Internal(anyhow::anyhow!("failed to sign access token: {err}")))
}

pub fn verify_access_token(token: &str, secret: &str) -> Result<AccessTokenClaims, AppError> {
    decode::<AccessTokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}
