use std::{net::SocketAddr, sync::Arc};

use marketplace_backend::{app, auth::sms::LoggingSmsSender, config::Config, db, AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "marketplace_backend=debug,tower_http=debug".into()),
        )
        .init();

    let config = Config::from_env()?;
    let db = db::connect(&config.database_url).await?;

    sqlx::migrate!("./migrations").run(&db).await?;

    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis = redis::aio::ConnectionManager::new(redis_client).await?;

    let state = AppState {
        db,
        redis,
        sms: Arc::new(LoggingSmsSender),
        jwt_access_secret: config.jwt_access_secret.clone(),
        cookie_secure: config.cookie_secure,
    };

    let listener = tokio::net::TcpListener::bind(&config.server_addr).await?;
    tracing::info!(addr = %config.server_addr, "starting server");
    axum::serve(
        listener,
        app(state, &config.cors_allowed_origin).into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
