mod common;

use std::sync::Arc;

use common::CapturingSmsSender;
use marketplace_backend::{db, jobs};
use serde_json::{json, Value};

async fn first_category_id(db: &sqlx::PgPool) -> String {
    sqlx::query_scalar!(r#"SELECT id FROM categories WHERE parent_id IS NOT NULL LIMIT 1"#)
        .fetch_one(db)
        .await
        .expect("seed categories should exist")
        .to_string()
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn create_view_edit_renew_delete_flow() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(true).build().unwrap();
    let access_token = common::signup_verify_login(&base_url, &client, &sms).await;

    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = db::connect(&db_url).await.unwrap();
    let category_id = first_category_id(&db).await;

    // --- create ---
    let create_res = client
        .post(format!("{base_url}/listings"))
        .bearer_auth(&access_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "iPhone 13 Pro, 256GB",
            "description": "Barely used, comes with box and charger.",
            "price_kobo": 45_000_000,
            "location": "Lekki, Lagos",
            "condition": "used",
        }))
        .send()
        .await
        .expect("create request failed");
    assert_eq!(create_res.status(), 201);
    let listing: Value = create_res.json().await.unwrap();
    let listing_id = listing["id"].as_str().unwrap().to_string();
    assert_eq!(listing["status"], "active");
    assert_eq!(listing["seller_id"].as_str().is_some(), true);
    assert!(listing["photos"].as_array().unwrap().is_empty());

    // rejects mismatched goods/service fields
    let bad_res = client
        .post(format!("{base_url}/listings"))
        .bearer_auth(&access_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "Bad listing",
            "description": "Missing condition, has service_area instead.",
            "price_kobo": 1000,
            "location": "Lagos",
            "service_area": "Lagos-wide",
        }))
        .send()
        .await
        .expect("bad create request failed");
    assert_eq!(bad_res.status(), 400);

    // --- public view ---
    let get_res = client.get(format!("{base_url}/listings/{listing_id}")).send().await.unwrap();
    assert_eq!(get_res.status(), 200);
    let fetched: Value = get_res.json().await.unwrap();
    assert_eq!(fetched["title"], "iPhone 13 Pro, 256GB");

    // --- edit ---
    let update_res = client
        .put(format!("{base_url}/listings/{listing_id}"))
        .bearer_auth(&access_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "iPhone 13 Pro, 256GB (price reduced)",
            "description": "Barely used, comes with box and charger.",
            "price_kobo": 40_000_000,
            "location": "Lekki, Lagos",
            "condition": "used",
        }))
        .send()
        .await
        .expect("update request failed");
    assert_eq!(update_res.status(), 200);
    let updated: Value = update_res.json().await.unwrap();
    assert_eq!(updated["title"], "iPhone 13 Pro, 256GB (price reduced)");
    assert_eq!(updated["price_kobo"], 40_000_000);

    // --- another user cannot edit or delete ---
    let other_token = common::signup_verify_login(&base_url, &client, &sms).await;
    let forbidden_edit = client
        .put(format!("{base_url}/listings/{listing_id}"))
        .bearer_auth(&other_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "Hijacked",
            "description": "Should not be allowed.",
            "price_kobo": 1,
            "location": "Nowhere",
            "condition": "used",
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(forbidden_edit.status(), 403);

    let forbidden_delete = client
        .delete(format!("{base_url}/listings/{listing_id}"))
        .bearer_auth(&other_token)
        .send()
        .await
        .unwrap();
    assert_eq!(forbidden_delete.status(), 403);

    // --- expire it directly, then renew ---
    sqlx::query!(
        r#"UPDATE listings SET status = 'expired', expires_at = now() - interval '1 day' WHERE id = $1"#,
        uuid::Uuid::parse_str(&listing_id).unwrap(),
    )
    .execute(&db)
    .await
    .unwrap();

    let renew_res = client
        .post(format!("{base_url}/listings/{listing_id}/renew"))
        .bearer_auth(&access_token)
        .send()
        .await
        .expect("renew request failed");
    assert_eq!(renew_res.status(), 200);
    let renewed: Value = renew_res.json().await.unwrap();
    assert_eq!(renewed["status"], "active");

    // --- delete ---
    let delete_res = client
        .delete(format!("{base_url}/listings/{listing_id}"))
        .bearer_auth(&access_token)
        .send()
        .await
        .expect("delete request failed");
    assert_eq!(delete_res.status(), 204);

    let get_after_delete = client.get(format!("{base_url}/listings/{listing_id}")).send().await.unwrap();
    assert_eq!(get_after_delete.status(), 404);
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn free_tier_listing_limit_is_enforced() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(true).build().unwrap();
    let access_token = common::signup_verify_login(&base_url, &client, &sms).await;

    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = db::connect(&db_url).await.unwrap();
    let category_id = first_category_id(&db).await;

    for i in 0..5 {
        let res = client
            .post(format!("{base_url}/listings"))
            .bearer_auth(&access_token)
            .json(&json!({
                "category_id": category_id,
                "listing_type": "good",
                "title": format!("Listing {i}"),
                "description": "Filling up the free tier.",
                "price_kobo": 1000,
                "location": "Lagos",
                "condition": "new",
            }))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 201, "listing {i} should succeed");
    }

    let sixth = client
        .post(format!("{base_url}/listings"))
        .bearer_auth(&access_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "One too many",
            "description": "Should be rejected by the free tier cap.",
            "price_kobo": 1000,
            "location": "Lagos",
            "condition": "new",
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(sixth.status(), 403);
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn expiry_sweep_flips_status_and_mine_is_cursor_paginated() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(true).build().unwrap();
    let access_token = common::signup_verify_login(&base_url, &client, &sms).await;

    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = db::connect(&db_url).await.unwrap();
    let category_id = first_category_id(&db).await;

    let mut listing_ids = Vec::new();
    for i in 0..3 {
        let res = client
            .post(format!("{base_url}/listings"))
            .bearer_auth(&access_token)
            .json(&json!({
                "category_id": category_id,
                "listing_type": "good",
                "title": format!("Paginated listing {i}"),
                "description": "For pagination + expiry test.",
                "price_kobo": 1000,
                "location": "Lagos",
                "condition": "new",
            }))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 201);
        let listing: Value = res.json().await.unwrap();
        listing_ids.push(listing["id"].as_str().unwrap().to_string());
    }

    // cursor pagination over "mine": page size 2, then follow the cursor for the rest
    let page1: Value = client
        .get(format!("{base_url}/listings/mine?limit=2"))
        .bearer_auth(&access_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(page1["items"].as_array().unwrap().len(), 2);
    let cursor = page1["next_cursor"].as_str().expect("expected a next_cursor").to_string();

    let page2: Value = client
        .get(format!("{base_url}/listings/mine?limit=2&cursor={cursor}"))
        .bearer_auth(&access_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(page2["items"].as_array().unwrap().len(), 1);
    assert!(page2["next_cursor"].is_null());

    // push one listing's expiry into the past and run the real sweep logic
    sqlx::query!(
        r#"UPDATE listings SET expires_at = now() - interval '1 minute' WHERE id = $1"#,
        uuid::Uuid::parse_str(&listing_ids[0]).unwrap(),
    )
    .execute(&db)
    .await
    .unwrap();

    jobs::sweep_once(&db).await.expect("sweep failed");

    let expired_listing: Value = client
        .get(format!("{base_url}/listings/{}", listing_ids[0]))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(expired_listing["status"], "expired");

    let still_active: Value = client
        .get(format!("{base_url}/listings/{}", listing_ids[1]))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(still_active["status"], "active");
}
