mod common;

#[tokio::test]
async fn health_check_returns_ok() {
    let base_url = common::spawn_app().await;

    let response = reqwest::get(format!("{base_url}/health"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), 200);
    let body: serde_json::Value = response.json().await.expect("invalid json body");
    assert_eq!(body["status"], "ok");
    assert_eq!(body["database"], "ok");
}
