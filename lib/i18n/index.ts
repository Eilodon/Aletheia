/**
 * i18n — minimal locale system using useSyncExternalStore.
 * No Context needed. setLocale() triggers re-render in all useStrings() callers.
 *
 * Usage:
 *   const s = useStrings();          // localized strings in components
 *   const df = useDisplayFont();     // locale-aware display font (switches Cinzel ↔ EB Garamond)
 *   setLocale("en");                 // at bootstrap, after loading UserState
 *   getLocale();                     // for non-React code (e.g. AI prompt language)
 *
 * Font note:
 *   useDisplayFont() returns EB Garamond for "vi" (Vietnamese diacritic support)
 *   and Cinzel for "en" (decorative Latin display). For brand text that is always
 *   pure Latin ASCII (e.g. the "ALETHEIA" wordmark), use Fonts.brand directly —
 *   it is explicitly excluded from locale switching.
 */
import { useSyncExternalStore } from "react";
import { vi, type Strings } from "./vi";
import { en } from "./en";
import { Fonts } from "@/lib/theme";

type Locale = "vi" | "en";

const STRINGS: Record<Locale, Strings> = { vi, en };

let _locale: Locale = "vi";
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

/** Set the active locale. Triggers re-render in all useStrings() subscribers. */
export function setLocale(rawLocale: string): void {
  const locale: Locale = rawLocale === "en" ? "en" : "vi";
  if (locale === _locale) return;
  _locale = locale;
  notifyListeners();
}

/** Get the current locale — safe to call outside React. */
export function getLocale(): Locale {
  return _locale;
}

/** Get strings synchronously — safe to call outside React. */
export function getStrings(): Strings {
  return STRINGS[_locale];
}

function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** React hook — returns localized strings, re-renders when locale changes. */
export function useStrings(): Strings {
  return useSyncExternalStore(subscribe, getStrings, getStrings);
}

// Stable references — useSyncExternalStore uses Object.is, so these must not be recreated per call.
const DISPLAY_FONTS_VI = {
  display: Fonts!.viDisplay,
  displayStrong: Fonts!.viDisplayStrong,
} as const;
const DISPLAY_FONTS_EN = {
  display: Fonts!.display,
  displayStrong: Fonts!.displayStrong,
} as const;

function getDisplayFontSnapshot() {
  return _locale === "vi" ? DISPLAY_FONTS_VI : DISPLAY_FONTS_EN;
}

/**
 * React hook — returns locale-appropriate display font families.
 * Re-renders when locale changes. Use for any display/title text that may
 * contain Vietnamese diacritics. Do NOT use for the "ALETHEIA" wordmark —
 * use Fonts.brand there instead.
 *
 * @example
 *   const { display, displayStrong } = useDisplayFont();
 *   <Text style={{ fontFamily: displayStrong }}>{s.home.tagline}</Text>
 */
export function useDisplayFont() {
  return useSyncExternalStore(subscribe, getDisplayFontSnapshot, getDisplayFontSnapshot);
}
