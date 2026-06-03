/**
 * Crisis/distress signal detection for situation input.
 * When detected, AletheiA does NOT continue as a ritual — it shifts to a
 * grounded, safe response that acknowledges the severity and offers real resources.
 *
 * Philosophy: AletheiA knows when NOT to make poetry.
 */

const CRISIS_PATTERNS_VI = [
  /tự\s*tử/i,
  /tự\s*làm\s*đau/i,
  /không\s*muốn\s*sống/i,
  /chết\s*(?:đi|thôi|quách)/i,
  /kết\s*thúc\s*(?:tất\s*cả|mọi\s*thứ)/i,
  /tuyệt\s*vọng\s*quá/i,
  /không\s*còn\s*lối\s*thoát/i,
  /không\s*thể\s*tiếp\s*tục\s*(?:nữa|được)/i,
  /muốn\s*biến\s*mất/i,
  /không\s*ai\s*quan\s*tâm/i,
  /bỏ\s*lại\s*(?:tất\s*cả|mọi\s*thứ)/i,
];

const CRISIS_PATTERNS_EN = [
  /\bsuicide\b/i,
  /\bself[- ]?harm\b/i,
  /\bkill\s+(?:myself|me)\b/i,
  /\bdon'?t\s+want\s+to\s+(?:live|exist)\b/i,
  /\bend\s+(?:it\s+all|my\s+life|everything)\b/i,
  /\bno\s+(?:way\s+out|reason\s+to\s+live)\b/i,
  /\bnot\s+worth\s+(?:living|it)\b/i,
  /\bwant\s+to\s+disappear\b/i,
  /\bgive\s+up\s+on\s+(?:life|everything)\b/i,
];

export function detectCrisis(text: string): boolean {
  if (!text || text.trim().length < 8) return false;
  return (
    CRISIS_PATTERNS_VI.some((p) => p.test(text)) ||
    CRISIS_PATTERNS_EN.some((p) => p.test(text))
  );
}

export const CRISIS_HOTLINES = {
  vi: [
    { name: "Đường dây hỗ trợ sức khỏe tâm thần", number: "1800 599 920", note: "Miễn phí, 24/7" },
    { name: "Tổng đài bảo vệ trẻ em", number: "111", note: "Miễn phí" },
  ],
  en: [
    { name: "Crisis Text Line", number: "Text HOME to 741741", note: "Free, 24/7" },
    { name: "International Association for Suicide Prevention", number: "https://www.iasp.info/resources/Crisis_Centres/", note: "Find local resources" },
  ],
};
