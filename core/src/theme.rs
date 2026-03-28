//! Aletheia Core - Theme Engine
//! Handles theme and symbol management

use crate::contracts::*;
use crate::errors::AletheiaError;
use crate::store::Store;
use std::sync::Arc;
use tracing::info;

pub struct ThemeEngine {
    store: Arc<Store>,
}

impl ThemeEngine {
    pub fn new(store: Arc<Store>) -> Self {
        Self { store }
    }

    pub fn get_random_theme(&self, premium_allowed: bool) -> Result<Theme, AletheiaError> {
        self.store
            .get_random_theme(premium_allowed)?
            .ok_or_else(|| AletheiaError::theme_not_found("any"))
    }

    pub fn random_three_symbols(&self, theme_id: &str) -> Result<Vec<Symbol>, AletheiaError> {
        let symbols = self.store.get_random_symbols(theme_id, 3)?;
        
        if symbols.len() != 3 {
            return Err(AletheiaError::invalid_input(
                "symbols",
                "Could not select 3 unique symbols",
            ));
        }

        info!("Selected 3 random symbols for theme {}", theme_id);
        Ok(symbols)
    }

    #[allow(dead_code)]
    pub fn get_theme(&self, id: &str) -> Result<Theme, AletheiaError> {
        self.store
            .get_theme(id)?
            .ok_or_else(|| AletheiaError::theme_not_found(id))
    }
}
