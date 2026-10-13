// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: ["dist/**", "android/**", "modules/**/android/**", "artifacts/**", "scratch/**", "*.log"],
  },
  expoConfig,
]);
