//! Aletheia Core - Gift Client
//! Handles gift creation and redemption
//! ADR-AL-9: Gift Reading - Deferred Deep Link + Minimal Backend

use crate::contracts::*;
use crate::errors::AletheiaError;
use std::sync::Arc;
use tracing::info;

pub struct GiftClient {
    backend_url: String,
}

impl GiftClient {
    pub fn new(_store: Arc<crate::store::Store>, backend_url: &str) -> Self {
        Self {
            backend_url: backend_url.to_string(),
        }
    }

    pub async fn create_gift(
        &self,
        source_id: Option<String>,
        buyer_note: Option<String>,
    ) -> Result<GiftResponse, AletheiaError> {
        if self.backend_url.trim().is_empty() {
            return Err(AletheiaError::invalid_input(
                "gift_backend_url",
                "Gift backend is not configured",
            ));
        }

        let client = reqwest::Client::new();
        let resp = client
            .post(&format!("{}/gift/create", self.backend_url))
            .json(&serde_json::json!({
                "source_id": source_id,
                "buyer_note": buyer_note,
            }))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(AletheiaError::invalid_input(
                "gift_backend",
                &format!("Gift backend returned HTTP {}", resp.status().as_u16()),
            ));
        }

        let json: serde_json::Value = resp.json().await?;
        let token = json["token"].as_str().ok_or_else(|| {
            AletheiaError::invalid_input("gift_backend", "Gift response is missing token")
        })?;
        let deep_link = json["deep_link"].as_str().ok_or_else(|| {
            AletheiaError::invalid_input("gift_backend", "Gift response is missing deep_link")
        })?;

        info!("Created gift via backend: {}", token);
        Ok(GiftResponse {
            token: token.to_string(),
            deep_link: deep_link.to_string(),
        })
    }

    pub async fn redeem_gift(&self, token: &str) -> Result<GiftReading, AletheiaError> {
        if self.backend_url.trim().is_empty() {
            return Err(AletheiaError::invalid_input(
                "gift_backend_url",
                "Gift backend is not configured",
            ));
        }

        let client = reqwest::Client::new();
        let response = client
            .post(&format!("{}/gift/redeem", self.backend_url))
            .json(&serde_json::json!({ "token": token }))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = resp.json().await?;

                // Check if already redeemed
                if json["redeemed"].as_bool().unwrap_or(false) {
                    let redeemed_at = json["redeemed_at"].as_i64().unwrap_or(chrono_timestamp());
                    return Err(AletheiaError::gift_already_redeemed(redeemed_at));
                }

                // Check expiration
                let expires_at = json["expires_at"].as_i64().unwrap_or(0);
                if chrono_timestamp() > expires_at {
                    return Err(AletheiaError::gift_expired(expires_at));
                }

                info!("Redeemed gift: {}", token);
                Ok(GiftReading {
                    token: token.to_string(),
                    buyer_note: json["buyer_note"].as_str().map(String::from),
                    source_id: json["source_id"].as_str().map(String::from),
                    created_at: json["created_at"].as_i64().unwrap_or(chrono_timestamp()),
                    expires_at,
                    redeemed: true,
                    redeemed_at: Some(chrono_timestamp()),
                })
            }
            Ok(resp) if resp.status() == 410 => {
                Err(AletheiaError::gift_expired(chrono_timestamp()))
            }
            Ok(resp) if resp.status() == 404 => Err(AletheiaError::gift_not_found(token)),
            Ok(resp) if resp.status() == 409 => {
                Err(AletheiaError::gift_already_redeemed(chrono_timestamp()))
            }
            Ok(resp) => Err(AletheiaError::invalid_input(
                "gift_backend",
                &format!("Gift backend returned HTTP {}", resp.status().as_u16()),
            )),
            Err(err) => Err(err.into()),
        }
    }
}
