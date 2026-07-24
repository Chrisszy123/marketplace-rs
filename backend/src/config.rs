use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub meilisearch_url: String,
    pub meilisearch_api_key: String,
    pub server_addr: String,
    pub jwt_access_secret: String,
    pub cors_allowed_origin: String,
    pub cookie_secure: bool,
    pub s3_endpoint_url: String,
    pub s3_access_key_id: String,
    pub s3_secret_access_key: String,
    pub s3_bucket: String,
    pub s3_region: String,
    pub s3_public_url_base: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: require_env("DATABASE_URL")?,
            redis_url: require_env("REDIS_URL")?,
            meilisearch_url: require_env("MEILISEARCH_URL")?,
            meilisearch_api_key: require_env("MEILISEARCH_API_KEY")?,
            server_addr: env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string()),
            jwt_access_secret: require_env("JWT_ACCESS_SECRET")?,
            cors_allowed_origin: env::var("CORS_ALLOWED_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            cookie_secure: env::var("COOKIE_SECURE")
                .map(|v| v == "true")
                .unwrap_or(false),
            s3_endpoint_url: require_env("S3_ENDPOINT_URL")?,
            s3_access_key_id: require_env("S3_ACCESS_KEY_ID")?,
            s3_secret_access_key: require_env("S3_SECRET_ACCESS_KEY")?,
            s3_bucket: require_env("S3_BUCKET")?,
            s3_region: env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string()),
            s3_public_url_base: require_env("S3_PUBLIC_URL_BASE")?,
        })
    }
}

fn require_env(key: &str) -> anyhow::Result<String> {
    env::var(key).map_err(|_| anyhow::anyhow!("missing required environment variable: {key}"))
}
