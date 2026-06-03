/**
 * Onboarding-specific content — NOT auto-generated.
 * Edit this file directly. Not part of the bundled-content.json pipeline.
 *
 * One preview passage per UserIntent, in two locales.
 * Shown in onboarding step 3 before the user's first real reading.
 */

export type OnboardingPassage = {
  text: string;
  reference: string;
  closingQuestion: string;
};

export const ONBOARDING_PREVIEW_PASSAGES: Record<string, OnboardingPassage> = {
  clarity: {
    text: "Tất cả những gì ngăn cản ta thường là chính bản thân ta.",
    reference: "Marcus Aurelius · Meditations",
    closingQuestion: "Điều gì trong bạn đang tự đặt giới hạn lúc này?",
  },
  comfort: {
    text: "Vết thương là nơi ánh sáng đi vào trong bạn.",
    reference: "Rumi · Masnavi",
    closingQuestion: "Bạn đang bảo vệ vết thương nào mà thực ra nó cần được nhìn thấy?",
  },
  challenge: {
    text: "Nguy nan và cơ hội thường đến cùng một cửa.",
    reference: "Kinh Dịch · Quẻ 29 — Khảm",
    closingQuestion: "Cánh cửa nào bạn đang chần chừ không dám mở?",
  },
  guidance: {
    text: "Nước không tranh với đá, nhưng cuối cùng đá cũng mòn.",
    reference: "Đạo Đức Kinh · Chương 78",
    closingQuestion: "Điều gì đang chảy đúng hướng trong bạn mà bạn chưa tin tưởng?",
  },
};

export const ONBOARDING_PREVIEW_PASSAGES_EN: Record<string, OnboardingPassage> = {
  clarity: {
    text: "Everything that stands in the way is the way.",
    reference: "Marcus Aurelius · Meditations",
    closingQuestion: "What in you is quietly blocking the path right now?",
  },
  comfort: {
    text: "The wound is the place where the light enters you.",
    reference: "Rumi · Masnavi",
    closingQuestion: "Which wound are you protecting that actually needs to be seen?",
  },
  challenge: {
    text: "Danger and opportunity arrive at the same door.",
    reference: "I Ching · Hexagram 29",
    closingQuestion: "Which door are you hesitating to open?",
  },
  guidance: {
    text: "Water does not fight the stone, yet in time the stone wears away.",
    reference: "Tao Te Ching · Chapter 78",
    closingQuestion: "What is already flowing in you that you haven't trusted yet?",
  },
};
