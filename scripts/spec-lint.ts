import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptDir, "..");

const files = {
  contractsMd: path.join(root, "docs", "CORE", "CONTRACTS.md"),
  rustContracts: path.join(root, "core", "src", "contracts.rs"),
  udl: path.join(root, "core", "src", "aletheia.udl"),
  tsTypes: path.join(root, "lib", "types.ts"),
  tsConstants: path.join(root, "lib", "constants.ts"),
  localModelConstants: path.join(root, "lib", "constants", "local-model.ts"),
  nativeModuleTypes: path.join(root, "modules", "aletheia-core-module", "src", "index.ts"),
  androidLocalInference: path.join(
    root,
    "modules",
    "aletheia-core-module",
    "android",
    "src",
    "main",
    "java",
    "expo",
    "modules",
    "aletheiacore",
    "LocalInferenceEngine.kt",
  ),
};

type EnumMap = Map<string, string[]>;
type ConstantMap = Map<string, string>;

const failures: string[] = [];

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function normalizeNumber(value: string): string {
  return value.replace(/_/g, "").trim();
}

function snakeCase(value: string): string {
  return value.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

function lowerWireValue(value: string): string {
  return value.toLowerCase();
}

function compare(label: string, left: string[], right: string[]) {
  const a = [...left].sort();
  const b = [...right].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    failures.push(`${label}: expected [${a.join(", ")}], got [${b.join(", ")}]`);
  }
}

function parseContractConstants(content: string): ConstantMap {
  const constants: ConstantMap = new Map();
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z][A-Z0-9_]+)\s+::\s+[\w?<> |]+\s*=\s*(.+?)(?:\s+\/\/.*)?$/);
    if (match) {
      constants.set(match[1], match[2].trim().replace(/^"|"$/g, ""));
    }
  }
  return constants;
}

function parseRustConstants(content: string): ConstantMap {
  const constants: ConstantMap = new Map();
  const re = /^pub const ([A-Z][A-Z0-9_]+):\s*[^=]+=\s*([^;]+);/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    constants.set(match[1], match[2].trim().replace(/^"|"$/g, ""));
  }
  return constants;
}

function parseTsConstants(content: string): ConstantMap {
  const constants: ConstantMap = new Map();
  const re = /^export const ([A-Z][A-Z0-9_]+)\s*=\s*([^;\n]+);/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    constants.set(match[1], match[2].trim().replace(/^"|"$/g, ""));
  }
  return constants;
}

function parseLocalModelConfig(content: string): ConstantMap {
  const constants: ConstantMap = new Map();
  const pairs: Array<[string, RegExp]> = [
    ["LOCAL_MODEL_ID", /MODEL_ID:\s*['"]([^'"]+)['"]/],
    ["LOCAL_MODEL_VERSION", /MODEL_VERSION:\s*['"]([^'"]+)['"]/],
    ["LOCAL_MODEL_CDN_BASE", /CDN_BASE_URL:\s*['"]([^'"]+)['"]/],
    ["LOCAL_MODEL_FILENAME", /MODEL:\s*['"]([^'"]+)['"]/],
    ["LOCAL_MODEL_MIN_RAM_MB", /MIN_RAM_MB:\s*([0-9_]+)/],
    ["LOCAL_MODEL_MIN_CPU_CORES", /MIN_CPU_CORES:\s*([0-9_]+)/],
    ["LOCAL_MODEL_SIZE_BYTES", /MODEL_SIZE_BYTES:\s*([0-9_]+)/],
    ["LOCAL_MODEL_MAX_TOKENS", /MAX_TOKENS:\s*([0-9_]+)/],
    ["LOCAL_MODEL_TOP_K", /TOP_K:\s*([0-9_]+)/],
    ["LOCAL_MODEL_TEMPERATURE", /TEMPERATURE:\s*([0-9.]+)/],
    ["LOCAL_MODEL_THINKING_ENABLED", /THINKING_ENABLED:\s*(true|false)/],
  ];

  for (const [name, re] of pairs) {
    const match = content.match(re);
    if (match) constants.set(name, match[1]);
  }
  return constants;
}

function parseAndroidLocalModelConstants(content: string): ConstantMap {
  const constants: ConstantMap = new Map();
  const pairs: Array<[string, RegExp]> = [
    ["LOCAL_MODEL_ID", /const val MODEL_ID = "([^"]+)"/],
    ["LOCAL_MODEL_FILENAME", /private const val MODEL_FILENAME = "([^"]+)"/],
    ["LOCAL_MODEL_MIN_RAM_MB", /const val REQUIRED_RAM_MB = ([0-9_]+)/],
    ["LOCAL_MODEL_SIZE_BYTES", /const val EXPECTED_MODEL_SIZE_BYTES = ([0-9_]+)L/],
  ];

  for (const [name, re] of pairs) {
    const match = content.match(re);
    if (match) constants.set(name, match[1]);
  }
  return constants;
}

function parseRustEnums(content: string): { enums: EnumMap; snakeCaseEnums: Set<string> } {
  const enums: EnumMap = new Map();
  const snakeCaseEnums = new Set<string>();
  const re = /#\[serde[^\]]*\]\s*pub enum (\w+)\s*\{([^}]+)\}|pub enum (\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const name = match[1] ?? match[3];
    const body = match[2] ?? match[4];
    const variants = body
      .replace(/\/\/[^\n]*/g, "")
      .split("\n")
      .map((line) => line.trim().match(/^([A-Z][A-Za-z0-9]*),?$/)?.[1])
      .filter((value): value is string => Boolean(value));
    if (variants.length > 0) {
      enums.set(name, variants);
      if (match[0].includes('rename_all = "snake_case"')) snakeCaseEnums.add(name);
    }
  }
  return { enums, snakeCaseEnums };
}

function parseUdlEnums(content: string): EnumMap {
  const enums: EnumMap = new Map();
  const re = /enum (\w+)\s*\{([^}]+)\};/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const values = match[2]
      .split("\n")
      .map((line) => line.trim().match(/^"([^"]+)"/)?.[1])
      .filter((value): value is string => Boolean(value));
    enums.set(match[1], values);
  }
  return enums;
}

function parseMarkdownEnums(content: string): EnumMap {
  const enums: EnumMap = new Map();
  const re = /#### (\w+)\n\n```\n\1 ::\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const values = match[2]
      .split("\n")
      .map((line) => line.trim().match(/^\|\s+([A-Z][A-Za-z0-9]*)/)?.[1])
      .filter((value): value is string => Boolean(value));
    if (values.length > 0) enums.set(match[1], values);
  }
  return enums;
}

function parseTypeScriptEnumValues(content: string, enumName: string): string[] | null {
  const union = content.match(new RegExp(`export type ${enumName} =\\n([\\s\\S]*?);`));
  if (union) {
    return [...union[1].matchAll(/\|\s*"([^"]+)"/g)].map((match) => match[1]);
  }

  const tsEnum = content.match(new RegExp(`export enum ${enumName}\\s*\\{([\\s\\S]*?)\\}`));
  if (tsEnum) {
    return [...tsEnum[1].matchAll(/=\s*"([^"]+)"/g)].map((match) => match[1]);
  }

  return null;
}

function checkConstants() {
  const md = parseContractConstants(read(files.contractsMd));
  const rust = parseRustConstants(read(files.rustContracts));
  const ts = parseTsConstants(read(files.tsConstants));
  const localModel = parseLocalModelConfig(read(files.localModelConstants));
  const androidModel = parseAndroidLocalModelConstants(read(files.androidLocalInference));

  for (const [name, expected] of md) {
    const normalizedExpected = normalizeNumber(expected);
    if (name.startsWith("LOCAL_MODEL_")) {
      const actual = localModel.get(name);
      if (actual === undefined) {
        failures.push(`local model constant missing from LOCAL_MODEL_CONFIG: ${name}`);
      } else if (normalizeNumber(actual) !== normalizedExpected) {
        failures.push(`${name}: CONTRACTS.md=${expected}, LOCAL_MODEL_CONFIG=${actual}`);
      }

      const androidActual = androidModel.get(name);
      if (androidActual !== undefined && normalizeNumber(androidActual) !== normalizedExpected) {
        failures.push(`${name}: CONTRACTS.md=${expected}, Android LocalInferenceEngine=${androidActual}`);
      }
      continue;
    }

    const rustActual = rust.get(name);
    if (rustActual !== undefined && normalizeNumber(rustActual) !== normalizedExpected) {
      failures.push(`${name}: CONTRACTS.md=${expected}, contracts.rs=${rustActual}`);
    }

    const tsActual = ts.get(name);
    if (tsActual !== undefined && normalizeNumber(tsActual) !== normalizedExpected) {
      failures.push(`${name}: CONTRACTS.md=${expected}, lib/constants.ts=${tsActual}`);
    }
  }
}

function checkEnums() {
  const mdEnums = parseMarkdownEnums(read(files.contractsMd));
  const { enums: rustEnums, snakeCaseEnums } = parseRustEnums(read(files.rustContracts));
  const udlEnums = parseUdlEnums(read(files.udl));
  const tsTypes = read(files.tsTypes);
  const nativeTypes = read(files.nativeModuleTypes);

  for (const [name, expected] of mdEnums) {
    const rust = rustEnums.get(name);
    if (rust) compare(`${name}: CONTRACTS.md ↔ contracts.rs`, expected, rust);

    const udl = udlEnums.get(name);
    if (udl) compare(`${name}: CONTRACTS.md ↔ aletheia.udl`, expected, udl);
  }

  for (const [name, udl] of udlEnums) {
    const rust = rustEnums.get(name);
    if (!rust) {
      failures.push(`${name}: present in aletheia.udl but missing from contracts.rs`);
      continue;
    }
    compare(`${name}: contracts.rs ↔ aletheia.udl`, rust, udl);

    const ts = parseTypeScriptEnumValues(tsTypes, name);
    if (!ts) {
      failures.push(`${name}: missing from lib/types.ts`);
      continue;
    }
    const expectedWire = rust.map((value) => (snakeCaseEnums.has(name) ? snakeCase(value) : lowerWireValue(value)));
    compare(`${name}: contracts.rs ↔ lib/types.ts wire values`, expectedWire, ts);
  }

  const nativeLocalModel = parseTypeScriptEnumValues(nativeTypes, "NativeLocalModelStatus");
  const tsLocalModel = parseTypeScriptEnumValues(tsTypes, "LocalModelStatus");
  if (!nativeLocalModel || !tsLocalModel) {
    failures.push("LocalModelStatus: missing TS/native string union");
  } else {
    compare("LocalModelStatus: lib/types.ts ↔ native module types", tsLocalModel, nativeLocalModel);
  }
}

function main() {
  checkConstants();
  checkEnums();

  if (failures.length > 0) {
    console.error("Spec lint failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Spec lint passed.");
}

main();
