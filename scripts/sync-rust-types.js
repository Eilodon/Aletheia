/**
 * Sync TypeScript types from Rust contracts.rs
 * Run: node scripts/sync-rust-types.js
 * 
 * Parses core/src/contracts.rs and generates lib/types.ts
 * SSOT: Rust contracts.rs is the single source of truth
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const RUST_FILE = path.join(PROJECT_ROOT, 'core/src/contracts.rs');
const TS_FILE = path.join(PROJECT_ROOT, 'lib/types.ts');

function parseRustFile(content) {
  const enums = [];
  const structs = [];
  const constants = [];

  // Parse enums: pub enum Name { Variant, Variant, ... }
  // Handle special case: ErrorCode has #[serde(rename_all = "snake_case")]
  const enumRegex = /#\[serde[^\]]*\]\s*pub enum (\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const hasSnakeCase = match[0].includes('rename_all = "snake_case"');
    const variants = body.split(',')
      .map(v => v.trim())
      .filter(v => v && !v.startsWith('impl') && !v.startsWith('fn'));
    enums.push({ name, variants, hasSnakeCase });
  }

  // Also catch enums without serde attribute (fallback)
  const enumRegex2 = /pub enum (\w+)\s*\{([^}]+)\}(?!\s*impl)/g;
  while ((match = enumRegex2.exec(content)) !== null) {
    // Skip if already captured (has serde attribute)
    const name = match[1];
    if (!enums.find(e => e.name === name)) {
      const body = match[2];
      const variants = body.split(',')
        .map(v => v.trim())
        .filter(v => v && !v.startsWith('impl') && !v.startsWith('fn'));
      enums.push({ name, variants, hasSnakeCase: false });
    }
  }

  // Parse structs: pub struct Name { pub field: Type, ... }
  const structRegex = /pub struct (\w+)\s*\{([^}]+)\}/g;
  while ((match = structRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = body.split(',')
      .map(f => f.trim())
      .filter(f => f && f.startsWith('pub '))
      .map(f => {
        const parts = f.replace('pub ', '').split(':').map(p => p.trim());
        return { name: parts[0], type: parts[1] };
      });
    structs.push({ name, fields });
  }

  // Parse constants: pub const NAME: Type = value;
  const constRegex = /pub const (\w+):\s*(\w+)\s*=\s*([^;]+);/g;
  while ((match = constRegex.exec(content)) !== null) {
    constants.push({ name: match[1], type: match[2], value: match[3].trim() });
  }

  return { enums, structs, constants };
}

function rustToTsType(rustType) {
  const map = {
    'String': 'string',
    'str': 'string',
    'i8': 'number', 'i16': 'number', 'i32': 'number', 'i64': 'number',
    'u8': 'number', 'u16': 'number', 'u32': 'number', 'u64': 'number',
    'f32': 'number', 'f64': 'number',
    'bool': 'boolean',
    'usize': 'number',
  };
  
  // Handle Option<T>
  if (rustType.startsWith('Option<')) {
    const inner = rustType.replace('Option<', '').replace('>', '');
    return rustToTsType(inner) + ' | undefined';
  }
  
  // Handle Vec<T>
  if (rustType.startsWith('Vec<')) {
    const inner = rustType.replace('Vec<', '').replace('>', '');
    return rustToTsType(inner) + '[]';
  }
  
  return map[rustType] || rustType;
}

function generateEnums(enums) {
  let output = '// ============================================================================\n';
  output += '// ENUMS\n';
  output += '// ============================================================================\n\n';
  
  for (const e of enums) {
    output += `export enum ${e.name} {\n`;
    for (const variant of e.variants) {
      // Convert PascalCase to snake_case for serde rename_all = "snake_case"
      let value = variant;
      if (e.hasSnakeCase) {
        value = variant.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      }
      output += `  ${variant} = "${value}",\n`;
    }
    output += '}\n\n';
  }
  
  return output;
}

function generateStructs(structs) {
  let output = '// ============================================================================\n';
  output += '// CORE SCHEMAS\n';
  output += '// ============================================================================\n\n';
  
  for (const s of structs) {
    output += `export interface ${s.name} {\n`;
    for (const field of s.fields) {
      output += `  ${field.name}: ${rustToTsType(field.type)};\n`;
    }
    output += '}\n\n';
  }
  
  return output;
}

function generateTypesFile(data) {
  const today = new Date().toISOString().split('T')[0];
  
  let output = `/**
 * Aletheia Type Definitions
 * AUTO-GENERATED - Do not edit manually
 * Sync from: core/src/contracts.rs
 * Last synced: ${today}
 * 
 * Based on CONTRACTS.md — single source of truth for all schemas
 */

`;

  output += generateEnums(data.enums);
  output += generateStructs(data.structs);

  return output;
}

function main() {
  console.log('🔄 Syncing types from Rust contracts...');
  
  const rustContent = fs.readFileSync(RUST_FILE, 'utf8');
  const data = parseRustFile(rustContent);
  
  console.log(`  Found ${data.enums.length} enums`);
  console.log(`  Found ${data.structs.length} structs`);
  
  const tsContent = generateTypesFile(data);
  fs.writeFileSync(TS_FILE, tsContent);
  
  console.log(`✅ Synced to ${TS_FILE}`);
}

main();
