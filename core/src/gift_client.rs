//! Aletheia Core — Gift Client
//! ADR-AL-9:  Gift Reading - Deferred Deep Link + Minimal Backend
//! ADR-AL-52: GiftClient Error Handling — no silent failures (VHEATM Cycle 5)
//!
//! v7 fixes:
//!  - `expires_at` missing → explicit error (was: unwrap_or(0) = gift always expired)
//!  - `redeemed` missing  → explicit error (was: unwrap_or(false) = bypass redeemed check)
//!  - Structural validation fn `parse_gift_json` consolidates all field extraction

use crate::contracts::*;
use crate::errors::AletheiaError;
use std::sync::Arc;
use tracing::{info, warn};

pub struct GiftClient {
    backend_url: String,
}

impl GiftClient {
    pub fn new(_store: Arc<crate::store::Store>, backend_url: &str) -> Self {
        Self {
            backend_url: backend_url.trim().to_string(),
        }
    }

    pub async fn create_gift(
        &self,
        source_id: Option<String>,
        buyer_note: Option<String>,
    ) -> Result<GiftResponse, AletheiaError> {
        if self.backend_url.is_empty() {
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

        let token = json["token"]
            .as_str()
            .ok_or_else(|| AletheiaError::invalid_input("gift_backend", "response missing 'token'"))?
            .to_string();

        let deep_link = json["deep_link"]
            .as_str()
            .ok_or_else(|| AletheiaError::invalid_input("gift_backend", "response missing 'deep_link'"))?
            .to_string();

        info!("Created gift: {}", token);
        Ok(GiftResponse { token, deep_link })
    }

    pub async fn redeem_gift(&self, token: &str) -> Result<GiftReading, AletheiaError> {
        if self.backend_url.is_empty() {
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
                parse_gift_json(&json, token)
            }
            Ok(resp) if resp.status() == 410 => {
                Err(AletheiaError::gift_expired(chrono_timestamp()))
            }
            Ok(resp) if resp.status() == 404 => {
                Err(AletheiaError::gift_not_found(token))
            }
            Ok(resp) if resp.status() == 409 => {
                Err(AletheiaError::gift_already_redeemed(chrono_timestamp()))
            }
            Ok(resp) => Err(AletheiaError::invalid_input(
                "gift_backend",
                &format!("Unexpected HTTP {}", resp.status().as_u16()),
            )),
            Err(err) => Err(err.into()),
        }
    }
}

// ─── Strict JSON parser — ADR-AL-52 ─────────────────────────────────────────
//
// All required fields must be present and correctly typed.
// Missing or wrong-type fields return a typed error — no silent fallbacks.

fn parse_gift_json(json: &serde_json::Value, token: &str) -> Result<GiftReading, AletheiaError> {
    // ── `redeemed` — REQUIRED boolean ────────────────────────────────────────
    // Previously `unwrap_or(false)`: missing field = bypass redeemed check = BUG.
    let redeemed = json["redeemed"]
        .as_bool()
        .ok_or_else(|| {
            warn!("Gift response missing/invalid 'redeemed' field: {}", json);
            AletheiaError::invalid_input("gift_backend", "response missing required field 'redeemed'")
        })?;

    if redeemed {
        // `redeemed_at` — acceptable to fallback when redeemed=true (field may be absent in older backends)
        let redeemed_at = json["redeemed_at"]
            .as_i64()
            .unwrap_or_else(|| {
                warn!("Gift response missing 'redeemed_at'; using current timestamp as fallback");
                chrono_timestamp()
            });
        return Err(AletheiaError::gift_already_redeemed(redeemed_at));
    }

    // ── `expires_at` — REQUIRED i64 ──────────────────────────────────────────
    // Previously `unwrap_or(0)`: missing field = expires_at=0 = gift always expired = BUG.
    let expires_at = json["expires_at"]
        .as_i64()
        .ok_or_else(|| {
            warn!("Gift response missing/invalid 'expires_at' field: {}", json);
            AletheiaError::invalid_input("gift_backend", "response missing required field 'expires_at'")
        })?;

    if chrono_timestamp() > expires_at {
        return Err(AletheiaError::gift_expired(expires_at));
    }

    // ── Optional fields — safe fallbacks acceptable ───────────────────────────
    let created_at = json["created_at"]
        .as_i64()
        .unwrap_or_else(|| {
            warn!("Gift response missing 'created_at'; using current timestamp");
            chrono_timestamp()
        });

    info!("Redeemed gift: {}", token);
    Ok(GiftReading {
        token: token.to_string(),
        buyer_note:  json["buyer_note"].as_str().map(String::from),
        source_id:   json["source_id"].as_str().map(String::from),
        created_at,
        expires_at,
        redeemed: true,
        redeemed_at: Some(chrono_timestamp()),
    })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn future_ts() -> i64 { chrono_timestamp() + 86_400 }  // +1 day
    fn past_ts()   -> i64 { chrono_timestamp() - 86_400 }  // -1 day

    // ── Redeemed field ────────────────────────────────────────────────────────

    #[test]
    fn gift_missing_redeemed_field_returns_error() {
        // ADR-AL-52: previously silently treated as not-redeemed
        let json = json!({ "expires_at": future_ts(), "created_at": 0 });
        let err = parse_gift_json(&json, "tok").unwrap_err();
        assert!(err.message.contains("redeemed"), "Expected redeemed error, got: {err}");
    }

    #[test]
    fn gift_redeemed_true_returns_already_redeemed_error() {
        let json = json!({ "redeemed": true, "redeemed_at": 999 });
        match parse_gift_json(&json, "tok").unwrap_err().code {
            crate::contracts::ErrorCode::GiftAlreadyRedeemed => {}
            c => panic!("Expected GiftAlreadyRedeemed, got {:?}", c),
        }
    }

    #[test]
    fn gift_redeemed_true_without_redeemed_at_uses_fallback_timestamp() {
        let json = json!({ "redeemed": true });
        // Should still return GiftAlreadyRedeemed (not panic, not success)
        match parse_gift_json(&json, "tok").unwrap_err().code {
            crate::contracts::ErrorCode::GiftAlreadyRedeemed => {}
            c => panic!("Expected GiftAlreadyRedeemed, got {:?}", c),
        }
    }

    // ── expires_at field ─────────────────────────────────────────────────────

    #[test]
    fn gift_missing_expires_at_returns_error() {
        // ADR-AL-52: previously silently treated as expired (epoch 0 < now)
        let json = json!({ "redeemed": false, "created_at": 0 });
        let err = parse_gift_json(&json, "tok").unwrap_err();
        assert!(err.message.contains("expires_at"), "Expected expires_at error, got: {err}");
    }

    #[test]
    fn gift_expired_returns_gift_expired_error() {
        let json = json!({ "redeemed": false, "expires_at": past_ts() });
        match parse_gift_json(&json, "tok").unwrap_err().code {
            crate::contracts::ErrorCode::GiftExpired => {}
            c => panic!("Expected GiftExpired, got {:?}", c),
        }
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[test]
    fn gift_valid_response_parses_correctly() {
        let json = json!({
            "redeemed": false,
            "expires_at": future_ts(),
            "created_at": 1_000_000,
            "buyer_note": "With love",
            "source_id": "tao"
        });
        let gift = parse_gift_json(&json, "abc123").unwrap();
        assert_eq!(gift.token, "abc123");
        assert_eq!(gift.buyer_note.as_deref(), Some("With love"));
        assert_eq!(gift.source_id.as_deref(), Some("tao"));
        assert!(gift.redeemed);
    }

    #[test]
    fn gift_missing_optional_created_at_uses_fallback() {
        let json = json!({ "redeemed": false, "expires_at": future_ts() });
        let gift = parse_gift_json(&json, "tok").unwrap();
        assert!(gift.created_at > 0, "created_at should have fallback timestamp");
    }
}
