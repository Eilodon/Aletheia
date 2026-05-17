#!/usr/bin/env python3
"""
Aletheia — Batch passage generation script
Dùng Claude Haiku 4.5 Batch API để generate text + resonance_context
Chi phí ước tính: < $1 cho 500 passages

Usage:
    python scripts/generate-passages.py --source i_ching --start 5 --end 64
    python scripts/generate-passages.py --source hafez_divan --count 40
    python scripts/generate-passages.py --check-batch <batch_id>
"""

import anthropic
import json
import argparse
import sys
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

CONTENT_FILE = Path("core/content/bundled-content.json")
SCRIPTS_DIR  = Path("scripts")

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 350

# Few-shot examples từ bundled-content.json hiện có (ground truth)
FEW_SHOT_EXAMPLES = [
    {
        "source_id": "i_ching",
        "reference": "Hexagram 1 · 乾 (Qián)",
        "text": "The Creative works sublime success, furthering through perseverance.",
        "resonance_context": "Về sức mạnh của việc không bỏ cuộc dù chưa thấy kết quả. Dành cho user đang mệt mỏi nhưng cần tiếp tục."
    },
    {
        "source_id": "tao_te_ching",
        "reference": "Chương 11 · 用",
        "text": "Thirty spokes share the wheel's hub; it is the center hole that makes it useful.",
        "resonance_context": "Về giới hạn của việc định nghĩa và kiểm soát. Dành cho user đang cố gắng nắm chắc mọi thứ."
    },
    {
        "source_id": "hafez_divan",
        "reference": "Ghazal 1",
        "text": "Come, let us scatter roses and pour wine in the garden; we'll cleave the sky and lay a new foundation.",
        "resonance_context": "Về việc quên mất ánh sáng vốn có của chính mình. Dành cho user đang tìm kiếm điều gì đó bên ngoài."
    }
]

SYSTEM_PROMPT = """Bạn là chuyên gia triết học phương Đông và phương Tây, với kiến thức sâu về I Ching, Tao Te Ching, Thơ Ba Tư cổ điển, Kinh Thánh, và Triết học Khắc kỷ.

Nhiệm vụ: Với mỗi đoạn văn triết lý được cho, tạo ra:
1. `text`: Một câu trích dẫn triết lý có chiều sâu (60-120 ký tự). Dùng bản dịch chuẩn, không paraphrase.
2. `resonance_context`: Context ẩn cho AI (100-150 ký tự). Format: "Về [chủ đề cốt lõi]. Dành cho user đang [tình huống cụ thể]."

resonance_context PHẢI:
- Bắt đầu bằng "Về ..."
- Có "Dành cho user đang ..."
- Cụ thể, không abstract ("Về sự thay đổi" là sai; "Về việc buông bỏ khi không thể kiểm soát" là đúng)
- Tiếng Việt cho i_ching, tao_te_ching, hafez_divan, rumi_masnavi
- Tiếng Anh cho bible_kjv, marcus_aurelius

Output: JSON object duy nhất, không có markdown backtick, không có preamble.
Schema: {"text": "...", "resonance_context": "..."}"""

def format_request(entry: dict) -> str:
    """Format một entry thành prompt cho model."""
    lines = [f"Source: {entry['source_id']}"]
    if "hexagram_number" in entry:
        lines.append(f"Hexagram: {entry['hexagram_number']} ({entry.get('chinese_name', '')})")
    if "chapter" in entry:
        lines.append(f"Chapter: {entry['chapter']}")
    lines.append(f"Reference: {entry['reference']}")
    if "original_text" in entry:
        lines.append(f"Original: {entry['original_text']}")
    return "\n".join(lines)


def build_iching_inputs() -> list[dict]:
    """64 hexagram entries — Wilhelm/Baynes I Ching translation."""
    hexagrams = [
        (1,  "乾 (Qián)", "Qiền", "Heaven above, heaven below. The Creative."),
        (2,  "坤 (Kūn)",  "Khôn", "Earth above, earth below. The Receptive."),
        (3,  "屯 (Zhūn)", "Truân", "Difficulty at the beginning."),
        (4,  "蒙 (Méng)", "Mông", "Youthful folly."),
        (5,  "需 (Xū)",   "Nhu", "Waiting with confidence."),
        (6,  "訟 (Sòng)", "Tụng", "Conflict. Sincerity is obstructed."),
        (7,  "師 (Shī)",  "Sư", "The army needs perseverance."),
        (8,  "比 (Bǐ)",   "Tỷ", "Holding together. Union."),
        (9,  "小畜 (Xiǎo Xù)", "Tiểu Súc", "The taming power of the small."),
        (10, "履 (Lǚ)",   "Lý", "Treading. Conduct."),
        (11, "泰 (Tài)",  "Thái", "Peace. The small departs, the great approaches."),
        (12, "否 (Pǐ)",   "Bỉ", "Standstill. The great departs, the small approaches."),
        (13, "同人 (Tóng Rén)", "Đồng Nhân", "Fellowship with men."),
        (14, "大有 (Dà Yǒu)", "Đại Hữu", "Possession in great measure."),
        (15, "謙 (Qiān)", "Khiêm", "Modesty. The superior man carries things through."),
        (16, "豫 (Yù)",   "Dự", "Enthusiasm. Helpful to install helpers."),
        (17, "隨 (Suí)",  "Tùy", "Following. Going and coming without error."),
        (18, "蠱 (Gǔ)",   "Cổ", "Work on what has been spoiled."),
        (19, "臨 (Lín)",  "Lâm", "Approach. Great success."),
        (20, "觀 (Guān)", "Quán", "Contemplation. The wind blows over the earth."),
        (21, "噬嗑 (Shì Kè)", "Phệ Hạp", "Biting through. Success."),
        (22, "賁 (Bì)",   "Bí", "Grace. Success in small matters."),
        (23, "剝 (Bō)",   "Bác", "Splitting apart. It does not further to go anywhere."),
        (24, "復 (Fù)",   "Phục", "Return. The turning point."),
        (25, "無妄 (Wú Wàng)", "Vô Vọng", "Innocence. Great success."),
        (26, "大畜 (Dà Xù)", "Đại Súc", "The taming power of the great."),
        (27, "頤 (Yí)",   "Di", "The corners of the mouth. Nourishment."),
        (28, "大過 (Dà Guò)", "Đại Quá", "Preponderance of the great."),
        (29, "坎 (Kǎn)",  "Khảm", "The abysmal water. Danger."),
        (30, "離 (Lí)",   "Ly", "The clinging fire. Perseverance furthers."),
        (31, "咸 (Xián)", "Hàm", "Influence, wooing. Success."),
        (32, "恆 (Héng)", "Hằng", "Duration. Success. No blame."),
        (33, "遯 (Dùn)",  "Độn", "Retreat. Success in small matters."),
        (34, "大壯 (Dà Zhuàng)", "Đại Tráng", "The power of the great."),
        (35, "晉 (Jìn)",  "Tấn", "Progress. The powerful prince is honored."),
        (36, "明夷 (Míng Yí)", "Minh Di", "Darkening of the light. Perseverance."),
        (37, "家人 (Jiā Rén)", "Gia Nhân", "The family. Perseverance of the woman."),
        (38, "睽 (Kuí)",  "Khuê", "Opposition. In small matters, good fortune."),
        (39, "蹇 (Jiǎn)", "Kiển", "Obstruction. The northeast furthers."),
        (40, "解 (Xiè)",  "Giải", "Deliverance. The southwest furthers."),
        (41, "損 (Sǔn)",  "Tổn", "Decrease. Have confidence."),
        (42, "益 (Yì)",   "Ích", "Increase. It furthers one to undertake something."),
        (43, "夬 (Guài)", "Quải", "Breakthrough. One must resolutely make the matter known."),
        (44, "姤 (Gòu)",  "Cấu", "Coming to meet. The woman is bold."),
        (45, "萃 (Cuì)",  "Tụy", "Gathering together. The king approaches his temple."),
        (46, "升 (Shēng)", "Thăng", "Pushing upward. Supreme good fortune."),
        (47, "困 (Kùn)",  "Khốn", "Oppression. Exhaustion. Perseverance."),
        (48, "井 (Jǐng)", "Tỉnh", "The well. Change the town but not the well."),
        (49, "革 (Gé)",   "Cách", "Revolution. On your own day you are believed."),
        (50, "鼎 (Dǐng)", "Đỉnh", "The cauldron. Supreme good fortune."),
        (51, "震 (Zhèn)", "Chấn", "The arousing shock. Shock brings success."),
        (52, "艮 (Gèn)",  "Cấn", "Keeping still, mountain. Keeping his back still."),
        (53, "漸 (Jiàn)", "Tiệm", "Development, gradual progress. Good fortune."),
        (54, "歸妹 (Guī Mèi)", "Quy Muội", "The marrying maiden. Undertakings bring misfortune."),
        (55, "豐 (Fēng)", "Phong", "Abundance, fullness. The king attains abundance."),
        (56, "旅 (Lǚ)",   "Lữ", "The wanderer. Success through small matters."),
        (57, "巽 (Xùn)",  "Tốn", "The gentle wind. Success through small matters."),
        (58, "兌 (Duì)",  "Đoài", "The joyous lake. Perseverance is favorable."),
        (59, "渙 (Huàn)", "Hoán", "Dispersion. The king approaches his temple."),
        (60, "節 (Jié)",  "Tiết", "Limitation. Bitter limitation must not be persevered."),
        (61, "中孚 (Zhōng Fú)", "Trung Phu", "Inner truth. Pigs and fishes. Good fortune."),
        (62, "小過 (Xiǎo Guò)", "Tiểu Quá", "Preponderance of the small."),
        (63, "既濟 (Jì Jì)", "Ký Tế", "After completion. Success in small matters."),
        (64, "未濟 (Wèi Jì)", "Vị Tế", "Before completion. Success."),
    ]

    return [
        {
            "id": f"iching_{n}",
            "source_id": "i_ching",
            "hexagram_number": n,
            "reference": f"Hexagram {n} · {chinese}",
            "chinese_name": viet,
            "original_text": text,
        }
        for n, chinese, viet, text in hexagrams
    ]


def submit_batch(source_id: str, entries: list[dict]) -> str:
    """Submit batch job và return batch_id."""
    client = anthropic.Anthropic()

    few_shot_str = "\n\n".join([
        f"Ví dụ {i+1}:\nInput: {e['reference']}\nOutput: {json.dumps({'text': e['text'], 'resonance_context': e['resonance_context']}, ensure_ascii=False)}"
        for i, e in enumerate(FEW_SHOT_EXAMPLES[:2])
    ])

    system_with_examples = SYSTEM_PROMPT + f"\n\n--- VÍ DỤ ---\n{few_shot_str}"

    requests = []
    for entry in entries:
        requests.append(anthropic.types.message_create_params.MessageCreateParamsNonStreaming(
            custom_id=entry["id"],
            params={
                "model": MODEL,
                "max_tokens": MAX_TOKENS,
                "system": system_with_examples,
                "messages": [{"role": "user", "content": format_request(entry)}],
            }
        ))

    batch = client.messages.batches.create(requests=requests)
    print(f"Batch submitted: {batch.id}")
    print(f"Status: {batch.processing_status}")
    print(f"Entries: {len(requests)}")
    print(f"→ Check results: python scripts/generate-passages.py --check-batch {batch.id}")
    return batch.id


def check_batch(batch_id: str, auto_save: bool = False) -> list[dict]:
    """Poll batch status và optionally save results."""
    client = anthropic.Anthropic()
    batch = client.messages.batches.retrieve(batch_id)

    print(f"Batch {batch_id}: {batch.processing_status}")
    print(f"  succeeded: {batch.request_counts.succeeded}")
    print(f"  errored:   {batch.request_counts.errored}")
    print(f"  processing: {batch.request_counts.processing}")

    if batch.processing_status != "ended":
        print("Batch chưa xong. Thử lại sau.")
        return []

    results = []
    errors = []
    for result in client.messages.batches.results(batch_id):
        if result.result.type == "succeeded":
            try:
                raw = result.result.message.content[0].text
                # Strip markdown fences n���u model vô tình thêm vào
                raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                parsed = json.loads(raw)
                results.append({
                    "id": result.custom_id,
                    "text": parsed["text"],
                    "resonance_context": parsed["resonance_context"],
                })
            except (json.JSONDecodeError, KeyError) as e:
                errors.append({"id": result.custom_id, "error": str(e), "raw": result.result.message.content[0].text})
        else:
            errors.append({"id": result.custom_id, "error": result.result.error.type})

    print(f"\nParsed: {len(results)} OK, {len(errors)} errors")

    if errors:
        print("\n--- ERRORS ---")
        for e in errors:
            print(f"  {e['id']}: {e['error']}")

    if auto_save and results:
        out_file = SCRIPTS_DIR / f"generated_{batch_id[:8]}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to: {out_file}")
        print("→ Review file, sau đó chạy merge-passages.py để merge vào bundled-content.json")

    return results


# ── QA ────────────────────────────────────────────────────────────────────────

def qa_results(results: list[dict]) -> list[dict]:
    """Auto-flag results cần human review."""
    flagged = []
    for r in results:
        issues = []
        rc = r.get("resonance_context", "")
        text = r.get("text", "")

        if not rc.startswith("Về "):
            issues.append("resonance_context không bắt đầu bằng 'Về '")
        if "user" not in rc and "người" not in rc:
            issues.append("resonance_context thiếu mention user context")
        if len(text) < 30:
            issues.append(f"text quá ngắn ({len(text)} chars)")
        if len(rc) < 50:
            issues.append(f"resonance_context quá ngắn ({len(rc)} chars)")
        if "..." in text or "[" in text:
            issues.append("text có thể incomplete")

        if issues:
            flagged.append({"id": r["id"], "issues": issues, "data": r})

    if flagged:
        print(f"\n⚠  {len(flagged)}/{len(results)} entries cần review:")
        for f in flagged:
            print(f"  [{f['id']}]: {', '.join(f['issues'])}")
    else:
        print(f"\nOK: Tất cả {len(results)} entries pass QA tự động")

    return flagged


# ── CLI ────────────────────────────────────────────────────────────────────��──

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["i_ching", "tao_te_ching", "hafez_divan",
                                              "rumi_masnavi", "bible_kjv", "marcus_aurelius"])
    parser.add_argument("--check-batch", metavar="BATCH_ID")
    parser.add_argument("--save", action="store_true", help="Auto-save results to file")
    args = parser.parse_args()

    if args.check_batch:
        results = check_batch(args.check_batch, auto_save=args.save)
        if results:
            qa_results(results)
    elif args.source == "i_ching":
        entries = build_iching_inputs()
        submit_batch("i_ching", entries)
    else:
        print("Specify --source or --check-batch")
        sys.exit(1)
