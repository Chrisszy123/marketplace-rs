mod common;

use std::sync::Arc;

use common::CapturingSmsSender;
use serde_json::{json, Value};

/// One long sequential flow rather than many small tests: every scenario shares the same
/// spawned server + Redis rate-limit counters, and splitting it up would make the ordering
/// (signup -> verify -> login -> refresh -> logout) non-obvious and risk cross-test flakiness
/// from the shared Redis flush.
#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn full_signup_to_logout_flow() {
    let sms = Arc::new(CapturingSmsSender::default());
    let base_url = common::spawn_app_with_sms(sms.clone()).await;
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .build()
        .expect("failed to build client");

    let email = common::unique_email();
    let phone = common::unique_phone();
    let password = "correct horse battery staple";

    // --- signup ---
    let signup_res = client
        .post(format!("{base_url}/auth/signup"))
        .json(&json!({
            "email": email,
            "password": password,
            "phone_number": phone,
            "display_name": "Ada Lovelace",
        }))
        .send()
        .await
        .expect("signup request failed");
    assert_eq!(signup_res.status(), 201);
    let signup_body: Value = signup_res.json().await.expect("invalid signup json");
    let user_id = signup_body["user_id"].as_str().expect("missing user_id").to_string();

    // duplicate signup is rejected
    let dup_res = client
        .post(format!("{base_url}/auth/signup"))
        .json(&json!({
            "email": email,
            "password": password,
            "phone_number": phone,
            "display_name": "Ada Lovelace",
        }))
        .send()
        .await
        .expect("dup signup request failed");
    assert_eq!(dup_res.status(), 409);

    // --- login before verification is rejected ---
    let early_login = client
        .post(format!("{base_url}/auth/login"))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .await
        .expect("early login request failed");
    assert_eq!(early_login.status(), 403);

    // --- wrong OTP is rejected ---
    let wrong_otp = client
        .post(format!("{base_url}/auth/verify-otp"))
        .json(&json!({ "user_id": user_id, "code": "000000" }))
        .send()
        .await
        .expect("wrong otp request failed");
    assert_eq!(wrong_otp.status(), 400);

    // --- verify with the real (captured) code ---
    let code = sms
        .last_code
        .lock()
        .await
        .clone()
        .expect("sms sender never captured a code");
    let verify_res = client
        .post(format!("{base_url}/auth/verify-otp"))
        .json(&json!({ "user_id": user_id, "code": code }))
        .send()
        .await
        .expect("verify request failed");
    assert_eq!(verify_res.status(), 200);

    // --- login ---
    let login_res = client
        .post(format!("{base_url}/auth/login"))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .await
        .expect("login request failed");
    assert_eq!(login_res.status(), 200);
    let login_body: Value = login_res.json().await.expect("invalid login json");
    let access_token = login_body["access_token"]
        .as_str()
        .expect("missing access_token")
        .to_string();

    // --- authenticated profile fetch ---
    let profile_res = client
        .get(format!("{base_url}/users/me"))
        .bearer_auth(&access_token)
        .send()
        .await
        .expect("profile request failed");
    assert_eq!(profile_res.status(), 200);
    let profile_body: Value = profile_res.json().await.expect("invalid profile json");
    assert_eq!(profile_body["email"], email);
    assert_eq!(profile_body["display_name"], "Ada Lovelace");
    assert_eq!(profile_body["phone_verified"], true);
    assert!(profile_body["rating"].is_null());

    // profile fetch without a token is rejected
    let unauthed_res = client
        .get(format!("{base_url}/users/me"))
        .send()
        .await
        .expect("unauthed profile request failed");
    assert_eq!(unauthed_res.status(), 401);

    // --- refresh rotates the refresh cookie and issues a new access token ---
    let refresh_res = client
        .post(format!("{base_url}/auth/refresh"))
        .send()
        .await
        .expect("refresh request failed");
    assert_eq!(refresh_res.status(), 200);
    let refresh_body: Value = refresh_res.json().await.expect("invalid refresh json");
    assert!(refresh_body["access_token"].as_str().is_some_and(|t| !t.is_empty()));

    // the rotated cookie is itself valid: a second refresh chained off it also succeeds
    let second_refresh_res = client
        .post(format!("{base_url}/auth/refresh"))
        .send()
        .await
        .expect("second refresh request failed");
    assert_eq!(second_refresh_res.status(), 200);

    // --- logout revokes the refresh token ---
    let logout_res = client
        .post(format!("{base_url}/auth/logout"))
        .send()
        .await
        .expect("logout request failed");
    assert_eq!(logout_res.status(), 204);

    // a refresh after logout must fail — the cookie was revoked
    let post_logout_refresh = client
        .post(format!("{base_url}/auth/refresh"))
        .send()
        .await
        .expect("post-logout refresh request failed");
    assert_eq!(post_logout_refresh.status(), 401);
}

#[tokio::test]
#[serial_test::serial(redis_rate_limit)]
async fn signup_is_rate_limited_per_ip() {
    let base_url = common::spawn_app().await;
    let client = reqwest::Client::new();

    for _ in 0..5 {
        let res = client
            .post(format!("{base_url}/auth/signup"))
            .json(&json!({
                "email": common::unique_email(),
                "password": "correct horse battery staple",
                "phone_number": common::unique_phone(),
                "display_name": "Rate Limit Test",
            }))
            .send()
            .await
            .expect("signup request failed");
        assert_eq!(res.status(), 201);
    }

    let sixth = client
        .post(format!("{base_url}/auth/signup"))
        .json(&json!({
            "email": common::unique_email(),
            "password": "correct horse battery staple",
            "phone_number": common::unique_phone(),
            "display_name": "Rate Limit Test",
        }))
        .send()
        .await
        .expect("sixth signup request failed");
    assert_eq!(sixth.status(), 429);
}
