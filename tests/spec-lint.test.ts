import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("spec-lint", () => {
  it("keeps contract mirrors in sync", () => {
    expect(() => {
      execFileSync("pnpm", ["exec", "tsx", "scripts/spec-lint.ts"], {
        encoding: "utf8",
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});
