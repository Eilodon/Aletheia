import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const scanRoot = path.join(projectRoot, "app");

const forbiddenChecks = [
  {
    label: "bundled content import",
    test: (content) =>
      /from\s+["']@\/lib\/data\/content["']/.test(content) ||
      /from\s+["'].*lib\/data\/content["']/.test(content),
  },
  {
    label: "direct native runtime branching",
    test: (content) =>
      /\bshouldUseAletheiaNative\b/.test(content) ||
      /\baletheiaNativeClient\b/.test(content),
  },
];

const explicitFileChecks = [
  {
    filePath: path.join(projectRoot, "lib", "native", "runtime.ts"),
    label: "runtime still bootstraps native content from TS JSON",
    test: (content) =>
      /seedBundledData\s*\(\s*\{/.test(content) ||
      /JSON\.stringify\(BUNDLED_(SOURCES|PASSAGES|THEMES)\)/.test(content),
  },
  {
    filePath: path.join(projectRoot, "lib", "services", "ai-client.ts"),
    label: "ai-client still imports native runtime or native bridge directly",
    test: (content) =>
      /from\s+["']@\/lib\/native\//.test(content) ||
      /from\s+["']\.\.\/native\//.test(content),
  },
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];
for (const filePath of walk(scanRoot)) {
  if (!statSync(filePath).isFile()) {
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  for (const check of forbiddenChecks) {
    if (check.test(content)) {
      violations.push({
        filePath: path.relative(projectRoot, filePath),
        label: check.label,
      });
    }
  }
}

for (const check of explicitFileChecks) {
  const content = readFileSync(check.filePath, "utf8");
  if (check.test(content)) {
    violations.push({
      filePath: path.relative(projectRoot, check.filePath),
      label: check.label,
    });
  }
}

if (violations.length > 0) {
  console.error("Architecture verification failed:");
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.label}`);
  }
  process.exit(1);
}

console.log("Architecture verification passed.");
