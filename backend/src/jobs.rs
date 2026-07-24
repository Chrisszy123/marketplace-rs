use meilisearch_sdk::client::Client as MeiliClient;
use sqlx::PgPool;
use tokio::time::{interval, Duration};
use uuid::Uuid;

use crate::search;

const SWEEP_INTERVAL: Duration = Duration::from_secs(60);
const EXPIRING_WARNING_WINDOW_DAYS: f64 = 3.0;

/// Runs forever in the background: flips listings within the warning window to `expiring`, and
/// past their `expires_at` to `expired` (hidden from browse/search, still editable/renewable —
/// see the `listings` table comment in the Phase 1 migration). Expired listings are also removed
/// from the Meilisearch index; `expiring` listings stay indexed and searchable.
pub fn spawn_expiry_sweep(db: PgPool, meilisearch: MeiliClient) {
    tokio::spawn(async move {
        let mut ticker = interval(SWEEP_INTERVAL);
        loop {
            ticker.tick().await;
            if let Err(err) = sweep_once(&db, &meilisearch).await {
                tracing::error!(?err, "listing expiry sweep failed");
            }
        }
    });
}

pub async fn sweep_once(db: &PgPool, meilisearch: &MeiliClient) -> anyhow::Result<()> {
    let expiring = sqlx::query!(
        r#"UPDATE listings SET status = 'expiring', updated_at = now()
           WHERE status = 'active'
             AND expires_at <= now() + ($1 * interval '1 day')
             AND expires_at > now()"#,
        EXPIRING_WARNING_WINDOW_DAYS,
    )
    .execute(db)
    .await?;

    let expired_ids: Vec<Uuid> = sqlx::query_scalar!(
        r#"UPDATE listings SET status = 'expired', updated_at = now()
           WHERE status IN ('active', 'expiring') AND expires_at <= now()
           RETURNING id"#,
    )
    .fetch_all(db)
    .await?;

    for id in &expired_ids {
        if let Err(err) = search::delete_listing(meilisearch, *id).await {
            tracing::warn!(?err, %id, "failed to remove expired listing from search index");
        }
    }

    if expiring.rows_affected() > 0 || !expired_ids.is_empty() {
        tracing::info!(
            flipped_to_expiring = expiring.rows_affected(),
            flipped_to_expired = expired_ids.len(),
            "listing expiry sweep"
        );
    }

    Ok(())
}
