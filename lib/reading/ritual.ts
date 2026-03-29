export const PASSAGE_REVEAL_CHARS_PER_SECOND = 45;
export const PASSAGE_ACTION_DELAY_MS = 3_000;
export const AUTO_SAVE_DELAY_MS = 30_000;
export const COMPLETE_SILENCE_BEAT_MS = 4_000; // UX-04: silence beat before home screen

// UX-05: Skip button reframe - user acknowledges uncertainty instead of dismissing
export const SITUATION_SKIP_TEXT_VI = "Tôi chưa biết mình đang nghĩ gì";
export const SITUATION_SKIP_TEXT_EN = "I'm not sure yet";

// AI-04: Phrase-based reveal timing (ms delays after punctuation)
export const PHRASE_PAUSE_COMMA_MS = 80;
export const PHRASE_PAUSE_PERIOD_MS = 200;
export const PHRASE_PAUSE_OTHER_MS = 40;

export type PassageRevealStep = {
  text: string;
  delayMs: number;
};

/**
 * AI-04: Build phrase-based reveal steps instead of word-by-word
 * Adds micro-pauses after punctuation for natural reading rhythm
 */
export function buildPassageRevealSteps(text: string): PassageRevealStep[] {
  // Split by punctuation to create semantic chunks
  const segments = text.split(/([,.;:!?])/);
  const steps: PassageRevealStep[] = [];
  let current = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "") continue;

    current += segment;
    steps.push({
      text: current,
      delayMs: getPhraseDelay(segment),
    });
  }

  return steps;
}

function getPhraseDelay(segment: string): number {
  const lastChar = segment.trim().slice(-1);
  switch (lastChar) {
    case ",":
      return PHRASE_PAUSE_COMMA_MS;
    case ".":
    case "!":
    case "?":
    case ";":
    case ":":
      return PHRASE_PAUSE_PERIOD_MS;
    default:
      return PHRASE_PAUSE_OTHER_MS;
  }
}
