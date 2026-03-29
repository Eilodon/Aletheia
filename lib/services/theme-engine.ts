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
   * ARCH-06: Use theme.symbols with shuffle instead of DB query for consistency
   * @param themeId - The theme ID to get symbols from (unused, kept for API compatibility)
   */
  async randomThreeSymbols(themeId: string): Promise<Symbol[]> {
    // Get random theme first
    const theme = await store.getRandomTheme(true);
    if (!theme || !theme.symbols || theme.symbols.length < 3) {
      console.warn(`[ThemeEngine] Not enough symbols in theme`);
      return [];
    }
    
    // Shuffle and take 3 (same logic as reading-engine.ts)
    const shuffled = this.shuffleArray([...theme.symbols]);
    return shuffled.slice(0, 3);
  }

  // ARCH-06: Helper to shuffle array (Fisher-Yates) - same as reading-engine.ts
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
