# Google Play Data Safety Section Worksheet

**Application:** Offline AI Phone Assistant (`com.offlineai.phoneassistant`)  
**Standard:** Google Play Console Data Safety Guidance  
**Audit Basis:** Verified source code, dependencies, and network architecture  

---

## 1. Google Play Data Safety Questionnaire Summary

Google Play defines **"Collection"** as transmitting data off the device to an external server (first-party server or third-party SDK). Data that is accessed and processed **strictly on-device** and never transmitted off the user's phone does **not** count as "collected" under Play Console Data Safety rules.

### Overall Declaration
- **Does your app collect or share any user data?** **NO**
- **Is all user data handled off-device?** **NO** (All processing is 100% on-device)
- **Does your app share user data with other companies or organizations?** **NO**
- **Is data encrypted in transit?** **N/A** (No data is transmitted over the network)
- **Can users request that their data be deleted?** **YES** (Users can delete files via the in-app deletion flow or clear local app storage via Android Settings)

---

## 2. Category-by-Category Data Safety Responses

| Google Play Data Type | Accessed on Device? | Collected (Off-Device)? | Shared with Third Parties? | Processing Purpose |
| :--- | :---: | :---: | :---: | :--- |
| **Location** | **No** | **No** | **No** | Not accessed or requested. |
| **Personal Info** (Name, Email, Phone, Address) | **No** | **No** | **No** | No user registration or login required. |
| **Financial Info** (Credit card, bank details) | **No** | **No** | **No** | App is free; no in-app purchases or payment SDKs. |
| **Health and Fitness** | **No** | **No** | **No** | Not accessed. |
| **Messages** (SMS, chat, email) | **No** | **No** | **No** | Not accessed. |
| **Photos and Videos** | **Yes (Locally)** | **No** | **No** | Processed exclusively on-device via `MediaStore` to calculate storage usage and display file sizes. Never uploaded. |
| **Audio Files** | **Yes (Locally)** | **No** | **No** | Processed exclusively on-device to index audio storage footprint. Never uploaded. |
| **Files and Docs** | **Yes (Locally)** | **No** | **No** | Custom directories accessed only when user explicitly selects a folder via Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`). |
| **Calendar** | **No** | **No** | **No** | Not accessed. |
| **Contacts** | **No** | **No** | **No** | Not accessed. |
| **App Activity** (Page views, clicks) | **No** | **No** | **No** | No user behavior tracking or analytics SDKs present. |
| **Web Browsing History** | **No** | **No** | **No** | Not accessed. |
| **App Info and Performance** (Crash logs, diagnostics) | **Yes (RAM telemetry on-device)** | **No** | **No** | Real-time RAM metrics queried locally via `ActivityManager.MemoryInfo` and displayed on screen. Never transmitted off-device. |
| **Device or Other Identifiers** (IMEI, MAC, Advertising ID) | **No** | **No** | **No** | No device tracking identifiers requested or collected. |

---

## 3. Data Safety Security Practices

1. **Encryption in Transit:**
   - **Response in Console:** Select **"Not applicable"** or **"Data is not transmitted off-device"**.
2. **Data Deletion Mechanism:**
   - **Response in Console:** **"Yes"**.
   - **Details:** The app provides in-app itemized file deletion (requiring explicit user confirmation). Users can also wipe all local model weights, cache, and settings instantly via Android OS: `Settings > Apps > Offline AI Phone Assistant > Storage > Clear Data`.
3. **Independent Security Review:**
   - **Response in Console:** **"No"** (standard for non-enterprise utility apps; independent third-party MASA certification is not required for tools without cloud accounts).
4. **Families Policy:**
   - The app does not specifically target children under 13. Target audience is General (Everyone).

---

## 4. Verification & Third-Party SDK Audit Evidence

To verify this Data Safety declaration against Google Play enforcement scrutiny:
- **Dependency Audit:** Inspected `package.json` and `android/app/build.gradle`.
  - Zero analytics libraries (no `@react-native-firebase/analytics`, no Google Analytics, no Segment, no Sentry, no Mixpanel, no Adjust, no AppsFlyer).
  - Zero advertisement SDKs (no Google Mobile Ads, no Unity Ads, no AppLovin).
- **Network Traffic Audit:**
  - AI Assistant inference executes via `llama.rn` (llama.cpp C++ runtime) on device.
  - Zero HTTP requests are initiated during model loading, inference, memory querying, or storage scanning.
  - Works identically with Wi-Fi and Cellular data turned off (Airplane mode).
