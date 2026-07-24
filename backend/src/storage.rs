use aws_sdk_s3::{
    config::{BehaviorVersion, Credentials, Region},
    primitives::ByteStream,
    Client,
};

use crate::config::Config;

pub fn build_client(cfg: &Config) -> Client {
    let credentials = Credentials::new(
        &cfg.s3_access_key_id,
        &cfg.s3_secret_access_key,
        None,
        None,
        "static",
    );

    let s3_config = aws_sdk_s3::config::Builder::new()
        .behavior_version(BehaviorVersion::latest())
        .endpoint_url(&cfg.s3_endpoint_url)
        .region(Region::new(cfg.s3_region.clone()))
        .credentials_provider(credentials)
        // MinIO (and most self-hosted S3-compatible stores) expect path-style URLs
        // (http://host/bucket/key) rather than AWS's virtual-hosted-style (bucket.host/key).
        .force_path_style(true)
        .build();

    Client::from_conf(s3_config)
}

/// Creates the listings bucket if it doesn't exist yet and makes it public-read, since listing
/// photos are served directly from MinIO by URL with no auth. Safe to call on every startup.
pub async fn ensure_bucket(client: &Client, bucket: &str) -> anyhow::Result<()> {
    let exists = client.head_bucket().bucket(bucket).send().await.is_ok();

    if !exists {
        client.create_bucket().bucket(bucket).send().await?;
    }

    let policy = format!(
        r#"{{"Version":"2012-10-17","Statement":[{{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::{bucket}/*"]}}]}}"#
    );
    client
        .put_bucket_policy()
        .bucket(bucket)
        .policy(policy)
        .send()
        .await?;

    Ok(())
}

pub async fn upload_object(
    client: &Client,
    bucket: &str,
    key: &str,
    bytes: Vec<u8>,
    content_type: &str,
) -> anyhow::Result<()> {
    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(ByteStream::from(bytes))
        .content_type(content_type)
        .send()
        .await?;
    Ok(())
}

pub async fn delete_object(client: &Client, bucket: &str, key: &str) -> anyhow::Result<()> {
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await?;
    Ok(())
}

pub fn public_url(public_url_base: &str, key: &str) -> String {
    format!("{}/{}", public_url_base.trim_end_matches('/'), key)
}
