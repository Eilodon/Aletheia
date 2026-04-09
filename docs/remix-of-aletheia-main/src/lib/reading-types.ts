// ═══ Enums ═══

export type Tradition = "chinese" | "christian" | "islamic" | "sufi" | "stoic" | "universal";
export type SymbolMethod = "manual" | "auto";
export type MoodTag = "confused" | "hopeful" | "anxious" | "curious" | "grateful" | "grief";
export type UserIntent = "clarity" | "comfort" | "challenge" | "guidance";
export type SubscriptionTier = "free" | "pro";

export type ReadingState =
  | "idle"
  | "situation_input"
  | "source_selection"
  | "wildcard_reveal"
  | "wildcard_chosen"
  | "ritual_animation"
  | "passage_displayed"
  | "ai_streaming"
  | "ai_fallback"
  | "complete";

// ═══ Core types ═══

export interface Source {
  id: string;
  name: string;
  tradition: Tradition;
  language: "vi" | "en";
  description?: string;
  /** i18n key for display */
  i18nKey: string;
  premium: boolean;
}

export interface Symbol {
  id: string;
  /** i18n key for display name, e.g. "fire" → t("symbol.fire") */
  i18nKey: string;
  icon?: string;
}

export interface Passage {
  id?: string;
  sourceId?: string;
  text: string;
  reference: string;
  context?: string;
  resonanceContext?: string;
}

export interface ReadingSession {
  id: string;
  sourceKey: string;
  sourceId: string;
  themeKey: string;
  symbols: Symbol[];
  situation?: string;
  userIntent?: UserIntent;
  createdAt: Date;
}

export interface SavedReading {
  id: string;
  passage: Passage;
  symbol: Symbol;
  /** Snapshot of display name at save time */
  symbolName: string;
  aiResponse?: string;
  situation?: string;
  source: string;
  sourceId?: string;
  moodTag?: MoodTag;
  symbolMethod?: SymbolMethod;
  readDurationS?: number;
  userIntent?: UserIntent;
  createdAt: Date;
}

// ═══ User state ═══

export interface UserState {
  readingsToday: number;
  aiCallsToday: number;
  lastReadingDate: string | null;
  onboardingComplete: boolean;
  userIntent: UserIntent | null;
  sessionCount: number;
}

// ═══ Constants ═══

export const FREE_READINGS_PER_DAY = 3;
export const FREE_AI_PER_DAY = 1;
export const PASSAGE_ACTION_DELAY_MS = 3000;
export const COMPLETE_SILENCE_BEAT_MS = 4000;
export const RITUAL_DURATION_MS = 4500;
