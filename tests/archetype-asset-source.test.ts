import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("archetype asset decoupling", () => {
  it("models symbol visual assets as an explicit optional contract field", () => {
    expect(readFileSync("core/src/contracts.rs", "utf8")).toContain("archetype_asset_id");
    expect(readFileSync("core/src/aletheia.udl", "utf8")).toContain("string? archetype_asset_id");
    expect(readFileSync("lib/types.ts", "utf8")).toContain("archetype_asset_id?: string");
  });

  it("resolves symbol artwork from asset id before falling back to symbol id", () => {
    const source = readFileSync("assets/symbols/index.ts", "utf8");

    expect(source).toContain("ArchetypeAssetId");
    expect(source).toContain("archetype_asset_id");
    expect(source).toContain("symbol.archetype_asset_id ?? symbol.id");
  });

  it("passes the full symbol object to asset lookup at UI call sites", () => {
    const wildcard = readFileSync("app/reading/wildcard.tsx", "utf8");
    const passage = readFileSync("app/reading/passage.tsx", "utf8");

    expect(wildcard).not.toContain("getSymbolAsset(symbol.id)");
    expect(passage).not.toContain("getSymbolAsset(selectedSymbol.id)");
    expect(wildcard).toContain("getSymbolAsset(symbol)");
    expect(passage).toContain("getSymbolAsset(selectedSymbol)");
  });
});
