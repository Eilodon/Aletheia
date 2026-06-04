#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { syncNativeStaging, checkNativeFreshness } = require("../modules/aletheia-core-module/plugin");

const args = process.argv.slice(2);
const platform = args.find((a) => !a.startsWith("--")) || "android";
const checkOnly = args.includes("--check");
const projectRoot = path.resolve(__dirname, "..");

if (checkOnly) {
  checkNativeFreshness(projectRoot);
  process.exit(0);
}

if (platform === "android") {
  const legacyAppJniLibs = path.join(projectRoot, "android", "app", "src", "main", "jniLibs");
  if (fs.existsSync(legacyAppJniLibs)) {
    fs.rmSync(legacyAppJniLibs, { recursive: true, force: true });
    console.log(`[native:sync] Removed legacy app JNI libs at ${path.relative(projectRoot, legacyAppJniLibs)}`);
  }
}

syncNativeStaging(projectRoot, platform);
console.log(`[native:sync] Synced native staging for ${platform}`);
