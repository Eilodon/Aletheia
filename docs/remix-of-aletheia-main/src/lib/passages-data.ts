import type { Source, Passage, Symbol } from "./reading-types";

// ═══ Symbol definitions (language-independent) ═══
export const ALL_SYMBOLS: Symbol[] = [
  { id: "s1", i18nKey: "fire", icon: "fire" },
  { id: "s2", i18nKey: "water", icon: "water" },
  { id: "s3", i18nKey: "mirror", icon: "mirror" },
  { id: "s4", i18nKey: "root", icon: "root" },
  { id: "s5", i18nKey: "moon", icon: "moon" },
  { id: "s6", i18nKey: "door", icon: "door" },
  { id: "s7", i18nKey: "serpent", icon: "serpent" },
  { id: "s8", i18nKey: "chalice", icon: "chalice" },
  { id: "s9", i18nKey: "star", icon: "star" },
];

// ═══ Sources (6 bundled, all free) ═══
export const ALL_SOURCES: Source[] = [
  {
    id: "i_ching",
    name: "I Ching — Kinh Dịch",
    tradition: "chinese",
    language: "vi",
    i18nKey: "source.i_ching",
    premium: false,
    description: "Kinh Dịch — 64 quẻ biến hóa vô cùng",
  },
  {
    id: "tao_te_ching",
    name: "Tao Te Ching — Đạo Đức Kinh",
    tradition: "chinese",
    language: "vi",
    i18nKey: "source.tao_te_ching",
    premium: false,
    description: "81 chương về Đạo và Đức",
  },
  {
    id: "bible_kjv",
    name: "Bible KJV",
    tradition: "christian",
    language: "en",
    i18nKey: "source.bible_kjv",
    premium: false,
    description: "King James Version — timeless wisdom",
  },
  {
    id: "hafez_divan",
    name: "Hafez — Divan",
    tradition: "islamic",
    language: "vi",
    i18nKey: "source.hafez_divan",
    premium: false,
    description: "Thơ Hafez — tiếng nói của tình yêu thần bí",
  },
  {
    id: "rumi_masnavi",
    name: "Rumi — Masnavi",
    tradition: "sufi",
    language: "vi",
    i18nKey: "source.rumi_masnavi",
    premium: false,
    description: "Rumi — đại dương tâm linh Sufi",
  },
  {
    id: "marcus_aurelius",
    name: "Marcus Aurelius — Meditations",
    tradition: "stoic",
    language: "vi",
    i18nKey: "source.marcus_aurelius",
    premium: false,
    description: "Suy niệm của vị hoàng đế triết gia",
  },
];

// ═══ Passages organized by source ═══

export interface SourcePassages {
  vi: Record<string, Passage[]>;
  en: Record<string, Passage[]>;
}

const SOURCE_PASSAGES: SourcePassages = {
  vi: {
    i_ching: [
      { id: "ic-1", sourceId: "i_ching", text: "Trời vận hành mạnh mẽ. Người quân tử lấy đó mà tự cường không ngừng.", reference: "Kinh Dịch — Quẻ Càn", context: "Quẻ Càn tượng trưng cho sức mạnh sáng tạo nguyên thủy, nguồn năng lượng bất tận." },
      { id: "ic-2", sourceId: "i_ching", text: "Đất thế khôn, người quân tử lấy đức dày mà chở muôn vật.", reference: "Kinh Dịch — Quẻ Khôn", context: "Quẻ Khôn dạy về sức mạnh của sự tiếp nhận và nuôi dưỡng." },
      { id: "ic-3", sourceId: "i_ching", text: "Nước đọng trên núi: tượng quẻ Mông. Người quân tử lấy hành vi quả đoán mà nuôi đức.", reference: "Kinh Dịch — Quẻ Mông", context: "Quẻ Mông nói về sự khởi đầu non trẻ và giá trị của sự dẫn dắt." },
      { id: "ic-4", sourceId: "i_ching", text: "Gió thổi trên mặt nước: tượng quẻ Hoán. Tan rã để rồi hội tụ — đó là quy luật.", reference: "Kinh Dịch — Quẻ Hoán", context: "Quẻ Hoán dạy rằng sự phân tán đôi khi là bước cần thiết trước khi đoàn tụ." },
      { id: "ic-5", sourceId: "i_ching", text: "Sấm vang trên đất: tượng quẻ Dự. Tiên vương dựng nhạc để tôn đức, dâng lên Thượng Đế.", reference: "Kinh Dịch — Quẻ Dự", context: "Quẻ Dự nói về niềm vui và sự nhiệt tình được dùng đúng cách." },
    ],
    tao_te_ching: [
      { id: "ttc-1", sourceId: "tao_te_ching", text: "Nước mềm nhất thế gian, nhưng lại xuyên qua thứ cứng nhất. Vô hình mà có thể đi vào mọi kẽ hở. Ta biết rằng: cái mềm thắng cái cứng.", reference: "Đạo Đức Kinh — chương 78, Lão Tử", context: "Lão Tử dùng hình ảnh nước để nói về sức mạnh của sự mềm mại." },
      { id: "ttc-2", sourceId: "tao_te_ching", text: "Đạo mà nói được thì không phải Đạo thường. Tên mà gọi được thì không phải tên thường.", reference: "Đạo Đức Kinh — chương 1, Lão Tử", context: "Chương mở đầu về bản chất không thể diễn đạt của Đạo." },
      { id: "ttc-3", sourceId: "tao_te_ching", text: "Biết người là khôn, biết mình là sáng. Thắng người là có sức, thắng mình là mạnh.", reference: "Đạo Đức Kinh — chương 33, Lão Tử", context: "Lão Tử đề cao sự tự biết và tự thắng hơn mọi chiến thắng bên ngoài." },
      { id: "ttc-4", sourceId: "tao_te_ching", text: "Đại trực như khuất, đại xảo như vụng, đại biện như nín. Cái hoàn hảo nhất trông như khiếm khuyết.", reference: "Đạo Đức Kinh — chương 45, Lão Tử", context: "Sự hoàn hảo thật sự không cần phô trương." },
      { id: "ttc-5", sourceId: "tao_te_ching", text: "Hành trình ngàn dặm bắt đầu từ một bước chân. Cây lớn mọc từ mầm nhỏ.", reference: "Đạo Đức Kinh — chương 64, Lão Tử", context: "Lão Tử nhắc về giá trị của những khởi đầu nhỏ bé." },
    ],
    bible_kjv: [
      { id: "bib-1", sourceId: "bible_kjv", text: "Có lúc khóc và có lúc cười. Có lúc than và có lúc nhảy. Mọi sự đều có thì, mọi việc dưới trời đều có lúc.", reference: "Truyền Đạo 3:1-4", context: "Sách Truyền Đạo nói về sự tuần hoàn của đời sống." },
      { id: "bib-2", sourceId: "bible_kjv", text: "Yên lặng ta, và hãy biết rằng Ta là Đức Chúa Trời.", reference: "Thi Thiên 46:10", context: "Lời kêu gọi buông bỏ và tin tưởng trong yên tĩnh." },
      { id: "bib-3", sourceId: "bible_kjv", text: "Dù ta đi qua thung lũng bóng chết, ta không sợ tai họa nào, vì Ngài ở cùng ta.", reference: "Thi Thiên 23:4", context: "Bài ca về sự đồng hành trong những lúc tăm tối nhất." },
      { id: "bib-4", sourceId: "bible_kjv", text: "Hãy xin, sẽ cho các ngươi; hãy tìm, sẽ gặp; hãy gõ, cửa sẽ mở.", reference: "Ma-thi-ơ 7:7", context: "Lời hứa về sự tìm kiếm chân thành." },
      { id: "bib-5", sourceId: "bible_kjv", text: "Tình yêu hay nhẫn nhục, tình yêu hay nhân từ. Tình yêu không ghen tị, không khoe khoang, không kiêu ngạo.", reference: "I Cô-rinh-tô 13:4", context: "Định nghĩa kinh điển về tình yêu đích thực." },
    ],
    hafez_divan: [
      { id: "haf-1", sourceId: "hafez_divan", text: "Tình yêu ban đầu dường như dễ dàng, nhưng rồi bao khó khăn ập đến. Xin chào, hỡi người lữ hành — con đường này không dành cho kẻ yếu đuối.", reference: "Hafez — Divan, Ghazal 1", context: "Hafez mở đầu Divan bằng lời cảnh báo về con đường tình yêu thần bí." },
      { id: "haf-2", sourceId: "hafez_divan", text: "Cả thế giới chỉ là một câu chuyện ngắn về tình yêu, được viết đi viết lại dưới mỗi tán cây.", reference: "Hafez — Divan, Ghazal 14", context: "Hafez nhìn vạn vật qua lăng kính tình yêu." },
      { id: "haf-3", sourceId: "hafez_divan", text: "Đừng buồn, mọi thứ tạm thời đều sẽ qua. Những gì khiến tim bạn run rẩy sẽ biến mất như giấc mơ.", reference: "Hafez — Divan, Ghazal 29", context: "Lời an ủi về tính vô thường của khổ đau." },
      { id: "haf-4", sourceId: "hafez_divan", text: "Ta đã học được sự im lặng từ kẻ hay nói, sự khoan dung từ kẻ bất khoan dung, và lòng tốt từ kẻ thiếu tử tế.", reference: "Hafez — Divan, Ghazal 47", context: "Mọi người đều là thầy — kể cả qua ví dụ ngược." },
      { id: "haf-5", sourceId: "hafez_divan", text: "Hãy nhảy khi bạn tan vỡ. Hãy nhảy trong sự đau đớn. Hãy nhảy khi bạn hoàn toàn tự do.", reference: "Hafez — Divan, Ghazal 88", context: "Hafez mời gọi sự giải phóng qua chuyển động và buông bỏ." },
    ],
    rumi_masnavi: [
      { id: "rum-1", sourceId: "rumi_masnavi", text: "Vết thương là nơi ánh sáng đi vào bạn. Đừng quay lưng lại với nỗi đau — hãy mở cửa cho nó.", reference: "Rumi — Masnavi, Quyển III", context: "Rumi tin rằng đau khổ là con đường dẫn đến giác ngộ." },
      { id: "rum-2", sourceId: "rumi_masnavi", text: "Bạn không phải giọt nước trong đại dương. Bạn là cả đại dương trong một giọt nước.", reference: "Rumi — Masnavi, Quyển II", context: "Sự rộng lớn vô hạn ẩn trong mỗi cá nhân." },
      { id: "rum-3", sourceId: "rumi_masnavi", text: "Sự im lặng là ngôn ngữ của Thượng đế. Mọi thứ khác chỉ là bản dịch tồi.", reference: "Rumi — Masnavi, Quyển I", context: "Rumi đề cao sự tĩnh lặng như con đường tiếp cận chân lý." },
      { id: "rum-4", sourceId: "rumi_masnavi", text: "Đừng tìm kiếm tình yêu. Hãy chỉ tìm và phá bỏ mọi rào cản bạn đã dựng lên để chống lại nó.", reference: "Rumi — Masnavi, Quyển I", context: "Tình yêu không cần tìm — chỉ cần dọn đường cho nó." },
      { id: "rum-5", sourceId: "rumi_masnavi", text: "Ngày hôm qua tôi thông minh nên muốn thay đổi thế giới. Hôm nay tôi khôn ngoan nên đang thay đổi bản thân.", reference: "Rumi — Masnavi, Quyển IV", context: "Sự chuyển hóa bắt đầu từ bên trong." },
    ],
    marcus_aurelius: [
      { id: "ma-1", sourceId: "marcus_aurelius", text: "Hãy kiểm soát tâm trí, nếu không nó sẽ kiểm soát bạn. Nội tâm là pháo đài bất khả xâm phạm.", reference: "Suy Niệm — Marcus Aurelius, Quyển VI", context: "Hoàng đế triết gia dạy về sức mạnh của kỷ luật nội tâm." },
      { id: "ma-2", sourceId: "marcus_aurelius", text: "Trở ngại trên đường đi trở thành con đường. Những gì cản trở hành động lại thúc đẩy hành động.", reference: "Suy Niệm — Marcus Aurelius, Quyển V", context: "Câu nổi tiếng nhất của Marcus: chướng ngại chính là con đường." },
      { id: "ma-3", sourceId: "marcus_aurelius", text: "Bạn có quyền lựa chọn — không phải về hoàn cảnh, mà về cách bạn phản ứng. Đó là tự do thực sự.", reference: "Suy Niệm — Marcus Aurelius, Quyển VII", context: "Triết học Khắc kỷ: phân biệt giữa điều có thể và không thể kiểm soát." },
      { id: "ma-4", sourceId: "marcus_aurelius", text: "Khi bạn thức dậy, hãy nghĩ: hôm nay tôi có đặc ân được sống. Tôi có thể suy nghĩ, cảm nhận, và yêu thương.", reference: "Suy Niệm — Marcus Aurelius, Quyển II", context: "Lời nhắc về sự biết ơn mỗi sáng thức dậy." },
      { id: "ma-5", sourceId: "marcus_aurelius", text: "Sự giàu có thật sự nằm ở việc cần rất ít. Cắt bỏ nhu cầu, bạn sẽ tìm thấy sự tự do.", reference: "Suy Niệm — Marcus Aurelius, Quyển IV", context: "Marcus thực hành sự giản dị dù là hoàng đế La Mã." },
    ],
  },
  en: {
    i_ching: [
      { id: "ic-1", sourceId: "i_ching", text: "Heaven moves with vigor. The superior person ceaselessly strengthens themselves.", reference: "I Ching — Hexagram Qian (The Creative)", context: "Hexagram Qian represents the primal creative power, an inexhaustible source of energy." },
      { id: "ic-2", sourceId: "i_ching", text: "The earth's condition is receptive devotion. The superior person carries all things with great virtue.", reference: "I Ching — Hexagram Kun (The Receptive)", context: "Hexagram Kun teaches the strength of receptivity and nurturing." },
      { id: "ic-3", sourceId: "i_ching", text: "Water over the mountain: the image of Youthful Folly. The superior person cultivates character through decisive action.", reference: "I Ching — Hexagram Meng (Youthful Folly)", context: "Hexagram Meng speaks of new beginnings and the value of guidance." },
      { id: "ic-4", sourceId: "i_ching", text: "Wind blows over the water: the image of Dispersion. To scatter and then gather — that is the law.", reference: "I Ching — Hexagram Huan (Dispersion)", context: "Hexagram Huan teaches that dispersal can be necessary before reunion." },
      { id: "ic-5", sourceId: "i_ching", text: "Thunder over the earth: the image of Enthusiasm. The ancient kings made music to honor virtue.", reference: "I Ching — Hexagram Yu (Enthusiasm)", context: "Hexagram Yu speaks of joy and enthusiasm used wisely." },
    ],
    tao_te_ching: [
      { id: "ttc-1", sourceId: "tao_te_ching", text: "Nothing in the world is as soft and yielding as water. Yet for dissolving the hard and inflexible, nothing can surpass it. The soft overcomes the hard.", reference: "Tao Te Ching — Chapter 78, Lao Tzu", context: "Lao Tzu uses water as a metaphor for the power of softness." },
      { id: "ttc-2", sourceId: "tao_te_ching", text: "The Tao that can be told is not the eternal Tao. The name that can be named is not the eternal name.", reference: "Tao Te Ching — Chapter 1, Lao Tzu", context: "The opening chapter on the ineffable nature of the Tao." },
      { id: "ttc-3", sourceId: "tao_te_ching", text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.", reference: "Tao Te Ching — Chapter 33, Lao Tzu", context: "Lao Tzu values self-knowledge above all external victories." },
      { id: "ttc-4", sourceId: "tao_te_ching", text: "True perfection seems imperfect. True fullness seems empty. True straightness seems bent. True skill seems clumsy.", reference: "Tao Te Ching — Chapter 45, Lao Tzu", context: "Real perfection does not need to show itself." },
      { id: "ttc-5", sourceId: "tao_te_ching", text: "A journey of a thousand miles begins with a single step. A great tree grows from a tiny sprout.", reference: "Tao Te Ching — Chapter 64, Lao Tzu", context: "Lao Tzu reminds us of the value of small beginnings." },
    ],
    bible_kjv: [
      { id: "bib-1", sourceId: "bible_kjv", text: "To every thing there is a season, and a time to every purpose under the heaven. A time to weep, and a time to laugh.", reference: "Ecclesiastes 3:1-4 (KJV)", context: "Ecclesiastes speaks of the cycles of life." },
      { id: "bib-2", sourceId: "bible_kjv", text: "Be still, and know that I am God.", reference: "Psalm 46:10 (KJV)", context: "A call to release and trust in silence." },
      { id: "bib-3", sourceId: "bible_kjv", text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.", reference: "Psalm 23:4 (KJV)", context: "A song of companionship in the darkest times." },
      { id: "bib-4", sourceId: "bible_kjv", text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.", reference: "Matthew 7:7 (KJV)", context: "The promise of sincere seeking." },
      { id: "bib-5", sourceId: "bible_kjv", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", reference: "1 Corinthians 13:4 (KJV)", context: "The classic definition of true love." },
    ],
    hafez_divan: [
      { id: "haf-1", sourceId: "hafez_divan", text: "Love seemed easy at first, but then so many hardships came. Greetings, traveler — this road is not for the faint of heart.", reference: "Hafez — Divan, Ghazal 1", context: "Hafez opens his Divan with a warning about the path of mystical love." },
      { id: "haf-2", sourceId: "hafez_divan", text: "The whole world is but a short story of love, rewritten under every tree.", reference: "Hafez — Divan, Ghazal 14", context: "Hafez sees all things through the lens of love." },
      { id: "haf-3", sourceId: "hafez_divan", text: "Don't be sad. Everything temporary will pass. What makes your heart tremble will vanish like a dream.", reference: "Hafez — Divan, Ghazal 29", context: "Consolation about the impermanence of suffering." },
      { id: "haf-4", sourceId: "hafez_divan", text: "I have learned silence from the talkative, tolerance from the intolerant, and kindness from the unkind.", reference: "Hafez — Divan, Ghazal 47", context: "Everyone is a teacher — even through negative example." },
      { id: "haf-5", sourceId: "hafez_divan", text: "Dance when you are broken. Dance in your pain. Dance when you are perfectly free.", reference: "Hafez — Divan, Ghazal 88", context: "Hafez invites liberation through movement and surrender." },
    ],
    rumi_masnavi: [
      { id: "rum-1", sourceId: "rumi_masnavi", text: "The wound is the place where the Light enters you. Don't turn away from pain — open the door for it.", reference: "Rumi — Masnavi, Book III", context: "Rumi believed suffering is the path to awakening." },
      { id: "rum-2", sourceId: "rumi_masnavi", text: "You are not a drop in the ocean. You are the entire ocean in a drop.", reference: "Rumi — Masnavi, Book II", context: "The infinite vastness hidden within each individual." },
      { id: "rum-3", sourceId: "rumi_masnavi", text: "Silence is the language of God. Everything else is a poor translation.", reference: "Rumi — Masnavi, Book I", context: "Rumi exalts silence as the path to truth." },
      { id: "rum-4", sourceId: "rumi_masnavi", text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", reference: "Rumi — Masnavi, Book I", context: "Love doesn't need to be found — just cleared a path for." },
      { id: "rum-5", sourceId: "rumi_masnavi", text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", reference: "Rumi — Masnavi, Book IV", context: "Transformation begins within." },
    ],
    marcus_aurelius: [
      { id: "ma-1", sourceId: "marcus_aurelius", text: "You have power over your mind — not outside events. Realize this, and you will find strength.", reference: "Meditations — Marcus Aurelius, Book VI", context: "The philosopher-emperor teaches the power of inner discipline." },
      { id: "ma-2", sourceId: "marcus_aurelius", text: "The impediment to action advances action. What stands in the way becomes the way.", reference: "Meditations — Marcus Aurelius, Book V", context: "Marcus' most famous insight: the obstacle is the way." },
      { id: "ma-3", sourceId: "marcus_aurelius", text: "You always own the option of having no opinion. Choose not to be harmed — and you won't feel harmed.", reference: "Meditations — Marcus Aurelius, Book VII", context: "Stoic philosophy: distinguish between what you can and cannot control." },
      { id: "ma-4", sourceId: "marcus_aurelius", text: "When you arise in the morning, think of what a privilege it is to be alive, to think, to enjoy, to love.", reference: "Meditations — Marcus Aurelius, Book II", context: "A reminder of gratitude each morning." },
      { id: "ma-5", sourceId: "marcus_aurelius", text: "Wealth consists not in having great possessions, but in having few wants.", reference: "Meditations — Marcus Aurelius, Book IV", context: "Marcus practiced simplicity despite being Roman Emperor." },
    ],
  },
};

// ═══ Legacy passages (backward compat for existing symbol-based flow) ═══

export const PASSAGES_VI: Record<string, Passage> = {
  s1: { text: "Ngọn lửa không hỏi ai xứng đáng được sưởi ấm. Nó cháy — và thế là đủ. Bạn cũng vậy: đừng chờ ai cho phép bạn tỏa sáng.", reference: "Thư gửi người trẻ, Rilke — phỏng dịch", context: "Rilke viết về sự dũng cảm của việc sống thật với chính mình." },
  s2: { text: "Nước mềm nhất thế gian, nhưng lại xuyên qua thứ cứng nhất. Vô hình mà có thể đi vào mọi kẽ hở.", reference: "Đạo Đức Kinh — chương 78, Lão Tử", context: "Lão Tử dùng hình ảnh nước để nói về sức mạnh của sự mềm mại." },
  s3: { text: "Người ta không thể nhìn thấy mình bằng cách nhìn vào ánh sáng. Chỉ khi quay lại và đối mặt với bóng tối, ta mới thấy rõ.", reference: "Tâm lý học chiều sâu — Carl Jung, phỏng dịch", context: "Jung tin rằng sự chữa lành bắt đầu từ việc đối mặt với 'bóng'." },
  s4: { text: "Cây đứng vững không phải nhờ thân cao, mà nhờ rễ sâu. Muốn vươn lên trời, trước hết phải bám vào đất.", reference: "Châm ngôn cổ phương Đông", context: "Biểu tượng rễ cây nhắc rằng nền tảng vững chắc quan trọng hơn sự vươn cao." },
  s5: { text: "Mặt trăng không tạo ra ánh sáng riêng — nó phản chiếu. Và chính sự phản chiếu ấy lại soi sáng cả bầu trời đêm.", reference: "Thiền luận — D.T. Suzuki, phỏng dịch", context: "Suzuki dùng hình ảnh trăng để nói về bản chất của trí tuệ." },
  s6: { text: "Mỗi kết thúc là một cánh cửa. Bạn không thể bước qua nếu vẫn quay lưng.", reference: "Hành trình của anh hùng — Joseph Campbell, phỏng dịch", context: "Campbell mô tả ngưỡng cửa là khoảnh khắc quyết định." },
  s7: { text: "Con rắn lột da không phải vì muốn mới — mà vì bộ da cũ không còn chứa nổi nó.", reference: "Biểu tượng học — Mircea Eliade, phỏng dịch", context: "Eliade phân tích biểu tượng rắn như hiện thân của sự tái sinh." },
  s8: { text: "Chỉ khi chén rỗng, nó mới sẵn sàng đón nhận. Buông bỏ không phải mất đi — mà là tạo không gian.", reference: "Thiền ngữ — truyền thống Zen", context: "Câu chuyện kinh điển về tách trà đầy." },
  s9: { text: "Ngôi sao chỉ hướng, không mang bạn đến đích. Con đường vẫn phải do chính bạn bước đi.", reference: "Suy niệm — Marcus Aurelius, phỏng dịch", context: "Marcus Aurelius tin rằng hướng dẫn bên ngoài chỉ là la bàn." },
};

export const PASSAGES_EN: Record<string, Passage> = {
  s1: { text: "The flame does not ask who deserves its warmth. It burns — and that is enough. So are you: don't wait for permission to shine.", reference: "Letters to a Young Poet — Rilke, adapted", context: "Rilke writes about the courage of living true to oneself." },
  s2: { text: "Nothing in the world is as soft and yielding as water. Yet for dissolving the hard and inflexible, nothing can surpass it.", reference: "Tao Te Ching — Chapter 78, Lao Tzu", context: "Lao Tzu uses water as a metaphor for the power of softness." },
  s3: { text: "One does not become enlightened by imagining figures of light, but by making the darkness conscious.", reference: "Depth Psychology — Carl Jung", context: "Jung believed healing begins by confronting the 'shadow'." },
  s4: { text: "A tree stands firm not because of its tall trunk, but because of its deep roots.", reference: "Ancient Eastern Proverb", context: "The root symbol reminds us that a strong foundation matters." },
  s5: { text: "The moon creates no light of its own — it reflects. And yet that very reflection illuminates the entire night sky.", reference: "Essays in Zen Buddhism — D.T. Suzuki", context: "Suzuki uses the moon to speak of the nature of wisdom." },
  s6: { text: "Every ending is a doorway. You cannot step through if you keep turning away.", reference: "The Hero's Journey — Joseph Campbell", context: "Campbell describes the threshold as the decisive moment." },
  s7: { text: "The serpent sheds its skin not because it wants novelty — but because the old skin can no longer contain it.", reference: "Patterns in Symbolism — Mircea Eliade", context: "Eliade analyzes the serpent as the embodiment of endless rebirth." },
  s8: { text: "Only when the cup is empty can it receive. Letting go is not losing — it is making space.", reference: "Zen Teaching — Traditional", context: "The classic story of the overflowing teacup." },
  s9: { text: "The star points the way but does not carry you there. The path must still be walked by you.", reference: "Meditations — Marcus Aurelius, adapted", context: "Marcus Aurelius believed external guidance is merely a compass." },
};

export const AI_RESPONSES_VI: Record<string, string> = {
  s1: "Đoạn trích này đang nhắc bạn: bạn không cần xin phép ai để sống đúng với mình. Ngọn lửa bên trong bạn không cần lý do — nó tồn tại vì bạn tồn tại. Nếu bạn đang chờ đợi một tín hiệu, thì đây chính là nó. Hãy bắt đầu — không hoàn hảo, nhưng thật.",
  s2: "Nước không chiến đấu, nhưng nước chiến thắng. Có lẽ bạn đang cố ép buộc một kết quả, đang dùng sức mạnh để thay đổi điều không thể bẻ gãy. Thử cách khác: kiên nhẫn, mềm mại, và nhất quán. Thời gian đứng về phía bạn.",
  s3: "Jung nói rằng cái bạn chống lại sẽ tồn tại dai dẳng, còn cái bạn chấp nhận sẽ chuyển hóa. Nếu có điều gì bạn đang tránh nhìn vào — một cảm xúc, một ký ức, một sự thật — đây là lúc quay lại và đối diện.",
  s4: "Rễ cây không ai thấy, nhưng nó quyết định mọi thứ. Có lẽ bạn đang so sánh mình với những cái cây đã cao — mà quên rằng rễ của bạn đang âm thầm bám sâu. Hãy kiên nhẫn với quá trình này.",
  s5: "Trăng nhắc bạn rằng không phải lúc nào cũng cần tự tạo ra ánh sáng. Đôi khi, vai trò của bạn là phản chiếu — lắng nghe, quan sát, đón nhận.",
  s6: "Cánh cửa này đang chờ bạn. Không phải ngẫu nhiên bạn đứng ở ngưỡng này — có điều gì đó bạn biết cần phải thay đổi. Sợ hãi là bình thường.",
  s7: "Lột xác luôn đau. Nhưng con rắn không tiếc bộ da cũ — vì nó biết mình đã lớn hơn nó. Nếu bạn đang trải qua thay đổi khó khăn, hãy nhớ: đau không có nghĩa là sai.",
  s8: "Chén rỗng không phải là thiếu — mà là sẵn sàng. Nếu bạn đang cảm thấy trống rỗng, có lẽ đó không phải mất mát, mà là không gian.",
  s9: "Ngôi sao không đi cùng bạn — nó chỉ soi đường. Bạn đã có hướng đi, nhưng có lẽ bạn đang chờ ai đó xác nhận. Tin vào hướng bạn đã chọn.",
};

export const AI_RESPONSES_EN: Record<string, string> = {
  s1: "This passage reminds you: you don't need anyone's permission to live authentically. The flame inside you needs no reason — it exists because you exist.",
  s2: "Water doesn't fight, yet water wins. Perhaps you're trying to force an outcome. Try another way: patience, softness, and consistency.",
  s3: "Jung said that what you resist persists, and what you accept transforms. If there's something you're avoiding, now is the time to turn and face it.",
  s4: "No one sees the roots, yet they determine everything. Perhaps you're comparing yourself to trees that have already grown tall.",
  s5: "The moon reminds you that you don't always need to create your own light. Sometimes your role is to reflect — to listen, observe, receive.",
  s6: "This door is waiting for you. It's no accident you're standing at this threshold — there's something you know needs to change.",
  s7: "Shedding always hurts. But the serpent doesn't mourn its old skin — it knows it has outgrown it.",
  s8: "An empty cup isn't lacking — it's ready. If you're feeling hollow, perhaps it's not loss but space.",
  s9: "The star doesn't walk with you — it only lights the way. You already have a direction.",
};

// ═══ Helper: get passages for a source ═══

export function getSourcePassages(sourceId: string, lang: "vi" | "en"): Passage[] {
  return SOURCE_PASSAGES[lang][sourceId] || [];
}

export function getRandomPassageFromSource(sourceId: string, lang: "vi" | "en"): Passage | null {
  const passages = getSourcePassages(sourceId, lang);
  if (passages.length === 0) return null;
  return passages[Math.floor(Math.random() * passages.length)];
}
