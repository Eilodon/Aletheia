/**
 * Theme Engine Service - Theme and Symbol operations
 * Wraps store operations for theme-related functionality
 * Web-only helper path. Android beta must source theme logic from Rust.
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
   * Get 3 random symbols from a specific theme
   * @param themeId - The theme ID to get symbols from
   */
  async getSymbolsFromTheme(themeId: string): Promise<Symbol[]> {
    const theme = await store.getThemeById(themeId);
    if (!theme || !theme.symbols || theme.symbols.length < 3) {
      console.warn(`[ThemeEngine] Theme not found or not enough symbols`);
      return [];
    }
    const shuffled = this.shuffleArray([...theme.symbols]);
    return shuffled.slice(0, 3);
  }

  /**
   * Get 3 random symbols from a random theme
   * Use this for truly random symbol selection
   */
  async randomThreeSymbols(): Promise<Symbol[]> {
    const theme = await store.getRandomTheme(true);
    if (!theme || !theme.symbols || theme.symbols.length < 3) {
      console.warn(`[ThemeEngine] Not enough symbols in theme`);
      return [];
    }
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
  async getThemeById(_themeId: string): Promise<Theme | null> {
    // This would need a new method in store if needed
    return null;
  }
}

export const themeEngine = new ThemeEngineService();
