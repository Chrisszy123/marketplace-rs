use async_trait::async_trait;

/// Abstraction over the SMS provider so a real one (Termii, Twilio, etc.) can be swapped in
/// later without touching the OTP flow. `LoggingSmsSender` is the dev/test stand-in.
#[async_trait]
pub trait SmsSender: Send + Sync {
    async fn send_otp(&self, phone_number: &str, code: &str) -> anyhow::Result<()>;
}

pub struct LoggingSmsSender;

#[async_trait]
impl SmsSender for LoggingSmsSender {
    async fn send_otp(&self, phone_number: &str, code: &str) -> anyhow::Result<()> {
        tracing::info!(phone_number, code, "dev SMS sender: OTP not actually sent");
        Ok(())
    }
}
