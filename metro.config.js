const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Explicitly include audio file extensions so Metro bundles them in production
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  "mp3",
  "m4a",
  "wav",
  "ogg",
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
