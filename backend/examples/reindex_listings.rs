//! One-off maintenance script: re-syncs every active/expiring listing from Postgres into
//! Meilisearch. Needed after anything wipes the search index out from under a Postgres dataset
//! that's still intact (e.g. running the integration test suite against the shared dev
//! Meilisearch instance, which clears it as part of test setup).
//!
//! Run with: cargo run --example reindex_listings

use marketplace_backend::{config::Config, db, search};
use sqlx::PgPool;
use uuid::Uuid;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    let db = db::connect(&config.database_url).await?;
    let meilisearch = search::build_client(&config)?;
    search::ensure_index(&meilisearch).await?;

    let rows = sqlx::query!(
        r#"SELECT id, seller_id, category_id, listing_type, title, description, price_kobo,
                  currency, location, condition, service_area, is_boosted, published_at
           FROM listings WHERE status IN ('active', 'expiring')"#
    )
    .fetch_all(&db)
    .await?;

    println!("Re-indexing {} listings...", rows.len());

    for row in rows {
        let top_category_id = resolve_top_category_id(&db, row.category_id).await?;
        let doc = search::ListingDocument {
            id: row.id,
            seller_id: row.seller_id,
            category_id: row.category_id,
            top_category_id,
            listing_type: row.listing_type,
            title: row.title,
            description: row.description,
            price_kobo: row.price_kobo,
            currency: row.currency,
            location: row.location,
            condition: row.condition,
            service_area: row.service_area,
            is_boosted: row.is_boosted,
            published_at: row.published_at.timestamp(),
        };
        search::index_listing(&meilisearch, &doc).await?;
    }

    println!("Done.");
    Ok(())
}

async fn resolve_top_category_id(db: &PgPool, category_id: Uuid) -> anyhow::Result<Uuid> {
    let top_id = sqlx::query_scalar!(
        r#"SELECT COALESCE(parent_id, id) AS "top_id!" FROM categories WHERE id = $1"#,
        category_id,
    )
    .fetch_one(db)
    .await?;
    Ok(top_id)
}
