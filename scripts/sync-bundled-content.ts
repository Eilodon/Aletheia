import * as fs from "fs";
import * as path from "path";

type NotificationEntry = {
  symbol_id: string;
  question: string;
};

type BundledContentArtifact = {
  sources: unknown[];
  passages: unknown[];
  themes: unknown[];
  notification_matrix: NotificationEntry[];
};

const ROOT_DIR = path.join(__dirname, "..");
const ARTIFACT_PATH = path.join(ROOT_DIR, "core", "content", "bundled-content.json");
const GENERATED_TS_PATH = path.join(ROOT_DIR, "lib", "data", "seed-data.generated.ts");

function readArtifact(): BundledContentArtifact {
  const raw = fs.readFileSync(ARTIFACT_PATH, "utf8");
  return JSON.parse(raw) as BundledContentArtifact;
}

function generateTs(artifact: BundledContentArtifact): string {
  const header = `/**
 * Bundled content artifact bridge
 * AUTO-GENERATED - Do not edit manually
 * Source of truth: core/content/bundled-content.json
 */

import type { Passage, Source, Theme, NotificationEntry } from "@/lib/types";

`;

  return `${header}export const BUNDLED_SOURCES = ${JSON.stringify(artifact.sources, null, 2)} as Source[];

export const BUNDLED_PASSAGES = ${JSON.stringify(artifact.passages, null, 2)} as Passage[];

export const BUNDLED_THEMES = ${JSON.stringify(artifact.themes, null, 2)} as Theme[];

export const NOTIFICATION_MATRIX = ${JSON.stringify(artifact.notification_matrix, null, 2)} as NotificationEntry[];
`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const artifact = readArtifact();
  const generated = generateTs(artifact);

  if (checkOnly) {
    const existing = fs.existsSync(GENERATED_TS_PATH)
      ? fs.readFileSync(GENERATED_TS_PATH, "utf8")
      : "";

    if (existing !== generated) {
      console.error("Bundled content generated file is out of date. Run `pnpm content:sync`.");
      process.exit(1);
    }

    console.log("Bundled content generation is up to date.");
    return;
  }

  fs.writeFileSync(GENERATED_TS_PATH, generated);
  console.log(`Wrote ${path.relative(ROOT_DIR, GENERATED_TS_PATH)}`);
}

main();
