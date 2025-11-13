const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce the number of files watched
config.watchFolders = [__dirname];
config.resolver.sourceExts.push('cjs');

module.exports = config;

