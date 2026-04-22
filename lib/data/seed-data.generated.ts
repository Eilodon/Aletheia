/**
 * Bundled content artifact bridge
 * AUTO-GENERATED - Do not edit manually
 * Source of truth: core/content/bundled-content.json
 */

import type { Passage, Source, Theme, NotificationEntry } from "@/lib/types";

export const BUNDLED_SOURCES = [
  {
    "id": "i_ching",
    "name": "I Ching — Kinh Dịch",
    "tradition": "chinese",
    "language": "vi",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "Điều gì trong tình huống này là không thể thay đổi?",
      "Bạn đang chống lại hay chấp nhận?",
      "Sự thay đổi bắt đầu từ đâu?"
    ],
    "passage_count": 10
  },
  {
    "id": "tao_te_ching",
    "name": "Tao Te Ching — Đạo Đức Kinh",
    "tradition": "chinese",
    "language": "vi",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "Làm thế nào để bạn có thể hành động mà không cố gắng?",
      "Cái gì mà bạn đang cố gắng kiểm soát?",
      "Sự bất động có thể dạy bạn điều gì?"
    ],
    "passage_count": 10
  },
  {
    "id": "bible_kjv",
    "name": "Bible KJV",
    "tradition": "christian",
    "language": "en",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "What does this passage reveal about grace?",
      "How does this truth challenge your assumptions?",
      "What invitation is hidden in these words?"
    ],
    "passage_count": 10
  },
  {
    "id": "hafez_divan",
    "name": "Hafez — Divan",
    "tradition": "islamic",
    "language": "vi",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "Tình yêu nào đang gọi bạn?",
      "Bạn đang tìm kiếm điều gì ở ngoài khi nó ở bên trong?",
      "Nếu bạn không sợ, bạn sẽ làm gì?"
    ],
    "passage_count": 10
  },
  {
    "id": "rumi_masnavi",
    "name": "Rumi — Masnavi",
    "tradition": "sufi",
    "language": "vi",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "Bạn đang quay vòng quanh cái gì?",
      "Nơi nào là nhà thực sự của bạn?",
      "Tình yêu đang mời bạn đi đâu?"
    ],
    "passage_count": 10
  },
  {
    "id": "marcus_aurelius",
    "name": "Marcus Aurelius — Meditations",
    "tradition": "stoic",
    "language": "en",
    "is_bundled": true,
    "is_premium": false,
    "fallback_prompts": [
      "What is within your control right now?",
      "How can you practice virtue in this moment?",
      "What would the wise person do?"
    ],
    "passage_count": 10
  }
] as Source[];

export const BUNDLED_PASSAGES = [
  {
    "id": "iching_1",
    "source_id": "i_ching",
    "reference": "Hexagram 1 · 乾 (Qián)",
    "text": "The Creative works sublime success, furthering through perseverance.",
    "context": "The beginning of all things",
    "resonance_context": "Về sức mạnh của việc không bỏ cuộc dù chưa thấy kết quả. Dành cho user đang mệt mỏi nhưng chưa muốn dừng."
  },
  {
    "id": "iching_2",
    "source_id": "i_ching",
    "reference": "Hexagram 2 · 坤 (Kūn)",
    "text": "The Receptive brings about sublime success, furthering through the perseverance of a mare.",
    "context": "Receptivity and support",
    "resonance_context": "Về việc nhận, không phải đẩy — sức mạnh của sự tiếp nhận. Dành cho user đang cố kiểm soát thay vì để mọi thứ tự đến."
  },
  {
    "id": "iching_3",
    "source_id": "i_ching",
    "reference": "Hexagram 3 · 屯 (Zhūn)",
    "text": "Difficulty at the beginning works supreme success, furthering through perseverance.",
    "context": "Learning how to begin without clarity",
    "resonance_context": "Về việc lộn xộn ban đầu là bình thường, không phải dấu hiệu thất bại. Dành cho user đang bắt đầu điều gì đó và cảm thấy choáng ngợp."
  },
  {
    "id": "iching_4",
    "source_id": "i_ching",
    "reference": "Hexagram 11 · 泰 (Tài)",
    "text": "Peace. The small departs, the great approaches. Good fortune. Success.",
    "context": "When things soften enough to move again",
    "resonance_context": "Về một giai đoạn khi mọi thứ đang chảy đúng hướng. Dành cho user lo lắng sự bình yên hiện tại sẽ không kéo dài."
  },
  {
    "id": "iching_5",
    "source_id": "i_ching",
    "reference": "Hexagram 15 · 謙 (Qiān)",
    "text": "Modesty creates success. The superior person carries things through.",
    "context": "Quiet strength without display",
    "resonance_context": "Về sức mạnh ẩn trong sự khiêm tốn, không phô trương. Dành cho user cảm thấy bị đánh giá thấp hoặc đang cân nhắc có nên thể hiện mình không."
  },
  {
    "id": "iching_6",
    "source_id": "i_ching",
    "reference": "Hexagram 24 · 復 (Fù)",
    "text": "Return. Success. Going out and coming in without error.",
    "context": "Coming back to what is essential",
    "resonance_context": "Về việc quay lại điều cốt lõi sau khi đi lạc. Dành cho user đang cảm thấy xa rời bản thân hoặc cần reset."
  },
  {
    "id": "iching_7",
    "source_id": "i_ching",
    "reference": "Hexagram 29 · 坎 (Kǎn)",
    "text": "The Abysmal. If you are sincere, you have success in your heart.",
    "context": "Danger and the depths",
    "resonance_context": "Về việc tiếp tục dù đang trong vùng nguy hiểm hoặc không chắc chắn. Dành cho user đang trong tình huống áp lực cao."
  },
  {
    "id": "iching_8",
    "source_id": "i_ching",
    "reference": "Hexagram 31 · 咸 (Xián)",
    "text": "Influence. Success. Perseverance furthers.",
    "context": "The moment something touches you before words",
    "resonance_context": "Về việc cảm xúc và ảnh hưởng tác động qua lại tự nhiên. Dành cho user đang trong một mối quan hệ hoặc tình huống cần sự kết nối."
  },
  {
    "id": "iching_9",
    "source_id": "i_ching",
    "reference": "Hexagram 47 · 困 (Kùn)",
    "text": "Oppression. Success. Perseverance. The great person brings about good fortune.",
    "context": "Pressure that asks for inner steadiness",
    "resonance_context": "Về việc giữ phẩm giá khi bị cản trở hoặc bị đè nén. Dành cho user cảm thấy bế tắc bởi hoàn cảnh bên ngoài."
  },
  {
    "id": "iching_10",
    "source_id": "i_ching",
    "reference": "Hexagram 64 · 未濟 (Wèi Jì)",
    "text": "Before completion. Success. The fox gets its tail in the water.",
    "context": "Not finished yet, and that matters",
    "resonance_context": "Về sự bất cẩn ngay khi gần đến đích. Dành cho user đang gần hoàn thành điều gì đó và có nguy cơ mất tập trung."
  },
  {
    "id": "tao_1",
    "source_id": "tao_te_ching",
    "reference": "Chapter 1",
    "text": "The Tao that can be told is not the eternal Tao. The name that can be named is not the eternal name.",
    "context": "The unknowable nature of reality",
    "resonance_context": "Về giới hạn của việc định nghĩa và kiểm soát. Dành cho user đang cố gắng nắm chắc điều gì đó vốn là mơ hồ."
  },
  {
    "id": "tao_2",
    "source_id": "tao_te_ching",
    "reference": "Chapter 8",
    "text": "The highest goodness is like water. Water benefits all things and does not compete.",
    "context": "Softness that nourishes without force",
    "resonance_context": "Về sức mạnh của việc phục vụ mà không tranh giành. Dành cho user đang trong môi trường cạnh tranh và cảm thấy cần phải chiến đấu để tồn tại."
  },
  {
    "id": "tao_3",
    "source_id": "tao_te_ching",
    "reference": "Chapter 15",
    "text": "The ancient masters were subtle, mysterious, profound, responsive. The depth of their knowledge is unfathomable.",
    "context": "Wisdom and mystery",
    "resonance_context": "Về sự khôn ngoan không phô trương của những người thực sự hiểu biết. Dành cho user đang thắc mắc liệu mình có đủ giỏi không."
  },
  {
    "id": "tao_4",
    "source_id": "tao_te_ching",
    "reference": "Chapter 22",
    "text": "Yield and overcome; bend and be straight; empty and be full.",
    "context": "Paradox as a path forward",
    "resonance_context": "Về nghịch lý: con đường vòng đôi khi là con đường ngắn nhất. Dành cho user đang cố đi thẳng qua vấn đề thay vì tìm cách thông minh hơn."
  },
  {
    "id": "tao_5",
    "source_id": "tao_te_ching",
    "reference": "Chapter 24",
    "text": "He who stands on tiptoe is not steady. He who rushes ahead does not go far.",
    "context": "Ambition without ground",
    "resonance_context": "Về việc cố gắng quá mức phản tác dụng. Dành cho user đang tự tạo áp lực để nhanh hơn hoặc tốt hơn một cách không bền vững."
  },
  {
    "id": "tao_6",
    "source_id": "tao_te_ching",
    "reference": "Chapter 33",
    "text": "Knowing others is intelligence; knowing yourself is true wisdom.",
    "context": "Returning attention inward",
    "resonance_context": "Về sự khác biệt giữa thông minh bên ngoài và trí tuệ bên trong. Dành cho user đang so sánh mình với người khác hoặc đang tìm định hướng."
  },
  {
    "id": "tao_7",
    "source_id": "tao_te_ching",
    "reference": "Chapter 37",
    "text": "The Tao never acts, yet nothing is left undone.",
    "context": "Effortlessness that still changes reality",
    "resonance_context": "Về wu wei — hành động mà không cưỡng ép. Dành cho user đang cảm thấy mọi thứ cần sự can thiệp liên tục mới chạy được."
  },
  {
    "id": "tao_8",
    "source_id": "tao_te_ching",
    "reference": "Chapter 44",
    "text": "Fame or integrity: which is more important? Gain or loss: which is more painful?",
    "context": "What it costs to keep holding on",
    "resonance_context": "Về việc biết điều gì thực sự quan trọng với mình. Dành cho user đang đứng trước một lựa chọn giữa giá trị bên ngoài và bên trong."
  },
  {
    "id": "tao_9",
    "source_id": "tao_te_ching",
    "reference": "Chapter 48",
    "text": "In pursuit of knowledge, something is added every day. In pursuit of the Tao, something is dropped every day.",
    "context": "The wisdom of subtraction",
    "resonance_context": "Về việc buông bỏ như một thực hành tích cực. Dành cho user đang cảm thấy quá tải và cần cho phép mình làm ít hơn."
  },
  {
    "id": "tao_10",
    "source_id": "tao_te_ching",
    "reference": "Chapter 76",
    "text": "A person is born gentle and weak. At death he is hard and stiff.",
    "context": "Life belongs to what can still bend",
    "resonance_context": "Về sự cứng nhắc như một dấu hiệu của sợ hãi hay kiệt sức. Dành cho user đang bảo vệ quan điểm hoặc thói quen đến mức không còn linh hoạt."
  },
  {
    "id": "bible_1",
    "source_id": "bible_kjv",
    "reference": "John 1:1",
    "text": "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "context": "The nature of divine presence",
    "resonance_context": "About the creative and constitutive power of language and naming. Relevant when user is struggling to articulate something important or feels unheard."
  },
  {
    "id": "bible_2",
    "source_id": "bible_kjv",
    "reference": "Matthew 6:34",
    "text": "Therefore take no thought for the morrow: for the morrow shall take thought for the things of itself.",
    "context": "Trust and presence",
    "resonance_context": "About releasing pre-emptive anxiety. Relevant when user is spending energy worrying about a future that hasn't arrived yet."
  },
  {
    "id": "bible_3",
    "source_id": "bible_kjv",
    "reference": "Psalm 46:10",
    "text": "Be still, and know that I am God.",
    "context": "Stillness before certainty",
    "resonance_context": "About the invitation to stop striving and simply be present. Relevant when user is overwhelmed by the need to act, fix, or control."
  },
  {
    "id": "bible_4",
    "source_id": "bible_kjv",
    "reference": "Ecclesiastes 3:1",
    "text": "To every thing there is a season, and a time to every purpose under the heaven.",
    "context": "Timing beyond personal urgency",
    "resonance_context": "About trusting timing even when it feels wrong. Relevant when user is pushing against a season they're in rather than moving with it."
  },
  {
    "id": "bible_5",
    "source_id": "bible_kjv",
    "reference": "Isaiah 30:15",
    "text": "In returning and rest shall ye be saved; in quietness and in confidence shall be your strength.",
    "context": "Strength that does not shout",
    "resonance_context": "About the counterintuitive strength found in stillness. Relevant when user feels compelled to keep moving when rest is actually needed."
  },
  {
    "id": "bible_6",
    "source_id": "bible_kjv",
    "reference": "Proverbs 4:23",
    "text": "Keep thy heart with all diligence; for out of it are the issues of life.",
    "context": "Guarding what quietly directs everything",
    "resonance_context": "About the heart as the origin of everything that matters. Relevant when user is focusing on external circumstances while neglecting their inner state."
  },
  {
    "id": "bible_7",
    "source_id": "bible_kjv",
    "reference": "Romans 12:12",
    "text": "Rejoicing in hope; patient in tribulation; continuing instant in prayer.",
    "context": "Holding posture inside strain",
    "resonance_context": "About three stances for difficult times: hope, patience, presence. Relevant when user is in a prolonged hard season and looking for how to endure."
  },
  {
    "id": "bible_8",
    "source_id": "bible_kjv",
    "reference": "2 Corinthians 12:9",
    "text": "My grace is sufficient for thee: for my strength is made perfect in weakness.",
    "context": "The place where weakness stops being failure",
    "resonance_context": "About the paradox where admitting limitation opens a different kind of power. Relevant when user is ashamed of struggling or afraid to be seen as weak."
  },
  {
    "id": "bible_9",
    "source_id": "bible_kjv",
    "reference": "James 1:5",
    "text": "If any of you lack wisdom, let him ask of God, that giveth to all men liberally.",
    "context": "Asking without shame",
    "resonance_context": "About wisdom being available rather than earned. Relevant when user feels unqualified to make a decision or move forward."
  },
  {
    "id": "bible_10",
    "source_id": "bible_kjv",
    "reference": "1 Corinthians 13:12",
    "text": "For now we see through a glass, darkly; but then face to face.",
    "context": "Living with partial sight",
    "resonance_context": "About the partial nature of current understanding. Relevant when user is frustrated by not seeing the full picture of a situation."
  },
  {
    "id": "hafez_1",
    "source_id": "hafez_divan",
    "reference": "Ghazal 1",
    "text": "I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.",
    "context": "Inner radiance",
    "resonance_context": "Về việc quên mất ánh sáng vốn có của chính mình. Dành cho user đang tìm kiếm điều gì đó bên ngoài mà thực ra đã có sẵn bên trong."
  },
  {
    "id": "hafez_2",
    "source_id": "hafez_divan",
    "reference": "Ghazal 12",
    "text": "Stay close to anything that makes you glad you are alive.",
    "context": "Choosing what keeps the soul awake",
    "resonance_context": "Về việc ưu tiên điều thực sự nuôi dưỡng sự sống trong mình. Dành cho user đang lãng phí năng lượng cho những thứ không còn có ý nghĩa."
  },
  {
    "id": "hafez_3",
    "source_id": "hafez_divan",
    "reference": "Ghazal 19",
    "text": "The small man builds cages for everyone he knows, while the sage opens every door.",
    "context": "The difference between fear and generosity",
    "resonance_context": "Về sự khác biệt giữa kiểm soát và tự do. Dành cho user đang trong mối quan hệ hoặc môi trường mang tính kiểm soát."
  },
  {
    "id": "hafez_4",
    "source_id": "hafez_divan",
    "reference": "Ghazal 33",
    "text": "Your heart and my heart are very, very old friends.",
    "context": "Familiarity beneath distance",
    "resonance_context": "Về kết nối vượt thời gian và sự quen thuộc sâu sắc. Dành cho user đang cảm thấy cô đơn hoặc bị ngắt kết nối với người khác."
  },
  {
    "id": "hafez_5",
    "source_id": "hafez_divan",
    "reference": "Ghazal 41",
    "text": "Even after all this time, the sun never says to the earth, You owe me.",
    "context": "Love that gives without accounting",
    "resonance_context": "Về tình yêu và sự cho đi không cần đền đáp. Dành cho user đang kiệt sức vì giữ sổ nợ trong một mối quan hệ."
  },
  {
    "id": "hafez_6",
    "source_id": "hafez_divan",
    "reference": "Ghazal 48",
    "text": "Fear is the cheapest room in the house. I would like to see you living in better conditions.",
    "context": "Moving out of cramped inner rooms",
    "resonance_context": "Về việc sợ hãi như nơi cư trú mặc định và khả năng chuyển đến không gian rộng hơn. Dành cho user đang ra quyết định từ nỗi sợ thay vì từ điều mình muốn."
  },
  {
    "id": "hafez_7",
    "source_id": "hafez_divan",
    "reference": "Ghazal 55",
    "text": "Plant so that your own heart will grow.",
    "context": "Care as cultivation, not performance",
    "resonance_context": "Về việc đầu tư vào điều nuôi dưỡng phần sâu nhất của mình. Dành cho user đang hỏi nên dành thời gian và năng lượng vào đâu."
  },
  {
    "id": "hafez_8",
    "source_id": "hafez_divan",
    "reference": "Ghazal 61",
    "text": "What we speak becomes the house we live in.",
    "context": "Language shaping atmosphere",
    "resonance_context": "Về quyền năng của ngôn ngữ và câu chuyện mình kể về bản thân. Dành cho user đang lặp đi lặp lại một narrative tiêu cực."
  },
  {
    "id": "hafez_9",
    "source_id": "hafez_divan",
    "reference": "Ghazal 70",
    "text": "You have drunk enough of the old wine. Come taste the one poured fresh for this dawn.",
    "context": "The invitation to stop repeating yourself",
    "resonance_context": "Về việc bám víu vào quá khứ ngăn cản trải nghiệm hiện tại. Dành cho user đang so sánh hiện tại với một thời kỳ vàng son đã qua."
  },
  {
    "id": "hafez_10",
    "source_id": "hafez_divan",
    "reference": "Ghazal 84",
    "text": "The beloved has folded a secret inside your longing.",
    "context": "Desire as a clue rather than a wound",
    "resonance_context": "Về việc khao khát bản thân nó là thông điệp, không chỉ là nỗi đau. Dành cho user đang bị giày vò bởi điều mình muốn nhưng chưa có."
  },
  {
    "id": "rumi_1",
    "source_id": "rumi_masnavi",
    "reference": "Book 1",
    "text": "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.",
    "context": "Transcendence and unity",
    "resonance_context": "Về không gian vượt ra ngoài phán xét và đúng sai. Dành cho user đang bị kẹt trong một cuộc tranh luận về ai đúng ai sai."
  },
  {
    "id": "rumi_2",
    "source_id": "rumi_masnavi",
    "reference": "Book 1",
    "text": "The wound is the place where the Light enters you.",
    "context": "Pain as opening",
    "resonance_context": "Về việc tổn thương mở ra thay vì chỉ gây đau. Dành cho user đang cố che giấu hoặc phục hồi sau một vết thương cảm xúc."
  },
  {
    "id": "rumi_3",
    "source_id": "rumi_masnavi",
    "reference": "Book 2",
    "text": "Why are you so busy with this or that or good or bad? Pay attention to how things blend.",
    "context": "Beyond binary certainty",
    "resonance_context": "Về việc chú ý đến toàn bộ thay vì chỉ phân tích các phần. Dành cho user đang overthink và cần nhìn bức tranh lớn hơn."
  },
  {
    "id": "rumi_4",
    "source_id": "rumi_masnavi",
    "reference": "Book 2",
    "text": "What you seek is seeking you.",
    "context": "Longing as reciprocity",
    "resonance_context": "Về tính hai chiều của khao khát — điều ta tìm kiếm cũng đang hướng về ta. Dành cho user cảm thấy đơn độc trong việc theo đuổi điều gì đó."
  },
  {
    "id": "rumi_5",
    "source_id": "rumi_masnavi",
    "reference": "Book 3",
    "text": "Try not to resist life's changes. Let life flow through you.",
    "context": "Yielding without disappearing",
    "resonance_context": "Về sự kháng cự và buông bỏ khi đối mặt với thay đổi không mong muốn. Dành cho user đang trong giai đoạn chuyển tiếp."
  },
  {
    "id": "rumi_6",
    "source_id": "rumi_masnavi",
    "reference": "Book 3",
    "text": "Don't grieve. Anything you lose comes round in another form.",
    "context": "Transformation rather than erasure",
    "resonance_context": "Về sự mất mát như biến đổi, không phải kết thúc. Dành cho user đang đau buồn vì mất điều gì đó hoặc ai đó."
  },
  {
    "id": "rumi_7",
    "source_id": "rumi_masnavi",
    "reference": "Book 4",
    "text": "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
    "context": "Turning effort inward",
    "resonance_context": "Về sự trưởng thành từ muốn thay đổi bên ngoài sang thay đổi bên trong. Dành cho user đang thất vọng vì không thể thay đổi người khác hoặc hoàn cảnh."
  },
  {
    "id": "rumi_8",
    "source_id": "rumi_masnavi",
    "reference": "Book 4",
    "text": "Be melting snow. Wash yourself of yourself.",
    "context": "Softening identity enough to move",
    "resonance_context": "Về việc buông bỏ cái tôi và những giới hạn tự áp đặt. Dành cho user đang bị kẹt trong một bản sắc hoặc câu chuyện cũ về chính mình."
  },
  {
    "id": "rumi_9",
    "source_id": "rumi_masnavi",
    "reference": "Book 5",
    "text": "Silence is the language of God, all else is poor translation.",
    "context": "When quiet says more than explanation",
    "resonance_context": "Về im lặng như nơi ý nghĩa thực sự cư trú. Dành cho user đang quá ồn ào bên trong hoặc cần cho phép mình không nói gì."
  },
  {
    "id": "rumi_10",
    "source_id": "rumi_masnavi",
    "reference": "Book 6",
    "text": "Set your life on fire. Seek those who fan your flames.",
    "context": "Shared aliveness",
    "resonance_context": "Về tầm quan trọng của những người nuôi dưỡng sinh lực trong ta. Dành cho user đang trong môi trường hoặc mối quan hệ khiến họ tắt lửa."
  },
  {
    "id": "marcus_1",
    "source_id": "marcus_aurelius",
    "reference": "Book 2, Section 1",
    "text": "When you wake up, think of this: You will encounter busybodies, ingrates, egomaniacs, liars, the angry, and cranks.",
    "context": "Preparation for life",
    "resonance_context": "About pre-emptive acceptance of difficult people to avoid reactive suffering. Relevant when user is dreading an interaction or feeling betrayed by someone."
  },
  {
    "id": "marcus_2",
    "source_id": "marcus_aurelius",
    "reference": "Book 4, Section 3",
    "text": "You have power over your mind—not outside events. Realize this, and you will find strength.",
    "context": "Inner mastery",
    "resonance_context": "About the Stoic locus of control: what can and cannot be changed. Relevant when user is stuck between wanting something to change and being unable to change it."
  },
  {
    "id": "marcus_3",
    "source_id": "marcus_aurelius",
    "reference": "Book 4, Section 49",
    "text": "Do not act as if you had ten thousand years to throw away.",
    "context": "Mortality as focus",
    "resonance_context": "About urgency without anxiety — acting as if time matters because it does. Relevant when user is procrastinating on something they know is important."
  },
  {
    "id": "marcus_4",
    "source_id": "marcus_aurelius",
    "reference": "Book 5, Section 1",
    "text": "At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work—as a human being.",
    "context": "Duty without drama",
    "resonance_context": "About the discipline of showing up even when motivation is absent. Relevant when user is struggling with low energy or questioning why they should bother."
  },
  {
    "id": "marcus_5",
    "source_id": "marcus_aurelius",
    "reference": "Book 6, Section 30",
    "text": "The best revenge is not to be like your enemy.",
    "context": "Character under provocation",
    "resonance_context": "About integrity as the only response worth giving to those who harm you. Relevant when user feels wronged and is considering retaliation or bitterness."
  },
  {
    "id": "marcus_6",
    "source_id": "marcus_aurelius",
    "reference": "Book 7, Section 54",
    "text": "The impediment to action advances action. What stands in the way becomes the way.",
    "context": "Obstacle as path",
    "resonance_context": "About the Stoic inversion: obstacles are the path, not detours from it. Relevant when user is fighting against a situation instead of working through it."
  },
  {
    "id": "marcus_7",
    "source_id": "marcus_aurelius",
    "reference": "Book 8, Section 36",
    "text": "Do not indulge in dreams of having what you have not, but reckon up the chief of the blessings you do possess.",
    "context": "Returning to what is already here",
    "resonance_context": "About the practice of noticing what is already present. Relevant when user is in a state of dissatisfaction or comparing their life to an imagined better version."
  },
  {
    "id": "marcus_8",
    "source_id": "marcus_aurelius",
    "reference": "Book 9, Section 6",
    "text": "Erase the impression, check the impulse, quench desire, keep the directing mind in its own power.",
    "context": "Interrupting the first reaction",
    "resonance_context": "About the four Stoic disciplines as a complete inner practice. Relevant when user is feeling reactive, impulsive, or overwhelmed by a strong emotion."
  },
  {
    "id": "marcus_9",
    "source_id": "marcus_aurelius",
    "reference": "Book 10, Section 3",
    "text": "No one can prevent you from living as your nature requires.",
    "context": "Freedom inside conditions",
    "resonance_context": "About the inviolable freedom to live according to one's values. Relevant when user feels constrained by others' expectations or external pressures."
  },
  {
    "id": "marcus_10",
    "source_id": "marcus_aurelius",
    "reference": "Book 12, Section 36",
    "text": "Waste no more time arguing what a good man should be. Be one.",
    "context": "Action over self-narration",
    "resonance_context": "About the gap between discussing virtue and practicing it. Relevant when user is caught in analysis or self-justification instead of acting."
  }
] as Passage[];

export const BUNDLED_THEMES = [
  {
    "id": "moments",
    "name": "Khoảnh khắc",
    "is_premium": false,
    "symbols": [
      {
        "id": "candle",
        "display_name": "Ngọn nến",
        "flavor_text": "Light in darkness"
      },
      {
        "id": "key",
        "display_name": "Chìa khóa",
        "flavor_text": "Opening what is locked"
      },
      {
        "id": "dawn",
        "display_name": "Bình minh",
        "flavor_text": "Beginning anew"
      },
      {
        "id": "mirror",
        "display_name": "Gương",
        "flavor_text": "Reflection of truth"
      },
      {
        "id": "door",
        "display_name": "Cánh cửa",
        "flavor_text": "Threshold and choice"
      },
      {
        "id": "bridge",
        "display_name": "Cây cầu",
        "flavor_text": "Connection and passage"
      },
      {
        "id": "stone",
        "display_name": "Hòn đá",
        "flavor_text": "Stillness and foundation"
      },
      {
        "id": "water",
        "display_name": "Nước",
        "flavor_text": "Flow and adaptation"
      },
      {
        "id": "fire",
        "display_name": "Lửa",
        "flavor_text": "Passion and transformation"
      },
      {
        "id": "wind",
        "display_name": "Gió",
        "flavor_text": "Movement and change"
      },
      {
        "id": "silence",
        "display_name": "Sự im lặng",
        "flavor_text": "Space for listening"
      },
      {
        "id": "seed",
        "display_name": "Hạt giống",
        "flavor_text": "Potential waiting"
      }
    ]
  },
  {
    "id": "elements",
    "name": "Nguyên tố",
    "is_premium": false,
    "symbols": [
      {
        "id": "earth",
        "display_name": "Đất",
        "flavor_text": "Grounding and stability"
      },
      {
        "id": "air",
        "display_name": "Không khí",
        "flavor_text": "Clarity and breath"
      },
      {
        "id": "metal",
        "display_name": "Kim loại",
        "flavor_text": "Strength and refinement"
      },
      {
        "id": "wood",
        "display_name": "Gỗ",
        "flavor_text": "Growth and flexibility"
      },
      {
        "id": "void",
        "display_name": "Khoảng trống",
        "flavor_text": "Emptiness and potential"
      },
      {
        "id": "light",
        "display_name": "Ánh sáng",
        "flavor_text": "Illumination"
      },
      {
        "id": "shadow",
        "display_name": "Bóng tối",
        "flavor_text": "Mystery and depth"
      },
      {
        "id": "thunder",
        "display_name": "Sấm sét",
        "flavor_text": "Sudden awakening"
      },
      {
        "id": "mountain",
        "display_name": "Núi",
        "flavor_text": "Steadfastness"
      },
      {
        "id": "valley",
        "display_name": "Thung lũng",
        "flavor_text": "Receptivity"
      },
      {
        "id": "river",
        "display_name": "Sông",
        "flavor_text": "Continuous flow"
      },
      {
        "id": "ocean",
        "display_name": "Ð?i d??ng",
        "flavor_text": "Vastness and depth"
      }
    ]
  }
] as Theme[];

export const NOTIFICATION_MATRIX = [
  {
    "symbol_id": "candle",
    "question": "Bạn đang thắp sáng hay đang cháy"
  },
  {
    "symbol_id": "key",
    "question": "Cái gì đang chờ bạn mở"
  },
  {
    "symbol_id": "dawn",
    "question": "Bạn sẵn sàng cho gì"
  },
  {
    "symbol_id": "mirror",
    "question": "Bạn thấy gì khi nhìn sâu vào"
  },
  {
    "symbol_id": "door",
    "question": "Bạn sẽ bước qua hay lùi lại"
  },
  {
    "symbol_id": "bridge",
    "question": "Bạn đang nối liền những gì"
  },
  {
    "symbol_id": "stone",
    "question": "Cái gì trong bạn là bất động"
  },
  {
    "symbol_id": "water",
    "question": "Bạn đang chảy hay đang đứng yên"
  },
  {
    "symbol_id": "fire",
    "question": "Cái gì trong bạn đang cháy"
  },
  {
    "symbol_id": "wind",
    "question": "Bạn đang theo hướng nào"
  },
  {
    "symbol_id": "silence",
    "question": "Bạn có nghe được gì trong im lặng"
  },
  {
    "symbol_id": "seed",
    "question": "Bạn đang trồng cái gì"
  },
  {
    "symbol_id": "earth",
    "question": "Bạn cần gì để cảm thấy an toàn"
  },
  {
    "symbol_id": "air",
    "question": "Bạn cần không gian để làm gì"
  },
  {
    "symbol_id": "metal",
    "question": "Cái gì cần được tinh chỉnh"
  },
  {
    "symbol_id": "wood",
    "question": "Bạn đang phát triển như thế nào"
  },
  {
    "symbol_id": "void",
    "question": "Bạn sợ điều gì trong khoảng trống"
  },
  {
    "symbol_id": "light",
    "question": "Bạn cần soi sáng cái gì"
  },
  {
    "symbol_id": "shadow",
    "question": "Bạn đang tránh nhìn vào gì"
  },
  {
    "symbol_id": "thunder",
    "question": "Bạn sẵn sàng cho sự thay đổi đột ngột"
  }
] as NotificationEntry[];
