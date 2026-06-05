import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { vi } from "@/lib/i18n/vi";

describe("privacy ledger copy", () => {
  it("does not claim reading history sync while local-first sync is not implemented", () => {
    const readme = readFileSync("README.md", "utf8");

    expect(readme).not.toMatch(/sync(?:hronize)?\s+(?:reading\s+)?history/i);
    expect(readme).toContain("local");
  });

  it("names every data flow visible in Settings", () => {
    const englishLedger = [
      ...en.settings.privacyLedgerStaysItems,
      ...en.settings.privacyLedgerLeavesItems,
    ].join("\n");
    const vietnameseLedger = [
      ...vi.settings.privacyLedgerStaysItems,
      ...vi.settings.privacyLedgerLeavesItems,
    ].join("\n").toLowerCase();

    for (const term of ["ai", "gift", "analytics", "export", "delete", "model"]) {
      expect(englishLedger.toLowerCase()).toContain(term);
    }
    for (const term of ["ai", "quà", "phân tích", "xuất", "xóa", "model"]) {
      expect(vietnameseLedger).toContain(term);
    }
  });
});
