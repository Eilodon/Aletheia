/**
 * Theme Engine Service - Theme and Symbol operations
 * Wraps store operations for theme-related functionality
 * Web-only helper path. Android beta must source theme logic from Rust.
 */

import { store } from "./store";
import { Theme, Symbol } from "@/lib/types";
import { shuffleArray } from "@/lib/utils/random";

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
    const shuffled = shuffleArray([...theme.symbols]);
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
    const shuffled = shuffleArray([...theme.symbols]);
    return shuffled.slice(0, 3);
  }

  /**
   * Get all themes (for debugging/settings)
   */
  async getAllThemes(): Promise<Theme[]> {
    return store.getAllThemes();
  }

  /**
   * Get theme by ID
   */
  async getThemeById(themeId: string): Promise<Theme | null> {
    return store.getThemeById(themeId);
  }
}

export const themeEngine = new ThemeEngineService();
