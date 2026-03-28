/**
 * ThemeEngine Service - Theme and Symbol Management
 * Handles: get_random_theme, random_three_symbols
 */

import { Theme, Symbol } from "@/lib/types";
import { store } from "./store";

class ThemeEngineService {
  async getRandomTheme(premiumAllowed: boolean = false): Promise<Theme | null> {
    return await store.getRandomTheme(premiumAllowed);
  }

  async randomThreeSymbols(themeId: string): Promise<Symbol[]> {
    return await store.getRandomSymbols(themeId, 3);
  }
}

export const themeEngine = new ThemeEngineService();
