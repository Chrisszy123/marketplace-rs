use sqlx::PgPool;
use tokio::time::{interval, Duration};

const SWEEP_INTERVAL: Duration = Duration::from_secs(60);
const EXPIRING_WARNING_WINDOW_DAYS: f64 = 3.0;

/// Runs forever in the background: flips listings within the warning window to `expiring`, and
/// past their `expires_at` to `expired` (hidden from browse/search, still editable/renewable —
/// see the `listings` table comment in the Phase 1 migration).
pub fn spawn_expiry_sweep(db: PgPool) {
    tokio::spawn(async move {
        let mut ticker = interval(SWEEP_INTERVAL);
        loop {
            ticker.tick().await;
            if let Err(err) = sweep_once(&db).await {
                tracing::error!(?err, "listing expiry sweep failed");
            }
        }
    });
}

pub async fn sweep_once(db: &PgPool) -> Result<(), sqlx::Error> {
    let expiring = sqlx::query!(
        r#"UPDATE listings SET status = 'expiring', updated_at = now()
           WHERE status = 'active'
             AND expires_at <= now() + ($1 * interval '1 day')
             AND expires_at > now()"#,
        EXPIRING_WARNING_WINDOW_DAYS,
    )
    .execute(db)
    .await?;

    let expired = sqlx::query!(
        r#"UPDATE listings SET status = 'expired', updated_at = now()
           WHERE status IN ('active', 'expiring') AND expires_at <= now()"#,
    )
    .execute(db)
    .await?;

    if expiring.rows_affected() > 0 || expired.rows_affected() > 0 {
        tracing::info!(
            flipped_to_expiring = expiring.rows_affected(),
            flipped_to_expired = expired.rows_affected(),
            "listing expiry sweep"
        );
    }

    Ok(())
}
