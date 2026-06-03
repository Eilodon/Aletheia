/**
 * i18n — minimal locale system using useSyncExternalStore.
 * No Context needed. setLocale() triggers re-render in all useStrings() callers.
 *
 * Usage:
 *   const s = useStrings();          // in components
 *   setLocale("en");                 // at bootstrap, after loading UserState
 *   getLocale();                     // for non-React code (e.g. AI prompt language)
 */
import { useSyncExternalStore } from "react";
import { vi, type Strings } from "./vi";
import { en } from "./en";

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
