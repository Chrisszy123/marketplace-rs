use redis::{aio::ConnectionManager, AsyncCommands};

use crate::error::AppError;

/// Fixed-window rate limit: `limit` requests per `window_secs`, keyed by `bucket:identifier`
/// (e.g. `login:203.0.113.4`). Cheap and good enough for auth endpoints; a sliding window isn't
/// worth the complexity here.
pub async fn enforce(
    redis: &mut ConnectionManager,
    bucket: &str,
    identifier: &str,
    limit: u32,
    window_secs: u64,
) -> Result<(), AppError> {
    let key = format!("ratelimit:{bucket}:{identifier}");
    let count: i64 = redis
        .incr(&key, 1)
        .await
        .map_err(|err| AppError::Internal(anyhow::anyhow!("redis rate limit incr failed: {err}")))?;

    if count == 1 {
        let _: () = redis
            .expire(&key, window_secs as i64)
            .await
            .map_err(|err| AppError::Internal(anyhow::anyhow!("redis rate limit expire failed: {err}")))?;
    }

    if count > limit as i64 {
        return Err(AppError::RateLimited);
    }

    Ok(())
}
