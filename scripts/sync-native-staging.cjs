#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { syncNativeStaging } = require("../modules/aletheia-core-module/plugin");

const platform = process.argv[2] || "android";
const projectRoot = path.resolve(__dirname, "..");

if (platform === "android") {
  const legacyAppJniLibs = path.join(projectRoot, "android", "app", "src", "main", "jniLibs");
  if (fs.existsSync(legacyAppJniLibs)) {
    fs.rmSync(legacyAppJniLibs, { recursive: true, force: true });
    console.log(`[native:sync] Removed legacy app JNI libs at ${path.relative(projectRoot, legacyAppJniLibs)}`);
  }
}

syncNativeStaging(projectRoot, platform);
console.log(`[native:sync] Synced native staging for ${platform}`);
