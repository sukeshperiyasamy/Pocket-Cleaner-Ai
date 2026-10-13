#!/usr/bin/env node

/**
 * Production Bundle Build Script
 * Configures the build environment and runs Gradle bundleRelease.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');

// Resolve JAVA_HOME if not already in environment
if (!process.env.JAVA_HOME) {
  const commonJavaPaths = [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.108-hotspot',
  ];
  for (const p of commonJavaPaths) {
    if (fs.existsSync(p)) {
      process.env.JAVA_HOME = p;
      break;
    }
  }
}

// Resolve ANDROID_HOME if not already in environment
if (!process.env.ANDROID_HOME) {
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE + '\\AppData\\Local');
  const defaultSdk = path.join(localAppData, 'Android', 'Sdk');
  if (fs.existsSync(defaultSdk)) {
    process.env.ANDROID_HOME = defaultSdk;
  }
}

// Prepend Java, Node, and SDK platform-tools to PATH
const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin') : '';
const platformTools = process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : '';
const currentPath = process.env.PATH || '';
process.env.PATH = [javaBin, platformTools, currentPath].filter(Boolean).join(path.delimiter);

console.log('=' .repeat(60));
console.log(' Building Android Release Bundle (.aab)...');
console.log('=' .repeat(60));
console.log(`JAVA_HOME:    ${process.env.JAVA_HOME || 'Not set'}`);
console.log(`ANDROID_HOME: ${process.env.ANDROID_HOME || 'Not set'}`);
console.log(`Working Dir:  ${androidDir}\n`);

try {
  const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  execSync(`${gradlewCmd} bundleRelease`, {
    cwd: androidDir,
    stdio: 'inherit',
    env: process.env,
  });

  const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (fs.existsSync(aabPath)) {
    const stats = fs.statSync(aabPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('\n' + '=' .repeat(60));
    console.log(' SUCCESS: Android App Bundle generated successfully!');
    console.log(` Location: ${aabPath}`);
    console.log(` Size:     ${sizeMb} MB`);
    console.log('=' .repeat(60) + '\n');
  }
} catch (err) {
  console.error('\n[ERROR] Gradle bundleRelease failed:', err.message);
  process.exit(1);
}
