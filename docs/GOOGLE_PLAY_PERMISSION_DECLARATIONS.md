# Google Play Permission Declarations & Policy Justifications

**Application:** Offline AI Phone Assistant  
**Application ID:** `com.offlineai.phoneassistant`  
**Target Policy:** Google Play Photo and Video Permissions Policy & Sensitive Permissions

---

## 1. Summary of Declared Manifest Permissions

| Permission Name | Protection Level / Scope | Target API Range | App Usage Rationale |
| :--- | :--- | :--- | :--- |
| `READ_MEDIA_IMAGES` | Dangerous / Policy-Sensitive | API 33+ (Android 13+) | Required to query MediaStore for image storage footprint, surface screenshots, and find large images. |
| `READ_MEDIA_VIDEO` | Dangerous / Policy-Sensitive | API 33+ (Android 13+) | Required to query MediaStore for video storage footprint, surface screen recordings, and filter large videos (>100 MB). |
| `READ_MEDIA_AUDIO` | Dangerous / Standard Media | API 33+ (Android 13+) | Required to query MediaStore for audio/music storage footprint and calculate category totals. |
| `READ_EXTERNAL_STORAGE` | Dangerous / Legacy Scoped | API 24–32 (`maxSdkVersion="32"`) | Legacy media access on Android 7.0 through Android 12. Strictly scoped; does not apply to Android 13+. |
| `WRITE_EXTERNAL_STORAGE` | Dangerous / Legacy Scoped | API 24–29 (`maxSdkVersion="32"`) | Legacy file deletion and media update on Android 7.0 through Android 10. |
| `INTERNET` | Normal | All APIs | Included by React Native runtime for web links (e.g. opening privacy policy in external browser). |
| `ACCESS_NETWORK_STATE` | Normal | All APIs | Used by image and system utilities to verify offline state. |
| `VIBRATE` | Normal | All APIs | Tactile haptic feedback on button presses and deletion confirmations. |

---

## 2. Policy-Sensitive Permissions: Deep Justification

### 2.1 Photo and Video Permissions (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`)

Google Play's **Photo and Video Permissions Policy** enforces that broad access to media libraries is permitted **only** when an app's **core functionality** fundamentally requires scanning or managing the user's media collection.

#### Core Functionality Justification
The App's primary purpose is an **on-device storage analyzer and device assistant** ("pocket cleaner"):
1. **Total Storage Partition Breakdown:** The app scans MediaStore tables in-memory to calculate and display the total gigabytes occupied by images, videos, and audio.
2. **Identification of Large Candidate Files:** The app identifies the largest space-consuming media items across the device (e.g., videos larger than 100 MB or 500 MB) so the user can reclaim device storage.
3. **Clutter Detection:** The app identifies screenshots and screen recordings cluttering device memory.
4. **Offline AI Assistant Tool Grounding:** The on-device assistant answers questions such as *"How much storage do my videos take?"* and *"What are my 5 largest media files?"* by querying real local MediaStore counts.

#### Why the Android Photo Picker is Insufficient
Google requires developers to justify why the system Photo Picker cannot be used instead of broad permissions:
> *"The Android Photo Picker requires the user to manually browse and tap specific individual photos or videos to grant access to the app. A storage analyzer cannot calculate total partition consumption, cannot surface unknown large video files, and cannot identify screenshot clutter if it depends on the user manually selecting every file beforehand. Broad MediaStore querying is technically essential to provide automated storage auditing and space calculation across the device."*

---

## 3. High-Risk Permissions NOT Used (Positive Compliance)

To safeguard user trust and pass Google Play review without friction, the application deliberately avoids high-risk permissions:

1. **`MANAGE_EXTERNAL_STORAGE` ("All Files Access"):**
   - **NOT REQUESTED.**
   - The app does not request raw broad file system access.
   - For custom user-specified folders, the app strictly uses the scoped **Storage Access Framework (SAF)** tree picker (`ACTION_OPEN_DOCUMENT_TREE`), allowing users to grant access only to specific directories.
2. **`SYSTEM_ALERT_WINDOW` ("Display over other apps"):**
   - **REMOVED from Production Manifest.**
   - Retained only in `src/debug/AndroidManifest.xml` for React Native developer error overlay. Production release builds do not request this overlay permission.
3. **Location & Microphone Permissions (`ACCESS_FINE_LOCATION`, `RECORD_AUDIO`):**
   - **NOT REQUESTED.** The AI assistant operates 100% via text-based natural language interaction.

---

## 4. Google Play Console Declaration Form Responses

When submitting the App in the Google Play Console, use the following exact responses in the **App content $\rightarrow$ Photos and videos permissions declaration**:

### Question 1: Core feature category
- **Select:** **"File management / Device storage manager"**

### Question 2: Why does your app need broad access to photos and videos?
- **Copy & Paste:**
  > Offline AI Phone Assistant is an on-device storage analyzer and cleanup assistant. Its core purpose is to calculate storage category breakdowns, identify large media files occupying significant storage, and locate clutter such as old screenshots and screen recordings. Broad MediaStore access is required because the system Photo Picker cannot compute aggregate storage metrics or discover large files across the device without upfront user selection. All processing is 100% on-device; no media files or telemetry are transmitted to any external server.

### Question 3: Link to video demonstration
- **Provide:** URL to unlisted YouTube video showing the media permission request, storage category scan, large file filtering, and explicit user-confirmed cleanup flow.
