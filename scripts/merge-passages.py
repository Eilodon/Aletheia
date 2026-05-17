#!/usr/bin/env python3
"""
Merge generated passages từ script vào bundled-content.json.
Tự động update passage_count trong sources.

Usage:
    python scripts/merge-passages.py --file scripts/generated_abc12345.json \
                                     --source i_ching
"""

import json
import argparse
from pathlib import Path

CONTENT_FILE = Path("core/content/bundled-content.json")

def merge(generated_file: str, source_id: str, dry_run: bool = False):
    with open(CONTENT_FILE, encoding="utf-8") as f:
        content = json.load(f)

    with open(generated_file, encoding="utf-8") as f:
        new_entries = json.load(f)

    # Existing passage IDs (để tránh duplicate)
    existing_ids = {p["id"] for p in content["passages"]}

    added = 0
    for entry in new_entries:
        if entry["id"] in existing_ids:
            print(f"  Skip (exists): {entry['id']}")
            continue

        passage = {
            "id": entry["id"],
            "source_id": source_id,
            "reference": entry.get("reference", ""),
            "text": entry["text"],
            "context": entry.get("context"),
            "resonance_context": entry["resonance_context"],
        }
        content["passages"].append(passage)
        existing_ids.add(entry["id"])
        added += 1

    # Update passage_count
    for source in content["sources"]:
        if source["id"] == source_id:
            source["passage_count"] = sum(
                1 for p in content["passages"] if p["source_id"] == source_id
            )
            print(f"Updated {source_id} passage_count → {source['passage_count']}")

    if dry_run:
        print(f"\nDRY RUN: would add {added} passages")
        return

    with open(CONTENT_FILE, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)
    print(f"\nAdded {added} passages to {CONTENT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    merge(args.file, args.source, dry_run=args.dry_run)
