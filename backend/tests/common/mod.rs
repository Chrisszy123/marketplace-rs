#![allow(dead_code)] // shared test helpers: not every integration test binary uses all of them

use std::{net::SocketAddr, sync::Arc};

use async_trait::async_trait;
use marketplace_backend::{app, auth::sms::LoggingSmsSender, auth::sms::SmsSender, db, AppState};
use tokio::sync::Mutex;

pub const CORS_ORIGIN: &str = "http://localhost:5173";

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

    let state = AppState {
        db,
        redis,
        sms,
        jwt_access_secret: "test-secret-do-not-use-in-prod".to_string(),
        cookie_secure: false,
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
