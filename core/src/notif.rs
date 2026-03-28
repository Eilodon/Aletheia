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
    ("key", "Cánh cửa nào đang chờ bạn mở"),
    ("dawn", "Điều gì đang chào đón bạn"),
    ("mirror", "Bạn thấy gì khi nhìn vào gương"),
    ("wave", "Bạn đang chảy theo dòng hay đang bơi ngược"),
    ("seed", "Điều gì đang nảy mầm trong bạn"),
    ("bridge", "Bạn đang cần băng qua điều gì"),
    ("moon", "Điều gì đang chiếu sáng trong bóng tối"),
    ("flame", "Điều gì đang nung nấu trong bạn"),
    ("river", "Bạn đang đi đến đâu"),
    ("mountain", "Điều gì bạn cần vượt qua"),
    ("bird", "Bạn đang khao khát điều gì"),
    ("tree", "Rễ của bạn đang bám vào đâu"),
    ("door", "Bạn có dám bước vào không"),
    ("star", "Điều gì đang dẫn lối cho bạn"),
    ("shadow", "Bạn đang trốn tránh điều gì"),
    ("rain", "Điều gì đang cần được rửa trôi"),
    ("clock", "Thời gian nào đang chờ bạn"),
    ("book", "Bài học nào đang chờ bạn"),
    ("garden", "Điều gì bạn cần gieo trồng"),
    ("path", "Con đường nào gọi tên bạn"),
    ("window", "Bạn đang nhìn ra đâu"),
    ("fire", "Điều gì cần được đốt cháy"),
    ("ocean", "Bạn đang giấu điều gì sâu trong lòng"),
    ("stone", "Điều gì đang nặng nề trong bạn"),
    ("wind", "Điều gì đang thổi qua cuộc sống bạn"),
    ("leaf", "Điều gì cần được buông bỏ"),
    ("eye", "Bạn đang nhìn thấy gì"),
    ("heart", "Trái tim bạn đang nói gì"),
    ("road", "Lối nào bạn sẽ chọn"),
];

pub struct NotificationScheduler {
    store: Arc<Store>,
}

impl NotificationScheduler {
    pub fn new(store: Arc<Store>) -> Self {
        Self { store }
    }

    pub fn get_daily_notification(&self, user_id: &str, date: &str) -> Result<NotificationEntry, AletheiaError> {
        // Seed based on user_id + date (consistent per user per day)
        let seed = self.hash_string(&format!("{}{}", user_id, date)) as u16;
        let index = seed % NOTIFICATION_MATRIX_SIZE;

        // Try to get from DB first
        let matrix = self.store.get_notification_matrix()?;
        
        let entry = if matrix.is_empty() {
            // Use default matrix
            let idx = index as usize % DEFAULT_NOTIFICATION_MATRIX.len();
            let (symbol_id, question) = DEFAULT_NOTIFICATION_MATRIX[idx];
            NotificationEntry {
                symbol_id: symbol_id.to_string(),
                question: question.to_string(),
            }
        } else {
            matrix[index as usize % matrix.len()].clone()
        };

        info!("Daily notification for {} on {}: {}", user_id, date, entry.symbol_id);
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
