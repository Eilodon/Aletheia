/**
 * Content corpus builder — generates core/content/bundled-content.json
 * Run: pnpm tsx scripts/build-content-corpus.ts
 * Then: pnpm content:sync
 *
 * Passages live in scripts/content/<source>.ts — edit there, not here.
 * To add a new source: create scripts/content/<source>.ts, add to SOURCES,
 * and spread the export into PASSAGES below.
 */
import * as fs from "fs";
import * as path from "path";
import { I_CHING_PASSAGES } from "./content/i-ching";
import { TAO_TE_CHING_PASSAGES } from "./content/tao-te-ching";
import { MARCUS_AURELIUS_PASSAGES } from "./content/marcus-aurelius";
import { RUMI_PASSAGES } from "./content/rumi";
import { HAFEZ_PASSAGES } from "./content/hafez";
import { BIBLE_KJV_PASSAGES } from "./content/bible-kjv";

const ROOT_DIR = path.join(__dirname, "..");
const ARTIFACT_PATH = path.join(ROOT_DIR, "core", "content", "bundled-content.json");

// ─── Sources ─────────────────────────────────────────────────────────────────

const SOURCES = [
  { id: "i_ching", name: "I Ching — Kinh Dịch", tradition: "chinese", language: "vi", is_bundled: true, is_premium: false, passage_count: 0, source_type: "bibliomancy", fallback_prompts: ["Điều gì trong tình huống này là không thể thay đổi?", "Bạn đang chống lại hay chấp nhận?", "Sự thay đổi bắt đầu từ đâu?"] },
  { id: "tao_te_ching", name: "Tao Te Ching — Đạo Đức Kinh", tradition: "chinese", language: "vi", is_bundled: true, is_premium: false, passage_count: 0, source_type: "meditation", fallback_prompts: ["Làm thế nào để bạn có thể hành động mà không cố gắng?", "Cái gì mà bạn đang cố gắng kiểm soát?", "Sự bất động có thể dạy bạn điều gì?"] },
  { id: "bible_kjv", name: "Bible KJV", tradition: "christian", language: "en", is_bundled: true, is_premium: false, passage_count: 0, source_type: "bibliomancy", fallback_prompts: ["What does this passage reveal about grace?", "How does this truth challenge your assumptions?", "What invitation is hidden in these words?"] },
  { id: "hafez_divan", name: "Hafez — Divan", tradition: "islamic", language: "vi", is_bundled: true, is_premium: false, passage_count: 0, source_type: "bibliomancy", fallback_prompts: ["Tình yêu nào đang gọi bạn?", "Bạn đang tìm kiếm điều gì ở ngoài khi nó ở bên trong?", "Nếu bạn không sợ, bạn sẽ làm gì?"] },
  { id: "rumi_masnavi", name: "Rumi — Masnavi", tradition: "sufi", language: "vi", is_bundled: true, is_premium: false, passage_count: 0, source_type: "bibliomancy", fallback_prompts: ["Bạn đang quay vòng quanh cái gì?", "Nơi nào là nhà thực sự của bạn?", "Tình yêu đang mời bạn đi đâu?"] },
  { id: "marcus_aurelius", name: "Marcus Aurelius — Meditations", tradition: "stoic", language: "en", is_bundled: true, is_premium: false, passage_count: 0, source_type: "bibliomancy", fallback_prompts: ["What is within your control right now?", "How can you practice virtue in this moment?", "What would the wise person do?"] },
];

// ─── Passages — assembled from scripts/content/ ───────────────────────────────

const PASSAGES = [
  ...I_CHING_PASSAGES,
  ...TAO_TE_CHING_PASSAGES,
  ...MARCUS_AURELIUS_PASSAGES,
  ...RUMI_PASSAGES,
  ...HAFEZ_PASSAGES,
  ...BIBLE_KJV_PASSAGES,
  // Add new sources here: ...NEW_SOURCE_PASSAGES
];

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES = [
  {
    id: "moments", name: "Khoảnh khắc", is_premium: false,
    symbols: [
      { id: "candle",  display_name: "Ngọn nến",     flavor_text: "Thắp hay để tắt?" },
      { id: "key",     display_name: "Chìa khóa",    flavor_text: "Cửa nào chưa mở?" },
      { id: "dawn",    display_name: "Bình minh",    flavor_text: "Chưa bắt đầu, đã lo." },
      { id: "mirror",  display_name: "Gương",        flavor_text: "Thấy ai khi nhìn vào?" },
      { id: "door",    display_name: "Cánh cửa",     flavor_text: "Bước qua hay lùi lại?" },
      { id: "bridge",  display_name: "Cây cầu",      flavor_text: "Giữa đây và đó." },
      { id: "stone",   display_name: "Hòn đá",       flavor_text: "Đứng yên không phải không cảm." },
      { id: "water",   display_name: "Nước",         flavor_text: "Chảy về chỗ thấp nhất." },
      { id: "fire",    display_name: "Lửa",          flavor_text: "Nuôi dưỡng hay thiêu đốt?" },
      { id: "wind",    display_name: "Gió",          flavor_text: "Không nhìn thấy nhưng có thật." },
      { id: "silence", display_name: "Sự im lặng",   flavor_text: "Điều chưa được nói." },
      { id: "seed",    display_name: "Hạt giống",    flavor_text: "Chưa nảy mầm chưa có gì." },
    ],
  },
  {
    id: "elements", name: "Nguyên tố", is_premium: false,
    symbols: [
      { id: "earth",    display_name: "Đất",          flavor_text: "Mọi thứ đều trở về đây." },
      { id: "air",      display_name: "Không khí",    flavor_text: "Hiện hữu mà không nắm được." },
      { id: "metal",    display_name: "Kim loại",     flavor_text: "Qua lửa mới thành hình." },
      { id: "wood",     display_name: "Gỗ",           flavor_text: "Uốn mình theo gió vẫn sống." },
      { id: "void",     display_name: "Khoảng trống", flavor_text: "Trống mới chứa được." },
      { id: "light",    display_name: "Ánh sáng",     flavor_text: "Đổ vào không chỗ nào chứa hết." },
      { id: "shadow",   display_name: "Bóng tối",     flavor_text: "Có ánh sáng mới có bóng." },
      { id: "thunder",  display_name: "Sấm sét",      flavor_text: "Cảnh báo trước hay sau?" },
      { id: "mountain", display_name: "Núi",          flavor_text: "Không qua được thì đi vòng." },
      { id: "valley",   display_name: "Thung lũng",   flavor_text: "Chỗ thấp nhất tích nhiều nhất." },
      { id: "river",    display_name: "Sông",         flavor_text: "Không ai tắm hai lần cùng dòng." },
      { id: "ocean",    display_name: "Đại dương",    flavor_text: "Sâu đến mức không đo được." },
    ],
  },
  {
    id: "creatures", name: "Vương quốc sinh linh", is_premium: false,
    symbols: [
      { id: "elephant", display_name: "Con voi",     flavor_text: "Trí nhớ không xóa được." },
      { id: "fox",      display_name: "Con cáo",     flavor_text: "Khôn ngoan hay xảo quyệt?" },
      { id: "turtle",   display_name: "Con rùa",     flavor_text: "Chậm mà chắc." },
      { id: "tiger",    display_name: "Con hổ",      flavor_text: "Sức mạnh biết chờ đợi." },
      { id: "crane",    display_name: "Con cò",      flavor_text: "Kiên nhẫn không phải thụ động." },
      { id: "snake",    display_name: "Con rắn",     flavor_text: "Lột xác để tiếp tục." },
      { id: "eagle",    display_name: "Đại bàng",    flavor_text: "Tầm nhìn từ trên cao." },
      { id: "wolf",     display_name: "Sói",         flavor_text: "Một mình hay cùng đàn?" },
    ],
  },
  {
    id: "celestial", name: "Bầu trời sâu", is_premium: false,
    symbols: [
      { id: "crescent",      display_name: "Trăng lưỡi liềm", flavor_text: "Đang lớn hay đang hao?" },
      { id: "full_moon",     display_name: "Trăng tròn",      flavor_text: "Đến lúc hiển lộ." },
      { id: "eclipse",       display_name: "Nhật thực",       flavor_text: "Khuất không có nghĩa là mất." },
      { id: "north_star",    display_name: "Sao Bắc Đẩu",    flavor_text: "Điểm neo không lay chuyển." },
      { id: "shooting_star", display_name: "Sao băng",        flavor_text: "Chớp nhoáng nhưng có thật." },
      { id: "dawn_sky",      display_name: "Trời bình minh",  flavor_text: "Trước khi ngày bắt đầu." },
      { id: "dusk",          display_name: "Hoàng hôn",       flavor_text: "Giữa hai thế giới." },
      { id: "galaxy",        display_name: "Thiên hà",        flavor_text: "Nhỏ bé nhưng là một phần." },
    ],
  },
  {
    id: "landscape", name: "Địa hình nội tâm", is_premium: false,
    symbols: [
      { id: "cave",       display_name: "Hang động",  flavor_text: "Đi vào hay đi ra?" },
      { id: "summit",     display_name: "Đỉnh núi",   flavor_text: "Đứng đây thì thấy gì?" },
      { id: "delta",      display_name: "Cửa sông",   flavor_text: "Nơi tất cả đổ về." },
      { id: "desert",     display_name: "Sa mạc",     flavor_text: "Vắng lặng không phải trống rỗng." },
      { id: "forest",     display_name: "Khu rừng",   flavor_text: "Có thứ chỉ sống trong bóng tối." },
      { id: "cliff",      display_name: "Vách đá",    flavor_text: "Ranh giới không phải kết thúc." },
      { id: "crossroads", display_name: "Ngã tư",     flavor_text: "Không quyết định cũng là quyết định." },
      { id: "shore",      display_name: "Bờ biển",    flavor_text: "Giữa đất liền và biển cả." },
    ],
  },
  {
    id: "ritual_objects", name: "Vật thể nghi thức", is_premium: false,
    symbols: [
      { id: "incense",   display_name: "Hương khói",   flavor_text: "Điều vô hình cũng có hình." },
      { id: "bell",      display_name: "Chuông",        flavor_text: "Tiếng vang còn lại sau khi im." },
      { id: "ash",       display_name: "Tro tàn",       flavor_text: "Đã qua nhưng còn để lại dấu." },
      { id: "bowl",      display_name: "Chiếc bát",     flavor_text: "Chứa đựng mà không giữ chặt." },
      { id: "thread",    display_name: "Sợi chỉ",       flavor_text: "Mong manh mà kết nối." },
      { id: "scroll",    display_name: "Cuộn giấy",     flavor_text: "Chưa được mở ra." },
      { id: "hourglass", display_name: "Đồng hồ cát",  flavor_text: "Không ai thêm được cát vào." },
      { id: "scales",    display_name: "Cán cân",       flavor_text: "Nặng hay nhẹ là do ta cầm." },
    ],
  },
  {
    id: "geometry", name: "Hình học ẩn dụ", is_premium: false,
    symbols: [
      { id: "circle",    display_name: "Vòng tròn",       flavor_text: "Không có điểm bắt đầu hay kết thúc." },
      { id: "spiral",    display_name: "Xoắn ốc",         flavor_text: "Quay về nhưng không giống trước." },
      { id: "crossmark", display_name: "Dấu thập",        flavor_text: "Hai chiều gặp tại một điểm." },
      { id: "labyrinth", display_name: "Mê cung",         flavor_text: "Con đường duy nhất là đi tiếp." },
      { id: "triangle",  display_name: "Tam giác",        flavor_text: "Ba điểm tạo nên một bề mặt." },
      { id: "horizon",   display_name: "Đường chân trời", flavor_text: "Luôn ở phía trước dù đi mãi." },
      { id: "knot",      display_name: "Nút thắt",        flavor_text: "Được tạo ra để tháo." },
      { id: "infinity",  display_name: "Vô cực",          flavor_text: "Không có điểm nào là điểm cuối." },
    ],
  },
  {
    id: "thresholds", name: "Ngưỡng & Chuyển giao", is_premium: false,
    symbols: [
      { id: "threshold",     display_name: "Ngưỡng cửa",    flavor_text: "Chưa vào, chưa ra." },
      { id: "ending",        display_name: "Kết thúc",      flavor_text: "Mọi kết thúc mở ra điều khác." },
      { id: "pause",         display_name: "Khoảng dừng",   flavor_text: "Không làm cũng là hành động." },
      { id: "turning_point", display_name: "Bước ngoặt",    flavor_text: "Trước và sau không còn giống nhau." },
      { id: "letting_go",    display_name: "Buông",         flavor_text: "Giữ thêm sẽ mất nhiều hơn." },
      { id: "return",        display_name: "Trở về",        flavor_text: "Không phải bước lùi." },
      { id: "waiting",       display_name: "Chờ đợi",       flavor_text: "Không phải không làm gì." },
      { id: "empty_hand",    display_name: "Bàn tay trống", flavor_text: "Chỉ tay không mới nhận được." },
    ],
  },
];

// ─── Notification Matrix ──────────────────────────────────────────────────────

const NOTIFICATION_MATRIX = [
  { symbol_id: "candle",        question: "Bạn đang thắp sáng hay đang cháy" },
  { symbol_id: "key",           question: "Cái gì đang chờ bạn mở" },
  { symbol_id: "dawn",          question: "Bạn sẵn sàng cho gì" },
  { symbol_id: "mirror",        question: "Bạn thấy gì khi nhìn sâu vào" },
  { symbol_id: "door",          question: "Bạn sẽ bước qua hay lùi lại" },
  { symbol_id: "bridge",        question: "Bạn đang nối liền những gì" },
  { symbol_id: "stone",         question: "Cái gì trong bạn là bất động" },
  { symbol_id: "water",         question: "Bạn đang chảy hay đang đứng yên" },
  { symbol_id: "fire",          question: "Cái gì trong bạn đang cháy" },
  { symbol_id: "wind",          question: "Bạn đang theo hướng nào" },
  { symbol_id: "silence",       question: "Bạn có nghe được gì trong im lặng" },
  { symbol_id: "seed",          question: "Bạn đang trồng cái gì" },
  { symbol_id: "earth",         question: "Bạn cần gì để cảm thấy an toàn" },
  { symbol_id: "air",           question: "Bạn cần không gian để làm gì" },
  { symbol_id: "metal",         question: "Cái gì cần được tinh chỉnh" },
  { symbol_id: "wood",          question: "Bạn đang phát triển như thế nào" },
  { symbol_id: "void",          question: "Bạn sợ điều gì trong khoảng trống" },
  { symbol_id: "light",         question: "Điều gì đang trở nên rõ hơn dù bạn không mong" },
  { symbol_id: "shadow",        question: "Bạn đang tránh nhìn vào gì" },
  { symbol_id: "thunder",       question: "Bạn sẵn sàng cho sự thay đổi đột ngột" },
  { symbol_id: "mountain",      question: "Bạn đang đứng trên đỉnh nào" },
  { symbol_id: "valley",        question: "Điều gì đang được tích tụ trong chiều sâu" },
  { symbol_id: "river",         question: "Bạn đang chảy về phía nào" },
  { symbol_id: "ocean",         question: "Điều gì đang kéo bạn xuống sâu hơn" },
  { symbol_id: "elephant",      question: "Bạn đang gánh điều gì mà không cần thiết" },
  { symbol_id: "fox",           question: "Bạn đang dùng khôn ngoan hay xảo quyệt" },
  { symbol_id: "turtle",        question: "Điều gì đang khiến bạn rút vào trong" },
  { symbol_id: "tiger",         question: "Sức mạnh nào bạn đang giữ lại" },
  { symbol_id: "crane",         question: "Bạn đang chờ đúng thời điểm hay tránh hành động" },
  { symbol_id: "snake",         question: "Điều gì cần được lột bỏ" },
  { symbol_id: "eagle",         question: "Bạn thấy gì khi nhìn từ xa hơn" },
  { symbol_id: "wolf",          question: "Bạn đang chọn một mình hay cùng đàn" },
  { symbol_id: "crescent",      question: "Bạn đang trong pha lớn hay pha hao" },
  { symbol_id: "full_moon",     question: "Điều gì đang hiển lộ ra" },
  { symbol_id: "eclipse",       question: "Điều gì đang tạm khuất" },
  { symbol_id: "north_star",    question: "Điểm neo của bạn là gì" },
  { symbol_id: "shooting_star", question: "Điều gì chớp nhoáng nhưng thật" },
  { symbol_id: "dawn_sky",      question: "Bạn đang ở trước điều gì" },
  { symbol_id: "dusk",          question: "Bạn đang ở giữa hai điều gì" },
  { symbol_id: "galaxy",        question: "Bạn là một phần của điều gì lớn hơn" },
  { symbol_id: "cave",          question: "Bạn đang đi vào hay đi ra" },
  { symbol_id: "summit",        question: "Đứng ở đây bạn thấy gì" },
  { symbol_id: "delta",         question: "Tất cả trong bạn đang đổ về đâu" },
  { symbol_id: "desert",        question: "Bạn đang học gì từ sự vắng lặng" },
  { symbol_id: "forest",        question: "Điều gì đang sống trong bóng tối của bạn" },
  { symbol_id: "cliff",         question: "Bạn đang đứng ở rìa nào" },
  { symbol_id: "crossroads",    question: "Bạn đang trì hoãn quyết định nào" },
  { symbol_id: "shore",         question: "Bạn đang ở giữa điều gì và điều gì" },
  { symbol_id: "incense",       question: "Điều vô hình nào bạn đang cảm nhận" },
  { symbol_id: "bell",          question: "Tiếng vang nào còn lại trong bạn" },
  { symbol_id: "ash",           question: "Điều gì đã qua nhưng còn để lại dấu" },
  { symbol_id: "bowl",          question: "Bạn đang chứa đựng gì lúc này" },
  { symbol_id: "thread",        question: "Bạn đang kết nối điều gì mà sợ đứt" },
  { symbol_id: "scroll",        question: "Điều gì bạn chưa dám đọc" },
  { symbol_id: "hourglass",     question: "Bạn đang dùng thời gian để làm gì" },
  { symbol_id: "scales",        question: "Bạn đang cân nhắc hai điều gì" },
  { symbol_id: "circle",        question: "Bạn đang ở điểm nào trên vòng tròn" },
  { symbol_id: "spiral",        question: "Bạn đang quay về điều gì theo cách mới" },
  { symbol_id: "crossmark",     question: "Hai chiều nào đang gặp nhau trong bạn" },
  { symbol_id: "labyrinth",     question: "Bạn đang ở đâu trong mê cung của mình" },
  { symbol_id: "triangle",      question: "Ba thứ nào đang tạo nên bức tranh của bạn" },
  { symbol_id: "horizon",       question: "Điều gì luôn ở phía trước dù bạn đi mãi" },
  { symbol_id: "knot",          question: "Nút thắt nào bạn đang cần tháo" },
  { symbol_id: "infinity",      question: "Điều gì bạn nghĩ có giới hạn mà không có" },
  { symbol_id: "threshold",     question: "Bạn đang đứng ở cửa nào" },
  { symbol_id: "ending",        question: "Kết thúc nào đang mở ra điều gì" },
  { symbol_id: "pause",         question: "Bạn đang dừng lại hay đang trốn" },
  { symbol_id: "turning_point", question: "Điều gì đã thay đổi mà bạn chưa công nhận" },
  { symbol_id: "letting_go",    question: "Bạn đang giữ lại điều gì vì sợ mất" },
  { symbol_id: "return",        question: "Bạn đang trở về hay đang chạy trốn" },
  { symbol_id: "waiting",       question: "Bạn đang chờ điều gì để bắt đầu" },
  { symbol_id: "empty_hand",    question: "Bạn cần buông gì để nhận được gì" },
];

// ─── Assemble & write ─────────────────────────────────────────────────────────

const sourceCounts: Record<string, number> = {};
for (const p of PASSAGES) sourceCounts[p.source_id] = (sourceCounts[p.source_id] ?? 0) + 1;
const sources = SOURCES.map(s => ({ ...s, passage_count: sourceCounts[s.id] ?? 0 }));

const artifact = { sources, passages: PASSAGES, themes: THEMES, notification_matrix: NOTIFICATION_MATRIX };
fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2), "utf8");

console.log(`✓ Written ${ARTIFACT_PATH}`);
console.log(`  sources:             ${sources.length}`);
console.log(`  passages:            ${PASSAGES.length}`);
console.log(`  themes:              ${THEMES.length}`);
console.log(`  notification_matrix: ${NOTIFICATION_MATRIX.length}`);
console.log(`\nPer source:`);
for (const s of sources) console.log(`  ${s.id.padEnd(20)} ${s.passage_count} passages`);
