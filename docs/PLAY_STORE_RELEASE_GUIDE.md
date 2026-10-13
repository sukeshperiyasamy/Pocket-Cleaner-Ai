# Google Play Store Release Guide

**Application:** Offline AI Phone Assistant  
**Application ID:** `com.offlineai.phoneassistant`  
**Target Environment:** Google Play Console (Internal Testing / Closed Testing / Production)

---

## 1. Overview & Release Architecture

This application uses standard Android App Bundle (`.aab`) packaging with **Play App Signing**. 

In modern Google Play releases:
1. **Developer Upload Key:** You sign the `.aab` file locally using your **Upload Key**.
2. **Google Play Verification:** Google Play verifies your upload key signature upon receiving the `.aab`.
3. **End-User Distribution:** Google Play strips the upload signature and signs device-optimized split APKs with the master **App Signing Key** managed securely by Google's infrastructure.

This architecture ensures that if your local upload key is ever compromised or lost, you can request an upload key reset from Google Play Developer Support without having to re-release under a new application ID.

---

## 2. Generating & Protecting the Upload Key

> [!IMPORTANT]
> **Never commit keystores, passwords, or properties files to Git.**  
> The project's `.gitignore` is pre-configured to ignore `*.keystore`, `*.jks`, `keystore.properties`, and `signing.properties`.

### Step 2.1: Generate the Upload Key
Run the following command using Java's `keytool` (included in your JDK / Android Studio JBR):

```powershell
# From the project root or android/app/ directory:
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair `
  -v `
  -keystore android/app/upload-keystore.jks `
  -alias upload `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storetype JKS
```

When prompted:
- Enter a strong keystore password.
- Enter your organizational details (Name, Organization, City, Country).
- Enter the key password (or press Enter to use the keystore password).

### Step 2.2: Configure `keystore.properties`
Create a file named `keystore.properties` in the project root (or inside `android/`):

```properties
storeFile=upload-keystore.jks
storePassword=YOUR_SECURE_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_SECURE_KEY_PASSWORD
```

`android/app/build.gradle` is pre-configured to automatically load this file when building release variants. If this file is absent (e.g. in test environments), it safely falls back to a development keystore so local compilation can still be validated.

### Step 2.3: Secure Backup & Disaster Recovery
- **Backup:** Store `upload-keystore.jks` and its passwords in a secure password manager (e.g. 1Password, Bitwarden, KeePass) or encrypted cold storage.
- **Lost Key Recovery:** If you lose your upload key:
  1. Open the [Google Play Console](https://play.google.com/console).
  2. Navigate to your app $\rightarrow$ **Release** $\rightarrow$ **Setup** $\rightarrow$ **App integrity**.
  3. Select the **App Signing** tab.
  4. Click **Request upload key reset** and follow the instructions to generate and register a new PEM certificate.

---

## 3. Preflight & Release Build Execution

### Step 3.1: Execute Preflight Check
Before compiling the production bundle, run the automated release preflight script:

```bash
npm run preflight
```

This verifies:
- `applicationId`, version strings, and `versionCode`.
- That forbidden or policy-sensitive permissions (e.g. `SYSTEM_ALERT_WINDOW`, `MANAGE_EXTERNAL_STORAGE`) are absent.
- That TypeScript types compile with 0 errors (`tsc --noEmit`).
- That ESLint passes with 0 errors.
- That all 80 unit test assertions pass.

### Step 3.2: Build the Production App Bundle (.aab)
Execute the bundle generation script:

```powershell
# Ensure Java and Android SDK paths are set in your shell:
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;C:\Program Files\nodejs;C:\Users\sukes\AppData\Roaming\npm;C:\Program Files\Git\cmd;" + $env:Path

# Build release bundle:
cd android
.\gradlew.bat bundleRelease
```

Or run via npm:
```bash
npm run build:bundle
```

The output bundle will be created at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 4. Validating the App Bundle Before Upload

### Step 4.1: Inspect Bundle Contents with `bundletool`
Download [bundletool](https://github.com/google/bundletool/releases) and verify the `.aab`:

```bash
# Verify bundle integrity
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=app.apks --mode=universal

# Install directly to attached test device
bundletool install-apks --apks=app.apks
```

### Step 4.2: Verify Offline & Independent Operation
1. Disconnect the device from USB.
2. Enable **Airplane Mode** (disable Wi-Fi and Cellular data).
3. Launch the app and verify:
   - Dashboard loads device storage and memory metrics without errors.
   - Storage categories and large file scans complete normally.
   - Assistant responds with grounded rules or loaded local LLM.
   - File deletion safeguards function as intended (requesting explicit user confirmation).

---

## 5. Play Console Submission Walkthrough

1. **Create App:**
   - Log in to Google Play Console $\rightarrow$ **Create app**.
   - App name: `Offline AI Phone Assistant`
   - Default language: `English (United States)`
   - App or game: `App`
   - Free or paid: `Free`
2. **Internal Testing Track:**
   - Navigate to **Testing** $\rightarrow$ **Internal testing**.
   - Create a new release and upload `app-release.aab`.
   - Add testers via email list.
3. **Store Listing & Declarations:**
   - Follow `docs/PLAY_STORE_LISTING.md` for text and metadata.
   - Follow `docs/PLAY_STORE_ASSETS_CHECKLIST.md` for graphic assets.
   - Follow `docs/PRIVACY_POLICY_DRAFT.md` for the public privacy policy URL.
   - Follow `docs/GOOGLE_PLAY_DATA_SAFETY_WORKSHEET.md` for the Data Safety form.
   - Follow `docs/GOOGLE_PLAY_PERMISSION_DECLARATIONS.md` for media permission forms.
4. **Rollout Promotion:**
   - Internal Testing $\rightarrow$ Closed Testing (Closed Alpha/Beta) $\rightarrow$ Open Testing $\rightarrow$ Production.
