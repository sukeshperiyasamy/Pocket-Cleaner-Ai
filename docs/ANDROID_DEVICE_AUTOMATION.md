# Android Physical-Device Testing & Automation Framework

**Project:** Pocket Cleaner (`com.offlineai.phoneassistant`)  
**Target Hardware:** Xiaomi Redmi Note 11 family (`21091116I` / `pissarroin`), Android 13 (API 33), 8 GB RAM physical tier.  
**Framework Tools:** PowerShell, Android Debug Bridge (ADB), TypeScript, Node.js Test Runner, Gradle.

---

## 1. Overview & Purpose

This framework provides repeatable, non-destructive physical device automation for Pocket Cleaner. It verifies:
1. Physical device USB connectivity, authorization status, hardware metrics, and RAM capacity.
2. Static code hygiene (TypeScript strict check, ESLint rules).
3. Full assistant test suite (86 unit tests across 20 suites covering capability registry, parameter parsing, intent routing, and memory telemetry).
4. Debug APK artifact integrity.
5. Application package installation status.
6. Android activity launch (`am start -n com.offlineai.phoneassistant/.MainActivity`).
7. Process stability (`pidof`), crash absence (`logcat AndroidRuntime:E`), and UI frame capture (`screencap`).

All tests operate under strict privacy and safety rules: no cloud round-trips, no user data deletion, and no security lock screen bypasses.

---

## 2. Prerequisites

| Component | Minimum Version | Default Location / Verification |
|---|---|---|
| **Android SDK Platform-Tools** | 34.0.0+ | `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` |
| **PowerShell** | 5.1 or 7+ | `powershell.exe` |
| **Node.js** | 20.x or 22.x | `node -v` |
| **Java JDK** | OpenJDK 17 or 21 | Android Studio JBR |
| **Device Authorization** | Android 13 | USB Debugging enabled; RSA key authorized |

---

## 3. Automation Scripts

### 3.1 Device Diagnostics Script: `scripts/android-device-check.ps1`

Verifies connectivity and displays verified native hardware telemetry.

#### Syntax & Options
```powershell
powershell -ExecutionPolicy Bypass -File scripts\android-device-check.ps1 [-DeviceId <serial>] [-RequireAppInstalled] [-AdbPath <path>]
```

| Parameter | Type | Description |
|---|---|---|
| `-DeviceId` | String | (Optional) Specific ADB serial ID (e.g. `kjizrsgekfsglvgi`). If omitted, auto-selects if exactly 1 authorized device is attached. Fails if multiple devices are ambiguous. |
| `-RequireAppInstalled` | Switch | If specified, exits with code 1 if `com.offlineai.phoneassistant` is not installed. |
| `-AdbPath` | String | (Optional) Explicit path to `adb.exe`. |

#### Example Command
```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\sukes\AppData\Local\Android\Sdk\platform-tools;" + $env:PATH
powershell -ExecutionPolicy Bypass -File scripts\android-device-check.ps1
```

#### Sample Output
```
============================================================
 Pocket Cleaner - Android Device Verification Check
============================================================
[OK] ADB located: C:\Users\sukes\AppData\Local\Android\Sdk\platform-tools\adb.exe
[OK] Target Device Selected: kjizrsgekfsglvgi
------------------------------------------------------------
 Device Telemetry:
   Manufacturer:  Xiaomi
   Model:         21091116I (pissarroin)
   Android OS:    13 (API 33)
   Architecture:  arm64-v8a
   Total RAM:     7.85 GB decimal / 7.31 GiB binary (7668744 kB total)
------------------------------------------------------------
[OK] Application 'com.offlineai.phoneassistant' is INSTALLED on device.
     APK Path: package:/data/app/.../base.apk
============================================================
 Device Check Result: PASS
============================================================
```

---

### 3.2 End-to-End Smoke Test: `scripts/android-smoke-test.ps1`

Executes the full automated pipeline from static analysis to physical device launch and screenshot verification.

#### Syntax & Options
```powershell
powershell -ExecutionPolicy Bypass -File scripts\android-smoke-test.ps1 [-DeviceId <serial>] [-SkipBuild] [-SkipUnitTests] [-DryRun] [-LaunchWaitSeconds <int>] [-ArtifactsDir <path>]
```

| Parameter | Type | Description | Default |
|---|---|---|---|
| `-DeviceId` | String | Target device serial number. | Auto-detected |
| `-SkipBuild` | Switch | Verifies existing APK instead of invoking Gradle `assembleDebug`. | `$false` |
| `-SkipUnitTests` | Switch | Skips `tsc`, `eslint`, and `npm test`. | `$false` |
| `-DryRun` | Switch | Validates checks without launching apps or installing packages. | `$false` |
| `-LaunchWaitSeconds`| Int | Seconds to wait after `am start` before screenshot capture. | `6` |
| `-ArtifactsDir` | String | Relative path for reports, logs, and screenshots. | `artifacts/android-tests` |

#### Recommended Execution Command
```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\sukes\AppData\Local\Android\Sdk\platform-tools;" + $env:PATH
powershell -ExecutionPolicy Bypass -File scripts\android-smoke-test.ps1 -SkipBuild
```

---

## 4. Test Artifacts & Report Structure

All outputs are saved to `artifacts/android-tests/` with timestamped filenames:

```
artifacts/android-tests/
├── smoke_report_20261013_103540.md     # Markdown test verdict summary
├── smoke_screenshot_20261013_103540.png # Captured PNG frame of running app
└── smoke_logcat_20261013_103540.log    # Captured logcat stream filtered for exceptions
```

### Report Verdict Format
Each check records one of four standard statuses:
- **`PASS`**: Check passed validation criteria without warning.
- **`FAIL`**: Fatal error, crash, syntax violation, or unmet assertion.
- **`BLOCKED`**: Pre-requisite step failed (e.g., launch blocked because device was unauthorized).
- **`NOT RUN`**: Step intentionally bypassed via script parameters (e.g., `-DryRun`).

---

## 5. Safety & Security Safeguards

1. **Non-Destructive Operations:** Scripts never clear user data (`pm clear`), uninstall the application, or delete local `.gguf` model files stored in private storage.
2. **Explicit User Review Unbroken:** The assistant automation validates that destructive operations (file deletion) reject autonomous execution and route to user-reviewed confirmation dialogs.
3. **No Unlocking Bypass:** The framework does not attempt lock-screen injection or bypass biometric security. The device must be in an authorized debugging state.
4. **Log Redaction:** Logcat filtering captures process errors without leaking filenames or personal storage contents.

---

## 6. Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| `No Android devices found via ADB` | Cable disconnected or USB debugging turned off | Enable Developer Options > USB Debugging on Xiaomi device. Check cable connection. Run `adb devices`. |
| `Device '...' is unauthorized` | RSA key authorization prompt pending | Unlock device screen and accept "Allow USB debugging from this computer". |
| `Multiple authorized devices attached` | More than 1 phone or emulator attached | Specify `-DeviceId <serial>` matching output of `adb devices`. |
| `Warning: Activity not started` | App already running in foreground | Expected Android behavior; script verifies process is alive using `pidof`. |
| `Screenshot file was empty` | Screen is off or secure display active | Tap screen to wake display before running smoke test. |
