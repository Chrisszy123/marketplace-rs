#![allow(dead_code)] // shared test helpers: not every integration test binary uses all of them

use std::{net::SocketAddr, sync::Arc};

use async_trait::async_trait;
use marketplace_backend::{
    app, auth::sms::LoggingSmsSender, auth::sms::SmsSender, config::Config, db, storage, AppState,
};
use tokio::sync::Mutex;

pub const CORS_ORIGIN: &str = "http://localhost:5173";

fn test_s3_config() -> Config {
    Config {
        database_url: String::new(),
        redis_url: String::new(),
        meilisearch_url: String::new(),
        meilisearch_api_key: String::new(),
        server_addr: String::new(),
        jwt_access_secret: String::new(),
        cors_allowed_origin: String::new(),
        cookie_secure: false,
        s3_endpoint_url: std::env::var("S3_ENDPOINT_URL")
            .unwrap_or_else(|_| "http://localhost:9000".to_string()),
        s3_access_key_id: std::env::var("S3_ACCESS_KEY_ID")
            .unwrap_or_else(|_| "marketplace".to_string()),
        s3_secret_access_key: std::env::var("S3_SECRET_ACCESS_KEY")
            .unwrap_or_else(|_| "marketplace123".to_string()),
        s3_bucket: "marketplace-listings-test".to_string(),
        s3_region: "us-east-1".to_string(),
        s3_public_url_base: std::env::var("S3_PUBLIC_URL_BASE")
            .unwrap_or_else(|_| "http://localhost:9000/marketplace-listings-test".to_string()),
    }
}

pub async fn spawn_app() -> String {
    spawn_app_with_sms(Arc::new(LoggingSmsSender)).await
}

/// Boots the app on an ephemeral port with a real Postgres + Redis connection (same services
/// docker-compose provides) and returns its base URL. Flushes Redis so per-test rate-limit
/// counters start clean regardless of what earlier test runs did.
pub async fn spawn_app_with_sms(sms: Arc<dyn SmsSender>) -> String {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set to run integration tests");
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

    let db = db::connect(&database_url)
        .await
        .expect("failed to connect to test database");
    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .expect("failed to run migrations");

    let redis_client = redis::Client::open(redis_url).expect("invalid REDIS_URL");
    let mut redis = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("failed to connect to test redis");
    let _: () = redis::cmd("FLUSHDB")
        .query_async(&mut redis)
        .await
        .expect("failed to flush test redis");

    let s3_config = test_s3_config();
    let s3_client = storage::build_client(&s3_config);
    storage::ensure_bucket(&s3_client, &s3_config.s3_bucket)
        .await
        .expect("failed to ensure test bucket exists");

    let state = AppState {
        db,
        redis,
        sms,
        jwt_access_secret: "test-secret-do-not-use-in-prod".to_string(),
        cookie_secure: false,
        s3_client,
        s3_bucket: s3_config.s3_bucket.clone(),
        s3_public_url_base: s3_config.s3_public_url_base.clone(),
    };

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind ephemeral port");
    let addr = listener.local_addr().expect("failed to read local addr");

    tokio::spawn(async move {
        axum::serve(
            listener,
            app(state, CORS_ORIGIN).into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        .expect("test server crashed");
    });

    format!("http://{addr}")
}

pub fn unique_email() -> String {
    format!("test-{}@example.com", uuid::Uuid::new_v4())
}

pub fn unique_phone() -> String {
    let digits: String = uuid::Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .filter(|c| c.is_ascii_digit())
        .take(9)
        .collect();
    format!("+234{digits:0<9}")
}

/// Signs up, verifies via the captured OTP, and logs in a fresh unique user. Returns the access
/// token so listing tests don't need to re-derive the whole auth flow themselves.
pub async fn signup_verify_login(base_url: &str, client: &reqwest::Client, sms: &CapturingSmsSender) -> String {
    let email = unique_email();
    let phone = unique_phone();
    let password = "correct horse battery staple";

    let signup: serde_json::Value = client
        .post(format!("{base_url}/auth/signup"))
        .json(&serde_json::json!({
            "email": email,
            "password": password,
            "phone_number": phone,
            "display_name": "Listings Test User",
        }))
        .send()
        .await
        .expect("signup request failed")
        .json()
        .await
        .expect("invalid signup json");
    let user_id = signup["user_id"].as_str().expect("missing user_id").to_string();

    let code = sms
        .last_code
        .lock()
        .await
        .clone()
        .expect("sms sender never captured a code");

    let verify_status = client
        .post(format!("{base_url}/auth/verify-otp"))
        .json(&serde_json::json!({ "user_id": user_id, "code": code }))
        .send()
        .await
        .expect("verify request failed")
        .status();
    assert!(verify_status.is_success(), "otp verification failed: {verify_status}");

    let login: serde_json::Value = client
        .post(format!("{base_url}/auth/login"))
        .json(&serde_json::json!({ "email": email, "password": password }))
        .send()
        .await
        .expect("login request failed")
        .json()
        .await
        .expect("invalid login json");

    login["access_token"]
        .as_str()
        .expect("missing access_token")
        .to_string()
}

/// Captures the last OTP "sent" so tests can complete verification without a real SMS provider.
#[derive(Default)]
pub struct CapturingSmsSender {
    pub last_code: Mutex<Option<String>>,
}

#[async_trait]
impl SmsSender for CapturingSmsSender {
    async fn send_otp(&self, _phone_number: &str, code: &str) -> anyhow::Result<()> {
        *self.last_code.lock().await = Some(code.to_string());
        Ok(())
    }
}
