/**
 * English translations for symbol display names and flavor texts.
 * The Rust store holds a single display_name (Vietnamese by default).
 * This module provides a JS-layer lookup so components and AI calls can
 * serve locale-appropriate names without a native rebuild.
 *
 * Usage:
 *   const sym = getLocalizedSymbol(symbol, locale);
 *   const name = getLocalizedThemeName(theme.id, theme.name, locale);
 */

export type SymbolLocale = {
  display_name: string;
  flavor_text?: string;
};

/** English translations keyed by symbol id. */
export const SYMBOL_NAMES_EN: Record<string, SymbolLocale> = {
  // ── moments ────────────────────────────────────────────────────────────────
  candle:   { display_name: "The Candle",   flavor_text: "Light it or let it go out?" },
  key:      { display_name: "The Key",      flavor_text: "Which door remains unopened?" },
  dawn:     { display_name: "Dawn",         flavor_text: "Worrying before it even begins." },
  mirror:   { display_name: "The Mirror",   flavor_text: "Who do you see looking in?" },
  door:     { display_name: "The Door",     flavor_text: "Step through or step back?" },
  bridge:   { display_name: "The Bridge",   flavor_text: "Between here and there." },
  stone:    { display_name: "The Stone",    flavor_text: "Still doesn't mean unfeeling." },
  water:    { display_name: "Water",        flavor_text: "Always flows to the lowest place." },
  fire:     { display_name: "Fire",         flavor_text: "Nourish or consume?" },
  wind:     { display_name: "Wind",         flavor_text: "Unseen but undeniably real." },
  silence:  { display_name: "Silence",      flavor_text: "What has not yet been spoken." },
  seed:     { display_name: "The Seed",     flavor_text: "Nothing yet — but everything waiting." },

  // ── elements ───────────────────────────────────────────────────────────────
  earth:    { display_name: "Earth",        flavor_text: "Everything returns here." },
  air:      { display_name: "Air",          flavor_text: "Present but impossible to hold." },
  metal:    { display_name: "Metal",        flavor_text: "Only takes shape through fire." },
  wood:     { display_name: "Wood",         flavor_text: "Bends with the wind and still lives." },
  void:     { display_name: "The Void",     flavor_text: "Empty is what allows containing." },
  light:    { display_name: "Light",        flavor_text: "Poured in, no vessel holds it all." },
  shadow:   { display_name: "Shadow",       flavor_text: "Light is what makes shadow real." },
  thunder:  { display_name: "Thunder",      flavor_text: "Warning before or after?" },
  mountain: { display_name: "The Mountain", flavor_text: "If you can't cross it, go around." },
  valley:   { display_name: "The Valley",   flavor_text: "The lowest place holds the most." },
  river:    { display_name: "The River",    flavor_text: "No one steps in the same river twice." },
  ocean:    { display_name: "The Ocean",    flavor_text: "Too deep to measure." },

  // ── creatures ──────────────────────────────────────────────────────────────
  elephant: { display_name: "The Elephant", flavor_text: "Memory that cannot be erased." },
  fox:      { display_name: "The Fox",      flavor_text: "Wisdom or cunning?" },
  turtle:   { display_name: "The Turtle",   flavor_text: "Slow and certain." },
  tiger:    { display_name: "The Tiger",    flavor_text: "Strength that knows how to wait." },
  crane:    { display_name: "The Crane",    flavor_text: "Patience is not passivity." },
  snake:    { display_name: "The Snake",    flavor_text: "Shed the skin to continue." },
  eagle:    { display_name: "The Eagle",    flavor_text: "Vision from above." },
  wolf:     { display_name: "The Wolf",     flavor_text: "Alone or with the pack?" },

  // ── celestial ──────────────────────────────────────────────────────────────
  crescent:      { display_name: "Crescent Moon",  flavor_text: "Waxing or waning?" },
  full_moon:     { display_name: "Full Moon",       flavor_text: "The time to be seen." },
  eclipse:       { display_name: "Eclipse",         flavor_text: "Hidden doesn't mean gone." },
  north_star:    { display_name: "The North Star",  flavor_text: "The anchor that does not move." },
  shooting_star: { display_name: "Shooting Star",   flavor_text: "Brief but undeniably real." },
  dawn_sky:      { display_name: "Dawn Sky",        flavor_text: "Before the day begins." },
  dusk:          { display_name: "Dusk",            flavor_text: "Between two worlds." },
  galaxy:        { display_name: "The Galaxy",      flavor_text: "Tiny, but part of the whole." },

  // ── landscape ──────────────────────────────────────────────────────────────
  cave:       { display_name: "The Cave",       flavor_text: "Going in or coming out?" },
  summit:     { display_name: "The Summit",     flavor_text: "What do you see from here?" },
  delta:      { display_name: "The Delta",      flavor_text: "Where everything pours into." },
  desert:     { display_name: "The Desert",     flavor_text: "Vast quiet is not emptiness." },
  forest:     { display_name: "The Forest",     flavor_text: "Some things only live in shadow." },
  cliff:      { display_name: "The Cliff",      flavor_text: "An edge, not an ending." },
  crossroads: { display_name: "The Crossroads", flavor_text: "Not choosing is still a choice." },
  shore:      { display_name: "The Shore",      flavor_text: "Between the land and the sea." },

  // ── ritual objects ─────────────────────────────────────────────────────────
  incense:   { display_name: "Incense",         flavor_text: "Even the invisible takes form." },
  bell:      { display_name: "The Bell",        flavor_text: "The echo remains after silence." },
  ash:       { display_name: "Ash",             flavor_text: "Gone but still leaving a mark." },
  bowl:      { display_name: "The Bowl",        flavor_text: "Holds without grasping." },
  thread:    { display_name: "The Thread",      flavor_text: "Fragile yet connecting." },
  scroll:    { display_name: "The Scroll",      flavor_text: "Not yet unrolled." },
  hourglass: { display_name: "The Hourglass",   flavor_text: "No one can add more sand." },
  scales:    { display_name: "The Scales",      flavor_text: "Heavy or light — depends how you hold it." },

  // ── geometry ───────────────────────────────────────────────────────────────
  circle:    { display_name: "The Circle",      flavor_text: "No beginning and no end." },
  spiral:    { display_name: "The Spiral",      flavor_text: "Returns, but never the same." },
  crossmark: { display_name: "The Cross",       flavor_text: "Two directions meeting at one point." },
  labyrinth: { display_name: "The Labyrinth",   flavor_text: "The only way is forward." },
  triangle:  { display_name: "The Triangle",    flavor_text: "Three points make a surface." },
  horizon:   { display_name: "The Horizon",     flavor_text: "Always ahead no matter how far you walk." },
  knot:      { display_name: "The Knot",        flavor_text: "Made to be untied." },
  infinity:  { display_name: "Infinity",        flavor_text: "There is no final point." },

  // ── thresholds ─────────────────────────────────────────────────────────────
  threshold:     { display_name: "The Threshold",    flavor_text: "Not yet in, not yet out." },
  ending:        { display_name: "The Ending",       flavor_text: "Every ending opens something else." },
  pause:         { display_name: "The Pause",        flavor_text: "Not acting is still an act." },
  turning_point: { display_name: "The Turning Point",flavor_text: "Before and after are no longer the same." },
  letting_go:    { display_name: "Letting Go",       flavor_text: "Holding on costs more." },
  return:        { display_name: "The Return",       flavor_text: "Not a step backward." },
  waiting:       { display_name: "Waiting",          flavor_text: "Not the same as doing nothing." },
  empty_hand:    { display_name: "Empty Hand",       flavor_text: "Only an open hand can receive." },
};

/** English theme names keyed by theme id. */
export const THEME_NAMES_EN: Record<string, string> = {
  moments:        "Moments",
  elements:       "Elements",
  creatures:      "Kingdom of Creatures",
  celestial:      "Deep Sky",
  landscape:      "Inner Landscape",
  ritual_objects: "Ritual Objects",
  geometry:       "Metaphorical Geometry",
  thresholds:     "Thresholds & Transitions",
};

/** Returns a symbol with locale-appropriate display_name and flavor_text.
 *  Falls back to the original values if no English translation exists. */
export function getLocalizedSymbol<T extends { id: string; display_name: string; flavor_text?: string }>(
  symbol: T,
  locale: string,
): T {
  if (locale !== "en") return symbol;
  const en = SYMBOL_NAMES_EN[symbol.id];
  if (!en) return symbol;
  return {
    ...symbol,
    display_name: en.display_name,
    ...(en.flavor_text !== undefined ? { flavor_text: en.flavor_text } : {}),
  };
}

/** Returns locale-appropriate theme name. Falls back to original name. */
export function getLocalizedThemeName(themeId: string, themeName: string, locale: string): string {
  if (locale !== "en") return themeName;
  return THEME_NAMES_EN[themeId] ?? themeName;
}
