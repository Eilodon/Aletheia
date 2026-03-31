//! Aletheia Core - Notification Scheduler
//! Handles daily notification scheduling with static matrix
//! ADR-AL-7: Push Notification 1/ngày, Static Formula
//! ADR-AL-10: Notification Formula - Static Symbol × Tension Matrix

use crate::contracts::*;
use crate::errors::AletheiaError;
use crate::store::Store;
use std::sync::Arc;
use tracing::info;

const DEFAULT_NOTIFICATION_MATRIX: &[(&str, &str)] = &[
    ("candle", "Bạn đang thắp sáng hay đang cháy"),
    ("key", "Cái gì đang chờ bạn mở"),
    ("dawn", "Bạn sẵn sàng cho gì"),
    ("mirror", "Bạn thấy gì khi nhìn sâu vào"),
    ("door", "Bạn sẽ bước qua hay lùi lại"),
    ("bridge", "Bạn đang nối liền những gì"),
    ("stone", "Cái gì trong bạn là bất động"),
    ("water", "Bạn đang chảy hay đang đứng yên"),
    ("fire", "Cái gì trong bạn đang cháy"),
    ("wind", "Bạn đang theo hướng nào"),
    ("silence", "Bạn có nghe được gì trong im lặng"),
    ("seed", "Bạn đang trồng cái gì"),
    ("earth", "Bạn cần gì để cảm thấy an toàn"),
    ("air", "Bạn cần không gian để làm gì"),
    ("metal", "Cái gì cần được tinh chỉnh"),
    ("wood", "Bạn đang phát triển như thế nào"),
    ("void", "Bạn sợ điều gì trong khoảng trống"),
    ("light", "Bạn cần soi sáng cái gì"),
    ("shadow", "Bạn đang tránh nhìn vào gì"),
    ("thunder", "Bạn sẵn sàng cho sự thay đổi đột ngột"),
];

pub struct NotificationScheduler {
    store: Arc<Store>,
}

impl NotificationScheduler {
    pub fn new(store: Arc<Store>) -> Self {
        Self { store }
    }

    pub fn get_daily_notification(
        &self,
        user_id: &str,
        date: &str,
    ) -> Result<NotificationEntry, AletheiaError> {
        // Seed based on user_id + date (consistent per user per day)
        let matrix = self.store.get_notification_matrix()?;
        let active_len = if matrix.is_empty() {
            DEFAULT_NOTIFICATION_MATRIX.len()
        } else {
            matrix.len()
        };
        let seed = self.hash_string(&format!("{}{}", user_id, date)) as usize;
        let index = seed % active_len;

        let entry = if matrix.is_empty() {
            let (symbol_id, question) = DEFAULT_NOTIFICATION_MATRIX[index];
            NotificationEntry {
                symbol_id: symbol_id.to_string(),
                question: question.to_string(),
            }
        } else {
            matrix[index].clone()
        };

        info!(
            "Daily notification for {} on {}: {}",
            user_id, date, entry.symbol_id
        );
        Ok(entry)
    }

    pub fn format_notification(&self, entry: &NotificationEntry) -> (String, String) {
        let symbol = self.store.get_symbol_by_id(&entry.symbol_id).ok().flatten();
        let symbol_name = symbol
            .as_ref()
            .map(|s| s.display_name.as_str())
            .unwrap_or(&entry.symbol_id);

        let title = "✦ Vũ trụ hôm nay lật".to_string();
        let body = format!("{}. {}?", symbol_name, entry.question);

        (title, body)
    }

    fn hash_string(&self, s: &str) -> u32 {
        let mut hash: u32 = 0;
        for c in s.chars() {
            hash = hash.wrapping_mul(31).wrapping_add(c as u32);
        }
        hash
    }
}
