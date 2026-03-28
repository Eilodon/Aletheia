/**
 * Seed Data for Aletheia
 * Bundled sources, passages, themes, and symbols
 */

import { Source, Passage, Theme, Symbol, Tradition, NotificationEntry } from "@/lib/types";

// ============================================================================
// SOURCES
// ============================================================================

export const BUNDLED_SOURCES: Source[] = [
  {
    id: "i_ching",
    name: "I Ching — Kinh Dịch",
    tradition: Tradition.Chinese,
    language: "vi",
    passage_count: 64,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "Điều gì trong tình huống này là không thể thay đổi?",
      "Bạn đang chống lại hay chấp nhận?",
      "Sự thay đổi bắt đầu từ đâu?",
    ],
  },
  {
    id: "tao_te_ching",
    name: "Tao Te Ching — Đạo Đức Kinh",
    tradition: Tradition.Chinese,
    language: "vi",
    passage_count: 81,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "Làm thế nào để bạn có thể hành động mà không cố gắng?",
      "Cái gì mà bạn đang cố gắng kiểm soát?",
      "Sự bất động có thể dạy bạn điều gì?",
    ],
  },
  {
    id: "bible_kjv",
    name: "Bible KJV",
    tradition: Tradition.Christian,
    language: "en",
    passage_count: 100,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "What does this passage reveal about grace?",
      "How does this truth challenge your assumptions?",
      "What invitation is hidden in these words?",
    ],
  },
  {
    id: "hafez_divan",
    name: "Hafez — Divan",
    tradition: Tradition.Islamic,
    language: "vi",
    passage_count: 80,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "Tình yêu nào đang gọi bạn?",
      "Bạn đang tìm kiếm điều gì ở ngoài khi nó ở bên trong?",
      "Nếu bạn không sợ, bạn sẽ làm gì?",
    ],
  },
  {
    id: "rumi_masnavi",
    name: "Rumi — Masnavi",
    tradition: Tradition.Sufi,
    language: "vi",
    passage_count: 75,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "Bạn đang quay vòng quanh cái gì?",
      "Nơi nào là nhà thực sự của bạn?",
      "Tình yêu đang mời bạn đi đâu?",
    ],
  },
  {
    id: "marcus_aurelius",
    name: "Marcus Aurelius — Meditations",
    tradition: Tradition.Stoic,
    language: "en",
    passage_count: 100,
    is_bundled: true,
    is_premium: false,
    fallback_prompts: [
      "What is within your control right now?",
      "How can you practice virtue in this moment?",
      "What would the wise person do?",
    ],
  },
];

// ============================================================================
// PASSAGES (Sample for each source)
// ============================================================================

export const BUNDLED_PASSAGES: Passage[] = [
  // I Ching
  {
    id: "iching_1",
    source_id: "i_ching",
    reference: "Hexagram 1 · 乾 (Qián)",
    text: "The Creative works sublime success, furthering through perseverance.",
    context: "The beginning of all things",
  },
  {
    id: "iching_2",
    source_id: "i_ching",
    reference: "Hexagram 2 · 坤 (Kūn)",
    text: "The Receptive brings about sublime success, furthering through the perseverance of a mare.",
    context: "Receptivity and support",
  },
  {
    id: "iching_3",
    source_id: "i_ching",
    reference: "Hexagram 29 · 坎 (Kǎn)",
    text: "The Abysmal. If you are sincere, you have success in your heart.",
    context: "Danger and the depths",
  },

  // Tao Te Ching
  {
    id: "tao_1",
    source_id: "tao_te_ching",
    reference: "Chapter 1",
    text: "The Tao that can be told is not the eternal Tao. The name that can be named is not the eternal name.",
    context: "The unknowable nature of reality",
  },
  {
    id: "tao_2",
    source_id: "tao_te_ching",
    reference: "Chapter 15",
    text: "The ancient masters were subtle, mysterious, profound, responsive. The depth of their knowledge is unfathomable.",
    context: "Wisdom and mystery",
  },

  // Bible
  {
    id: "bible_1",
    source_id: "bible_kjv",
    reference: "John 1:1",
    text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    context: "The nature of divine presence",
  },
  {
    id: "bible_2",
    source_id: "bible_kjv",
    reference: "Matthew 6:34",
    text: "Therefore take no thought for the morrow: for the morrow shall take thought for the things of itself.",
    context: "Trust and presence",
  },

  // Hafez
  {
    id: "hafez_1",
    source_id: "hafez_divan",
    reference: "Ghazal 1",
    text: "I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.",
    context: "Inner radiance",
  },

  // Rumi
  {
    id: "rumi_1",
    source_id: "rumi_masnavi",
    reference: "Book 1",
    text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.",
    context: "Transcendence and unity",
  },

  // Marcus Aurelius
  {
    id: "marcus_1",
    source_id: "marcus_aurelius",
    reference: "Book 2, Section 1",
    text: "When you wake up, think of this: You will encounter busybodies, ingrates, egomaniacs, liars, the angry, and cranks.",
    context: "Preparation for life",
  },
  {
    id: "marcus_2",
    source_id: "marcus_aurelius",
    reference: "Book 4, Section 3",
    text: "You have power over your mind—not outside events. Realize this, and you will find strength.",
    context: "Inner mastery",
  },
];

// ============================================================================
// THEMES
// ============================================================================

export const BUNDLED_THEMES: Theme[] = [
  {
    id: "moments",
    name: "Khoảnh khắc",
    is_premium: false,
    symbols: [
      { id: "candle", display_name: "Ngọn nến", flavor_text: "Light in darkness" },
      { id: "key", display_name: "Chìa khóa", flavor_text: "Opening what is locked" },
      { id: "dawn", display_name: "Bình minh", flavor_text: "Beginning anew" },
      { id: "mirror", display_name: "Gương", flavor_text: "Reflection of truth" },
      { id: "door", display_name: "Cánh cửa", flavor_text: "Threshold and choice" },
      { id: "bridge", display_name: "Cây cầu", flavor_text: "Connection and passage" },
      { id: "stone", display_name: "Hòn đá", flavor_text: "Stillness and foundation" },
      { id: "water", display_name: "Nước", flavor_text: "Flow and adaptation" },
      { id: "fire", display_name: "Lửa", flavor_text: "Passion and transformation" },
      { id: "wind", display_name: "Gió", flavor_text: "Movement and change" },
      { id: "silence", display_name: "Sự im lặng", flavor_text: "Space for listening" },
      { id: "seed", display_name: "Hạt giống", flavor_text: "Potential waiting" },
    ],
  },
  {
    id: "elements",
    name: "Nguyên tố",
    is_premium: false,
    symbols: [
      { id: "earth", display_name: "Đất", flavor_text: "Grounding and stability" },
      { id: "air", display_name: "Không khí", flavor_text: "Clarity and breath" },
      { id: "metal", display_name: "Kim loại", flavor_text: "Strength and refinement" },
      { id: "wood", display_name: "Gỗ", flavor_text: "Growth and flexibility" },
      { id: "void", display_name: "Khoảng trống", flavor_text: "Emptiness and potential" },
      { id: "light", display_name: "Ánh sáng", flavor_text: "Illumination" },
      { id: "shadow", display_name: "Bóng tối", flavor_text: "Mystery and depth" },
      { id: "thunder", display_name: "Sấm sét", flavor_text: "Sudden awakening" },
      { id: "mountain", display_name: "Núi", flavor_text: "Steadfastness" },
      { id: "valley", display_name: "Thung lũng", flavor_text: "Receptivity" },
      { id: "river", display_name: "Sông", flavor_text: "Continuous flow" },
      { id: "ocean", display_name: "Đại dương", flavor_text: "Vastness and depth" },
    ],
  },
];

// ============================================================================
// NOTIFICATION MATRIX
// ============================================================================

export const NOTIFICATION_MATRIX: NotificationEntry[] = [
  { symbol_id: "candle", question: "Bạn đang thắp sáng hay đang cháy" },
  { symbol_id: "key", question: "Cái gì đang chờ bạn mở" },
  { symbol_id: "dawn", question: "Bạn sẵn sàng cho gì" },
  { symbol_id: "mirror", question: "Bạn thấy gì khi nhìn sâu vào" },
  { symbol_id: "door", question: "Bạn sẽ bước qua hay lùi lại" },
  { symbol_id: "bridge", question: "Bạn đang nối liền những gì" },
  { symbol_id: "stone", question: "Cái gì trong bạn là bất động" },
  { symbol_id: "water", question: "Bạn đang chảy hay đang đứng yên" },
  { symbol_id: "fire", question: "Cái gì trong bạn đang cháy" },
  { symbol_id: "wind", question: "Bạn đang theo hướng nào" },
  { symbol_id: "silence", question: "Bạn có nghe được gì trong im lặng" },
  { symbol_id: "seed", question: "Bạn đang trồng cái gì" },
  { symbol_id: "earth", question: "Bạn cần gì để cảm thấy an toàn" },
  { symbol_id: "air", question: "Bạn cần không gian để làm gì" },
  { symbol_id: "metal", question: "Cái gì cần được tinh chỉnh" },
  { symbol_id: "wood", question: "Bạn đang phát triển như thế nào" },
  { symbol_id: "void", question: "Bạn sợ điều gì trong khoảng trống" },
  { symbol_id: "light", question: "Bạn cần soi sáng cái gì" },
  { symbol_id: "shadow", question: "Bạn đang tránh nhìn vào gì" },
  { symbol_id: "thunder", question: "Bạn sẵn sàng cho sự thay đổi đột ngột" },
  // Add more entries to reach 150 total (simplified for brevity)
];
