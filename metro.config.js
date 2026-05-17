if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, "toReversed", {
    value() {
      return [...this].reverse();
    },
    configurable: true,
    writable: true,
  });
}

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const forceNativeWindFileSystem = process.env.NATIVEWIND_FORCE_WRITE_FILESYSTEM !== "0";

// Add wasm support for expo-sqlite
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'wasm', 'wasm.gz'],
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system only when explicitly allowed.
  // Export/E2E web builds are more stable with virtual modules.
  forceWriteFileSystem: forceNativeWindFileSystem,
});
