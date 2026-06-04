// Ported from server/_core/interpretationService.ts — keep in sync with server versions.
// Changes to server OUTPUT_HARM_PATTERNS require a matching update here.

// Vietnamese patterns use no \b anchors — \b does not work with Unicode diacritics
// (\b relies on \w/\W which only covers ASCII [a-zA-Z0-9_]).
// English patterns retain \b anchors (pure ASCII).
const LOCAL_HARM_PATTERNS: RegExp[] = [
  /tự\s*tử/i,
  /\bsuicide\b/i,
  /\bkill\s+yourself\b/i,
  /\bself[- ]?harm\b/i,
  /tự\s*làm\s*đau/i,
  /\bno\s+way\s+out\b/i,
  /không\s+có\s+lối\s+thoát/i,
  /chết\s+thôi/i,
];

/**
 * FM1 mitigation: empty string returns false → routes to fallback, never displayed.
 * Ported from server isSafeOutput() — must match server behavior.
 */
export function isSafeLocalOutput(text: string): boolean {
  if (!text.trim()) return false;
  return !LOCAL_HARM_PATTERNS.some((p) => p.test(text));
}

function ensureClosingQuestion(text: string, lang = 'vi'): string {
  const lines = text.trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';
  if (/[*_\[]?.+\?[*_\]]?$/.test(lastLine)) return lines.join('\n\n');
  const q =
    lang === 'en'
      ? '*What feels most true in you right now?*'
      : '*Lúc này điều gì cần được nhìn rõ hơn?*';
  return `${lines.join('\n\n')}\n\n${q}`;
}

/**
 * Port of server finalizeInterpretationText — normalize format + ensure closing question.
 * Run on complete local inference output BEFORE any display.
 */
export function finalizeLocalInterpretation(text: string, lang?: string): string {
  const normalized = text
    .trim()
    .replace(/\[([^\]\n]{3,120}\?)\]/g, '*$1*')
    .replace(/\[Câu hỏi\]/gi, '')
    .replace(/\s+\*/g, '\n\n*');
  return ensureClosingQuestion(normalized.trim(), lang);
}

/** Split finalized text into sentence-level chunks for paced reveal at ~600ms/sentence. */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
