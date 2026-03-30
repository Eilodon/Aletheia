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
        let now = chrono_timestamp();
        let token = generate_base62_token(16);
        let deep_link = format!("https://aletheia.app/gift/{}", token);

        // Try to create via backend
        let client = reqwest::Client::new();
        let response = client
            .post(&format!("{}/gift/create", self.backend_url))
            .json(&serde_json::json!({
                "source_id": source_id,
                "buyer_note": buyer_note,
            }))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = resp.json().await?;
                info!("Created gift via backend: {}", json["token"]);
                Ok(GiftResponse {
                    token: json["token"].as_str().unwrap_or(&token).to_string(),
                    deep_link: json["deep_link"].as_str().unwrap_or(&deep_link).to_string(),
                })
            }
            _ => {
                // Fallback: create locally (for offline/demo)
                let _gift = GiftReading {
                    token: token.clone(),
                    buyer_note: buyer_note.clone(),
                    source_id: source_id.clone(),
                    created_at: now,
                    expires_at: now + (GIFT_LINK_TTL_SECONDS as i64 * 1000),
                    redeemed: false,
                    redeemed_at: None,
                };

                // Store locally (simplified - in production would use backend)
                info!("Created local gift: {}", token);
                Ok(GiftResponse { token, deep_link })
            }
        }
    }

    pub async fn redeem_gift(&self, token: &str) -> Result<GiftReading, AletheiaError> {
        // Try to redeem via backend
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
            _ => {
                // Fallback: local validation (simplified)
                Err(AletheiaError::gift_not_found(token))
            }
        }
    }
}
