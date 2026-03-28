/**
 * Theme Engine Service - Theme and Symbol operations
 * Wraps store operations for theme-related functionality
 * TODO: Replace with UniFFI bindings when available
 */

import { store } from "./store";
import { Theme, Symbol } from "@/lib/types";

class ThemeEngineService {
  /**
   * Get a random theme
   * @param premiumAllowed - Whether to include premium themes
   */
  async getRandomTheme(premiumAllowed: boolean): Promise<Theme | null> {
    return store.getRandomTheme(premiumAllowed);
  }

  /**
   * Get 3 random symbols from a theme
   * @param themeId - The theme ID to get symbols from
   */
  async randomThreeSymbols(themeId: string): Promise<Symbol[]> {
    const symbols = await store.randomThreeSymbols(themeId);
    
    // Ensure we have exactly 3 symbols
    if (symbols.length < 3) {
      console.warn(`[ThemeEngine] Only ${symbols.length} symbols found for theme ${themeId}, expected 3`);
    }
    
    return symbols;
  }

  /**
   * Get all themes (for debugging/settings)
   */
  async getAllThemes(): Promise<Theme[]> {
    // This would need a new method in store if needed
    // For now, just get a random one as placeholder
    return [];
  }

  /**
   * Get theme by ID
   */
  async getThemeById(themeId: string): Promise<Theme | null> {
    // This would need a new method in store if needed
    return null;
  }
}

export const themeEngine = new ThemeEngineService();
