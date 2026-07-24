use meilisearch_sdk::{client::Client, settings::Settings};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::Config;

pub const INDEX_NAME: &str = "listings";

pub fn build_client(cfg: &Config) -> anyhow::Result<Client> {
    Ok(Client::new(
        &cfg.meilisearch_url,
        Some(&cfg.meilisearch_api_key),
    )?)
}

/// A listing is present in the index iff it's searchable (status active/expiring); the sweep
/// job removes it the moment it expires. No `status` field is stored — index membership *is*
/// the "is this browsable" signal, which keeps the search-facing schema simpler.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListingDocument {
    pub id: Uuid,
    pub seller_id: Uuid,
    pub category_id: Uuid,
    pub top_category_id: Uuid,
    pub listing_type: String,
    pub title: String,
    pub description: String,
    pub price_kobo: i64,
    pub currency: String,
    pub location: String,
    pub condition: Option<String>,
    pub service_area: Option<String>,
    pub is_boosted: bool,
    pub published_at: i64,
}

pub async fn ensure_index(client: &Client) -> anyhow::Result<()> {
    let index = client.index(INDEX_NAME);

    let settings = Settings::new()
        .with_searchable_attributes(["title", "description", "location"])
        .with_filterable_attributes([
            "category_id",
            "top_category_id",
            "price_kobo",
            "listing_type",
            "is_boosted",
        ])
        .with_sortable_attributes(["price_kobo", "published_at", "is_boosted"]);

    index
        .set_settings(&settings)
        .await?
        .wait_for_completion(client, None, None)
        .await?;

    Ok(())
}

pub async fn index_listing(client: &Client, doc: &ListingDocument) -> anyhow::Result<()> {
    let index = client.index(INDEX_NAME);
    index
        .add_or_replace(&[doc.clone()], Some("id"))
        .await?
        .wait_for_completion(client, None, None)
        .await?;
    Ok(())
}

pub async fn delete_listing(client: &Client, id: Uuid) -> anyhow::Result<()> {
    let index = client.index(INDEX_NAME);
    index
        .delete_document(id.to_string())
        .await?
        .wait_for_completion(client, None, None)
        .await?;
    Ok(())
}

pub struct SearchParams {
    pub query: Option<String>,
    pub filter: Option<String>,
    pub sort: Vec<String>,
    pub offset: usize,
    pub limit: usize,
}

pub struct SearchOutcome {
    pub hits: Vec<ListingDocument>,
    pub estimated_total_hits: usize,
}

pub async fn search(client: &Client, params: SearchParams) -> anyhow::Result<SearchOutcome> {
    let index = client.index(INDEX_NAME);
    let mut query = index.search();

    if let Some(q) = params.query.as_deref() {
        query.with_query(q);
    }
    if let Some(filter) = params.filter.as_deref() {
        query.with_filter(filter);
    }
    let sort_refs: Vec<&str> = params.sort.iter().map(String::as_str).collect();
    if !sort_refs.is_empty() {
        query.with_sort(&sort_refs);
    }
    query.with_offset(params.offset).with_limit(params.limit);

    let results = query.execute::<ListingDocument>().await?;

    Ok(SearchOutcome {
        hits: results.hits.into_iter().map(|h| h.result).collect(),
        estimated_total_hits: results.estimated_total_hits.unwrap_or(0),
    })
}
