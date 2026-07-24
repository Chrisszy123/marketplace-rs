mod common;

use std::{sync::Arc, time::Duration};

use common::CapturingSmsSender;
use futures_util::StreamExt;
use serde_json::{json, Value};
use tokio_tungstenite::{connect_async, tungstenite::Message};

async fn create_listing(base_url: &str, client: &reqwest::Client, seller_token: &str) -> (String, String) {
    let db_url = std::env::var("DATABASE_URL").unwrap();
    let db = marketplace_backend::db::connect(&db_url).await.unwrap();
    let category_id: uuid::Uuid =
        sqlx::query_scalar!(r#"SELECT id FROM categories WHERE parent_id IS NOT NULL LIMIT 1"#)
            .fetch_one(&db)
            .await
            .unwrap();

    let res = client
        .post(format!("{base_url}/listings"))
        .bearer_auth(seller_token)
        .json(&json!({
            "category_id": category_id,
            "listing_type": "good",
            "title": "Messaging test listing",
            "description": "For the messaging integration test.",
            "price_kobo": 10_000,
            "location": "Lagos",
            "condition": "used",
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 201);
    let listing: Value = res.json().await.unwrap();
    (
        listing["id"].as_str().unwrap().to_string(),
        listing["seller_id"].as_str().unwrap().to_string(),
    )
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn buyer_and_seller_exchange_messages_with_read_receipts_and_thread_listing() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(false).build().unwrap();

    let (seller_id, seller_token) = common::signup_verify_login_full(&base_url, &client, &sms).await;
    let (buyer_id, buyer_token) = common::signup_verify_login_full(&base_url, &client, &sms).await;
    let (third_party_id, third_party_token) =
        common::signup_verify_login_full(&base_url, &client, &sms).await;
    let _ = third_party_id;

    let (listing_id, listing_seller_id) = create_listing(&base_url, &client, &seller_token).await;
    assert_eq!(listing_seller_id, seller_id);

    // --- buyer opens the thread by sending the first message (no recipient_id needed) ---
    let msg1 = client
        .post(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&buyer_token)
        .json(&json!({ "body": "Is this still available?" }))
        .send()
        .await
        .unwrap();
    assert_eq!(msg1.status(), 201);
    let msg1_body: Value = msg1.json().await.unwrap();
    assert_eq!(msg1_body["recipient_id"], seller_id);
    assert_eq!(msg1_body["sender_id"], buyer_id);

    // --- seller must supply recipient_id (they may have several buyer threads) ---
    let missing_recipient = client
        .post(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&seller_token)
        .json(&json!({ "body": "Yes it's available!" }))
        .send()
        .await
        .unwrap();
    assert_eq!(missing_recipient.status(), 400);

    // --- can't message yourself ---
    let self_message = client
        .post(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&buyer_token)
        .json(&json!({ "body": "hi me", "recipient_id": buyer_id }))
        .send()
        .await
        .unwrap();
    assert_eq!(self_message.status(), 400);

    // --- before the seller reads it, their thread list shows 1 unread ---
    let seller_threads_before: Value = client
        .get(format!("{base_url}/threads"))
        .bearer_auth(&seller_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(seller_threads_before["items"][0]["unread_count"], 1);
    assert_eq!(seller_threads_before["items"][0]["counterpart_id"], buyer_id);

    // --- seller reads the thread (marks buyer's message read) and replies ---
    let seller_view: Value = client
        .get(format!("{base_url}/listings/{listing_id}/messages?with={buyer_id}"))
        .bearer_auth(&seller_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(seller_view["items"].as_array().unwrap().len(), 1);
    assert_eq!(seller_view["items"][0]["body"], "Is this still available?");

    let seller_threads_after_read: Value = client
        .get(format!("{base_url}/threads"))
        .bearer_auth(&seller_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(seller_threads_after_read["items"][0]["unread_count"], 0);

    let reply = client
        .post(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&seller_token)
        .json(&json!({ "body": "Yes it's available!", "recipient_id": buyer_id }))
        .send()
        .await
        .unwrap();
    assert_eq!(reply.status(), 201);

    // --- buyer sees both messages in chronological order, and reading marks the reply read ---
    let buyer_threads_before: Value = client
        .get(format!("{base_url}/threads"))
        .bearer_auth(&buyer_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(buyer_threads_before["items"][0]["unread_count"], 1);
    assert_eq!(buyer_threads_before["items"][0]["last_message_from_me"], false);

    let buyer_view: Value = client
        .get(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&buyer_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let items = buyer_view["items"].as_array().unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(items[0]["body"], "Is this still available?");
    assert_eq!(items[1]["body"], "Yes it's available!");

    let buyer_threads_after_read: Value = client
        .get(format!("{base_url}/threads"))
        .bearer_auth(&buyer_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(buyer_threads_after_read["items"][0]["unread_count"], 0);

    // --- a third party has no messages on this thread: isolation, not a data leak ---
    let third_party_view: Value = client
        .get(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&third_party_token)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(third_party_view["items"].as_array().unwrap().is_empty());
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn new_messages_are_pushed_over_websocket_in_real_time() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder().cookie_store(false).build().unwrap();

    let (seller_id, seller_token) = common::signup_verify_login_full(&base_url, &client, &sms).await;
    let (buyer_id, buyer_token) = common::signup_verify_login_full(&base_url, &client, &sms).await;
    let _ = buyer_id;

    let (listing_id, _) = create_listing(&base_url, &client, &seller_token).await;

    let (mut ws_stream, _) = connect_async(common::ws_url(&base_url, &buyer_token))
        .await
        .expect("buyer failed to connect to websocket");

    // give the server a moment to register the connection before the message is sent
    tokio::time::sleep(Duration::from_millis(100)).await;

    let send_res = client
        .post(format!("{base_url}/listings/{listing_id}/messages"))
        .bearer_auth(&seller_token)
        .json(&json!({ "body": "pushed over websocket", "recipient_id": &buyer_id }))
        .send()
        .await
        .unwrap();
    assert_eq!(send_res.status(), 201);

    let received = tokio::time::timeout(Duration::from_secs(5), ws_stream.next())
        .await
        .expect("timed out waiting for websocket push")
        .expect("websocket closed unexpectedly")
        .expect("websocket error");

    let Message::Text(text) = received else {
        panic!("expected a text frame, got {received:?}");
    };
    let event: Value = serde_json::from_str(&text).unwrap();
    assert_eq!(event["type"], "new_message");
    assert_eq!(event["message"]["body"], "pushed over websocket");
    assert_eq!(event["message"]["sender_id"], seller_id);

    ws_stream.close(None).await.ok();
}
