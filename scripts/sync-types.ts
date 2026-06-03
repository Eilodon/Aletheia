/**
 * Type Sync Script - Generate TypeScript types from Rust contracts
 * 
 * Usage: npx tsx scripts/sync-types.ts
 * 
 * This script parses executable Rust contracts and generates lib/types.ts
 * Run this whenever the Rust contracts change
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

function generateTypeScript(enums: ParsedEnum[], structs: ParsedStruct[]): string {
  let output = `/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: core/src/contracts.rs and core/src/aletheia.udl
 * Last synced: ${new Date().toISOString().split("T")[0]}
 * 
 * Executable Rust contracts are the source of truth.
 * docs/CONTRACTS.md is a synchronized reference, not the authority.
 */

// ============================================================================
// ENUMS
// ============================================================================

`;

  // Generate enums (handle snake_case for ErrorCode)
  for (const enumItem of enums) {
    output += `export enum ${enumItem.name} {\n`;
    for (const value of enumItem.values) {
      let enumValue = value;
      if (enumItem.hasSnakeCase) {
        // Convert PascalCase to snake_case: SourceNotFound -> source_not_found
        enumValue = value.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
      } else {
        enumValue = value.toLowerCase();
      }
      output += `  ${value} = "${enumValue}",\n`;
    }
    output += `}\n\n`;
  }

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
      const optional = field.optional ? " | undefined" : "";
      output += `  ${field.name}: ${field.type}${optional};\n`;
    }
    output += `}\n\n`;
  }

  return output;
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
