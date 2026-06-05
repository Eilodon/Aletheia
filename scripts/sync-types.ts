/**
 * Type Sync Script - Generate TypeScript types from Rust contracts
 *
 * Usage: npx tsx scripts/sync-types.ts
 *
 * Chain of command (ADR-AL-001):
 *   docs/CORE/CONTRACTS.md  ← primary spec (human layer, edit here first)
 *       ↓ mirror manually
 *   core/src/contracts.rs   ← executable spec (update after CONTRACTS.md)
 *       ↓ this script
 *   lib/types.ts            ← generated artifact (do not edit manually)
 *
 * Run this script after updating contracts.rs to keep lib/types.ts in sync.
 * Do NOT change types in lib/types.ts directly — update CONTRACTS.md first.
 */

import * as fs from "fs";
import * as path from "path";

const CONTRACTS_PATH = path.join(__dirname, "../core/src/contracts.rs");
const OUTPUT_PATH = path.join(__dirname, "../lib/types.ts");

interface ParsedEnum {
  name: string;
  values: string[];
  hasSnakeCase: boolean;
}

interface ParsedStruct {
  name: string;
  fields: { name: string; type: string; optional: boolean }[];
}

function parseUnitEnumVariants(body: string): string[] {
  // Strip doc comments (///) and regular comments (//) before parsing.
  // This prevents comment words from being mistaken for variant names.
  const cleanBody = body.replace(/\/\/[^\n]*/g, "");
  const values: string[] = [];
  for (const line of cleanBody.split("\n")) {
    const trimmed = line.trim();
    // Match unit variant: PascalCase identifier, optionally followed by comma
    const m = trimmed.match(/^([A-Z][A-Za-z0-9]*),?$/);
    if (m) {
      values.push(m[1]);
    }
  }
  return values;
}

function parseRustFile(content: string): { enums: ParsedEnum[]; structs: ParsedStruct[] } {
  const enums: ParsedEnum[] = [];
  const structs: ParsedStruct[] = [];

  // Parse enums with #[serde(...)] attribute — detect rename_all strategy
  const enumRegex = /#\[serde[^\]]*\]\s*pub enum (\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const hasSnakeCase = match[0].includes('rename_all = "snake_case"');
    const values = parseUnitEnumVariants(body);
    if (values.length > 0) {
      enums.push({ name, values, hasSnakeCase });
    }
  }

  // Fallback: enums without a #[serde(...)] attribute (serialized with PascalCase names by default)
  const enumRegex2 = /pub enum (\w+)\s*\{([^}]+)\}(?!\s*impl)/g;
  while ((match = enumRegex2.exec(content)) !== null) {
    const name = match[1];
    if (!enums.find(e => e.name === name)) {
      const values = parseUnitEnumVariants(match[2]);
      if (values.length > 0) {
        enums.push({ name, values, hasSnakeCase: false });
      }
    }
  }

  // Parse structs
  const structRegex = /#\[derive.*?\]\s*pub struct (\w+)\s*\{([^}]+)\}/g;
  while ((match = structRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields: { name: string; type: string; optional: boolean }[] = [];

    const fieldRegex = /pub (\w+):\s*([^,\n]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      let fieldType = fieldMatch[2].trim();
      const optional = fieldType.startsWith("Option<");
      if (optional) {
        fieldType = fieldType.replace(/^Option</, "").replace(/>$/g, "");
      }

      // Convert Rust types to TypeScript (u64 included for model size bytes)
      let tsType = fieldType
        .replace(/String/g, "string")
        .replace(/bool/g, "boolean")
        .replace(/i64|u64|u32|u8/g, "number")
        .replace(/f32/g, "number")
        .replace(/Vec<(\w+)>/g, "$1[]")
        .replace(/std::collections::HashMap<String, serde_json::Value>/g, "Record<string, unknown>");

      fields.push({ name: fieldName, type: tsType, optional });
    }

    if (fields.length > 0) {
      structs.push({ name, fields });
    }
  }

  return { enums, structs };
}

// Enums listed here are generated as TypeScript string union types instead of
// TypeScript enums. Use this for enums whose values are compared as raw strings
// at runtime (e.g. values coming directly from the native bridge).
const GENERATE_AS_UNION = new Set(["LocalModelStatus"]);

function generateTypeScript(enums: ParsedEnum[], structs: ParsedStruct[]): string {
  let output = `/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: CONTRACTS.md → core/src/contracts.rs → this file (ADR-AL-001)
 * Last synced: ${new Date().toISOString().split("T")[0]}
 *
 * docs/CORE/CONTRACTS.md is the primary spec (human layer).
 * core/src/contracts.rs is the executable spec.
 * This file is a generated artifact — change CONTRACTS.md first.
 */

// ============================================================================
// ENUMS
// ============================================================================

`;

  // Generate enums (handle snake_case for ErrorCode)
  // Enums in GENERATE_AS_UNION are emitted as string union types instead of
  // TypeScript enums — used when values are compared as raw strings at runtime.
  for (const enumItem of enums) {
    const wireValues = enumItem.values.map(value => {
      if (enumItem.hasSnakeCase) {
        return value.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
      }
      return value.toLowerCase();
    });

    if (GENERATE_AS_UNION.has(enumItem.name)) {
      output += `export type ${enumItem.name} =\n`;
      output += wireValues.map(v => `  | "${v}"`).join("\n") + ";\n\n";
    } else {
      output += `export enum ${enumItem.name} {\n`;
      enumItem.values.forEach((value, i) => {
        output += `  ${value} = "${wireValues[i]}",\n`;
      });
      output += `}\n\n`;
    }
  }

  // UI-scope types — not in contracts.rs, maintained manually per CONTRACTS.md Section 2.2
  output += `// UI-scope types (not generated from contracts.rs — see CONTRACTS.md Section 2.2)\n`;
  output += `export type InferenceMode = "local" | "cloud" | "fallback" | "offline";\n`;
  output += `export type ArchiveFilter = "all" | "favorites" | "ai" | "shared";\n`;
  output += `export type ArchiveSort = "latest" | "oldest" | "depth";\n`;
  output += `export type ToastKind = "success" | "warn" | "error" | "info";\n\n`;

  output += `// ============================================================================
// CORE SCHEMAS
// ============================================================================

export interface AletheiaError {
  code: ErrorCode;
  message: string;
  context: Record<string, unknown> | undefined;
}

`;

  // Generate interfaces
  for (const struct of structs) {
    output += `export interface ${struct.name} {\n`;
    for (const field of struct.fields) {
      if (field.name === "archetype_asset_id" && field.optional) {
        output += `  ${field.name}?: ${field.type};\n`;
        continue;
      }
      const optional = field.optional ? " | undefined" : "";
      output += `  ${field.name}: ${field.type}${optional};\n`;
    }
    if (struct.name === "Reading") {
      output += `  // TS-store-only privacy flag — see CONTRACTS.md Reading.hide_situation.\n`;
      output += `  hide_situation?: boolean;\n`;
    }
    output += `}\n\n`;
  }

  return output.trimEnd() + "\n";
}

async function main() {
  console.log("[TypeSync] Starting...");

  try {
    const content = fs.readFileSync(CONTRACTS_PATH, "utf-8");
    const { enums, structs } = parseRustFile(content);
    
    console.log(`[TypeSync] Found ${enums.length} enums, ${structs.length} structs`);
    
    const tsContent = generateTypeScript(enums, structs);
    fs.writeFileSync(OUTPUT_PATH, tsContent);
    
    console.log(`[TypeSync] Generated ${OUTPUT_PATH}`);
    console.log("[TypeSync] Done!");
  } catch (err) {
    console.error("[TypeSync] Error:", err);
    process.exit(1);
  }
}

main();
