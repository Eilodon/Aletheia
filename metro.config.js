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

// Add wasm support for expo-sqlite
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'wasm', 'wasm.gz'],
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
