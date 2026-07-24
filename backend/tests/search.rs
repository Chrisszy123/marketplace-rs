mod common;

use std::sync::Arc;

use common::CapturingSmsSender;
use marketplace_backend::{db, search};
use serde_json::{json, Value};

struct TestCategories {
    top_id: String,
    sub_a_id: String,
    sub_b_id: String,
}

/// Picks two subcategories under the same top-level category, so category-filter tests can
/// prove both "filter by exact subcategory" and "filter by parent includes its children".
async fn two_sibling_subcategories(db: &sqlx::PgPool) -> TestCategories {
    let row = sqlx::query!(
        r#"SELECT parent_id AS "parent_id!", id FROM categories
           WHERE parent_id IN (
             SELECT parent_id FROM categories WHERE parent_id IS NOT NULL
             GROUP BY parent_id HAVING count(*) >= 2 LIMIT 1
           )
           ORDER BY id LIMIT 2"#,
    )
    .fetch_all(db)
    .await
    .expect("seed categories should have a parent with 2+ children");

    assert_eq!(row.len(), 2, "expected two sibling subcategories");
    TestCategories {
        top_id: row[0].parent_id.to_string(),
        sub_a_id: row[0].id.to_string(),
        sub_b_id: row[1].id.to_string(),
    }
}

async fn create_listing(
    base_url: &str,
    client: &reqwest::Client,
    access_token: &str,
    category_id: &str,
    title: &str,
    price_kobo: i64,
) -> String {
    let res = client
        .post(format!("{base_url}/listings"))
        .bearer_auth(access_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": title,
            "description": "Search test listing.",
            "price_kobo": price_kobo,
            "location": "Lagos",
            "condition": "new",
        }))
        .send()
        .await
        .expect("create listing request failed");
    assert_eq!(res.status(), 201, "listing creation should succeed");
    let listing: Value = res.json().await.unwrap();
    listing["id"].as_str().unwrap().to_string()
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn search_filters_by_keyword_category_and_price_then_removes_on_delete() {
    let sms = Arc::new(CapturingSmsSender::default());
    let (base_url, _meilisearch) = common::spawn_app_with_search(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(true).build().unwrap();
    let access_token = common::signup_verify_login(&base_url, &client, &sms).await;

    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = db::connect(&db_url).await.unwrap();
    let cats = two_sibling_subcategories(&db).await;

    let camry_id = create_listing(
        &base_url, &client, &access_token, &cats.sub_a_id,
        "Toyota Camry 2018, low mileage", 5_000_000,
    )
    .await;
    let corolla_id = create_listing(
        &base_url, &client, &access_token, &cats.sub_b_id,
        "Toyota Corolla 2020", 8_000_000,
    )
    .await;
    let sofa_id = create_listing(
        &base_url, &client, &access_token, &cats.sub_a_id,
        "Leather sofa set", 1_500_000,
    )
    .await;

    // keyword search
    let by_keyword: Value = client
        .get(format!("{base_url}/search?q=Corolla"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let ids: Vec<&str> = by_keyword["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["id"].as_str().unwrap())
        .collect();
    assert_eq!(ids, vec![corolla_id.as_str()]);

    // filter by exact subcategory
    let by_subcategory: Value = client
        .get(format!("{base_url}/search?category_id={}", cats.sub_a_id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let mut sub_ids: Vec<&str> = by_subcategory["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["id"].as_str().unwrap())
        .collect();
    sub_ids.sort();
    let mut expected = vec![camry_id.as_str(), sofa_id.as_str()];
    expected.sort();
    assert_eq!(sub_ids, expected);

    // filter by top-level category includes both subcategories' listings
    let by_top: Value = client
        .get(format!("{base_url}/search?category_id={}", cats.top_id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(by_top["items"].as_array().unwrap().len(), 3);

    // price range filter
    let by_price: Value = client
        .get(format!("{base_url}/search?min_price_kobo=4000000&max_price_kobo=6000000"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let price_ids: Vec<&str> = by_price["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["id"].as_str().unwrap())
        .collect();
    assert_eq!(price_ids, vec![camry_id.as_str()]);

    // deleting a listing removes it from search
    let delete_res = client
        .delete(format!("{base_url}/listings/{camry_id}"))
        .bearer_auth(&access_token)
        .send()
        .await
        .unwrap();
    assert_eq!(delete_res.status(), 204);

    let after_delete: Value = client
        .get(format!("{base_url}/search?q=Camry"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(after_delete["items"].as_array().unwrap().is_empty());
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn boosted_listings_rank_first_and_search_is_cursor_paginated() {
    let sms = Arc::new(CapturingSmsSender::default());
    let (base_url, meilisearch) = common::spawn_app_with_search(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(true).build().unwrap();
    let access_token = common::signup_verify_login(&base_url, &client, &sms).await;

    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = db::connect(&db_url).await.unwrap();
    let cats = two_sibling_subcategories(&db).await;

    // cheap, not boosted
    let cheap_id = create_listing(&base_url, &client, &access_token, &cats.sub_a_id, "Cheap item", 1_000).await;
    // expensive, will be boosted
    let boosted_id =
        create_listing(&base_url, &client, &access_token, &cats.sub_a_id, "Boosted item", 2_000).await;

    // Simulate what the Phase 6 subscription webhook will do: flip is_boosted and reindex.
    // (There's no public API to set is_boosted yet — that trigger doesn't exist until Phase 6.)
    sqlx::query!(
        r#"UPDATE listings SET is_boosted = true WHERE id = $1"#,
        uuid::Uuid::parse_str(&boosted_id).unwrap(),
    )
    .execute(&db)
    .await
    .unwrap();
    let boosted_doc = search::ListingDocument {
        id: uuid::Uuid::parse_str(&boosted_id).unwrap(),
        seller_id: uuid::Uuid::nil(),
        category_id: uuid::Uuid::parse_str(&cats.sub_a_id).unwrap(),
        top_category_id: uuid::Uuid::parse_str(&cats.top_id).unwrap(),
        listing_type: "good".to_string(),
        title: "Boosted item".to_string(),
        description: "Search test listing.".to_string(),
        price_kobo: 2_000,
        currency: "NGN".to_string(),
        location: "Lagos".to_string(),
        condition: Some("new".to_string()),
        service_area: None,
        is_boosted: true,
        published_at: chrono::Utc::now().timestamp(),
    };
    search::index_listing(&meilisearch, &boosted_doc).await.unwrap();

    // sort=price_asc would normally put the cheap item first; boosted overrides that.
    let sorted_by_price: Value = client
        .get(format!(
            "{base_url}/search?category_id={}&sort=price_asc",
            cats.sub_a_id
        ))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let ordered_ids: Vec<&str> = sorted_by_price["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["id"].as_str().unwrap())
        .collect();
    assert_eq!(ordered_ids, vec![boosted_id.as_str(), cheap_id.as_str()]);
    assert_eq!(sorted_by_price["items"][0]["is_boosted"], true);

    // --- cursor pagination: page size 1 across the 2 results ---
    let page1: Value = client
        .get(format!("{base_url}/search?category_id={}&limit=1", cats.sub_a_id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(page1["items"].as_array().unwrap().len(), 1);
    let cursor = page1["next_cursor"].as_str().expect("expected a next_cursor").to_string();

    let page2: Value = client
        .get(format!(
            "{base_url}/search?category_id={}&limit=1&cursor={cursor}",
            cats.sub_a_id
        ))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(page2["items"].as_array().unwrap().len(), 1);
    assert!(page2["next_cursor"].is_null());
    assert_ne!(page1["items"][0]["id"], page2["items"][0]["id"]);
}
