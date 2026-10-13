#!/usr/bin/env node

/**
 * Release Preflight Script — Offline AI Phone Assistant
 * Validates configuration, manifest permissions, versioning, and code quality before generating release artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
let hasErrors = false;

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

function checkPass(msg) {
  console.log(`  [PASS] ${msg}`);
}

function checkWarn(msg) {
  console.log(`  [WARN] ${msg}`);
}

function checkFail(msg) {
  console.error(`  [FAIL] ${msg}`);
  hasErrors = true;
}

logHeader('1. Application ID & Version Consistency');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
  const buildGradle = fs.readFileSync(path.join(rootDir, 'android/app/build.gradle'), 'utf8');

  const expectedAppId = 'com.offlineai.phoneassistant';
  const expoAppId = appJson.expo?.android?.package;
  const expoVersionCode = appJson.expo?.android?.versionCode;
  const pkgVersion = pkg.version;
  const expoVersion = appJson.expo?.version;

  if (expoAppId === expectedAppId) {
    checkPass(`Application ID in app.json matches: ${expectedAppId}`);
  } else {
    checkFail(`Application ID mismatch: expected ${expectedAppId}, found ${expoAppId}`);
  }

  if (buildGradle.includes(`applicationId '${expectedAppId}'`) || buildGradle.includes(`applicationId "${expectedAppId}"`)) {
    checkPass(`Application ID in build.gradle matches: ${expectedAppId}`);
  } else {
    checkFail(`Application ID not found in android/app/build.gradle`);
  }

  if (pkgVersion === expoVersion) {
    checkPass(`Version string in package.json and app.json match: ${pkgVersion}`);
  } else {
    checkFail(`Version string mismatch: package.json has ${pkgVersion}, app.json has ${expoVersion}`);
  }

  if (typeof expoVersionCode === 'number' && expoVersionCode >= 1) {
    checkPass(`Android versionCode configured: ${expoVersionCode}`);
  } else {
    checkFail(`Invalid versionCode in app.json: ${expoVersionCode}`);
  }
} catch (err) {
  checkFail(`Failed to inspect package or config files: ${err.message}`);
}

logHeader('2. Android Manifest & Permissions Policy Audit');
try {
  const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');

  // Forbidden permissions in production release
  const forbiddenPermissions = [
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.MANAGE_EXTERNAL_STORAGE',
    'android.permission.WRITE_SETTINGS',
    'android.permission.RECORD_AUDIO',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.READ_CONTACTS',
    'android.permission.READ_CALENDAR',
  ];

  for (const perm of forbiddenPermissions) {
    if (manifestContent.includes(perm)) {
      checkFail(`Dangerous/policy-restricted permission detected in main AndroidManifest.xml: ${perm}`);
    } else {
      checkPass(`Forbidden permission absent: ${perm}`);
    }
  }

  // Required permissions
  const requiredPermissions = [
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
  ];

  for (const perm of requiredPermissions) {
    if (manifestContent.includes(perm)) {
      checkPass(`Required media permission present: ${perm}`);
    } else {
      checkFail(`Missing required media permission in main manifest: ${perm}`);
    }
  }
} catch (err) {
  checkFail(`Failed to inspect AndroidManifest.xml: ${err.message}`);
}

logHeader('3. Signing Credentials Status');
try {
  const rootKeystoreProps = path.join(rootDir, 'keystore.properties');
  const appKeystoreProps = path.join(rootDir, 'android/app/keystore.properties');
  const hasProps = fs.existsSync(rootKeystoreProps) || fs.existsSync(appKeystoreProps);
  const hasEnv = Boolean(process.env.MYAPP_UPLOAD_STORE_FILE);

  if (hasProps || hasEnv) {
    checkPass('Production upload keystore configuration detected.');
  } else {
    checkWarn('No production upload keystore configured (keystore.properties not found).');
    checkWarn('Release builds will use debug keystore fallback. Configure upload key prior to Play Store submission.');
  }

  // Ensure keystores are protected in .gitignore
  const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
  if (gitignore.includes('*.keystore') && gitignore.includes('keystore.properties')) {
    checkPass('Keystores and keystore.properties are securely ignored by .gitignore.');
  } else {
    checkFail('.gitignore does not properly protect keystores or keystore.properties.');
  }
} catch (err) {
  checkFail(`Failed to audit signing credential configuration: ${err.message}`);
}

logHeader('4. Code Quality & Test Validation');
try {
  console.log('  -> Running TypeScript typecheck (tsc --noEmit)...');
  execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'inherit' });
  checkPass('TypeScript type check passed.');

  console.log('  -> Running ESLint...');
  execSync('npm run lint', { cwd: rootDir, stdio: 'inherit' });
  checkPass('ESLint check passed.');

  console.log('  -> Running Unit Tests (npm test)...');
  execSync('npx tsx tests/unit.test.ts', { cwd: rootDir, stdio: 'inherit' });
  checkPass('Unit test suites passed.');
} catch (err) {
  checkFail(`Code quality or test execution failed: ${err.message}`);
}

logHeader('Release Preflight Summary');
if (hasErrors) {
  console.error('\n  [RESULT] PREFLIGHT FAILED: Please fix the errors listed above before releasing.\n');
  process.exit(1);
} else {
  console.log('\n  [RESULT] PREFLIGHT PASSED: Project meets release readiness requirements.\n');
  process.exit(0);
}
