// metro.config.js - OffCall AI React Native Metro Configuration
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Ensure react-native-linear-gradient resolves correctly
    alias: {
      'react-native-linear-gradient': 'react-native-linear-gradient',
    },
  },
  transformer: {
    // Enable Hermes for better performance
    hermesCommand: 'hermes',
    // Enable inline requires for better performance
    inlineRequires: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);