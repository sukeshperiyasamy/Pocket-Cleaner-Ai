# Privacy Policy for Offline AI Phone Assistant

**Last Updated:** October 13, 2026  
**Effective Date:** October 13, 2026  
**Application ID:** `com.offlineai.phoneassistant`  

---

> [!NOTE]
> **Developer Notice:** This Privacy Policy draft is constructed directly from the actual source code, Android Manifest declarations, and dependency behavior of the Offline AI Phone Assistant application. Before hosting this document on a public URL, replace all bracketed items (e.g. `[Pending Developer Legal Name]`) with your verified legal and contact information.

---

## 1. Introduction & Core Philosophy

**[Pending Developer Legal Name / Company Name]** ("we", "our", or "us") provides the **Offline AI Phone Assistant** mobile application (the "App"). We believe that your device storage and personal files are private. 

The App is designed from the ground up as a **100% local, offline-first application**. We do not collect, transmit, store, sell, or monetize your personal files, conversations, or device telemetry. All storage indexing, file previews, and artificial intelligence operations execute exclusively on your local device hardware.

---

## 2. Information Handled by the Application

### 2.1 On-Device Storage & Media Access
To perform its core functions as a device storage analyzer and assistant, the App requests permission to access files on your device:
- **Media Files (Photos, Videos, Audio):** The App queries Android's native `MediaStore` to index file counts, calculate category storage totals, and identify large files, screenshots, and screen recordings.
- **Custom Folders (Storage Access Framework):** If you choose to inspect custom directories, the App accesses only the specific folder tree you authorize using Android's system file picker (`ACTION_OPEN_DOCUMENT_TREE`).
- **Data Scope:** File names, file sizes, MIME types, and timestamps are processed strictly in device memory to generate visual storage breakdowns. File contents are never transmitted off your device.

### 2.2 On-Device Artificial Intelligence & Query Processing
- **Local Model Execution:** The AI assistant uses on-device language models powered by `llama.rn` (llama.cpp) running entirely on your phone's processor.
- **Local Context Grounding:** When you ask questions about your storage or memory, real metrics retrieved from your device (such as partition space or system RAM) are supplied directly to the local model.
- **Zero Cloud Transmission:** Your prompts, questions, conversation logs, and grounded device metrics are never transmitted to any external server, third-party API, or cloud service.

### 2.3 System & Hardware Telemetry
- **RAM Telemetry:** The App queries Android's `ActivityManager.MemoryInfo` to display accurate system memory metrics (total RAM, available RAM, and memory pressure). This data is displayed to you in real time and is never logged externally.

---

## 3. Network Behavior & Third-Party SDKs

- **No Remote Servers:** We do not operate backend servers that receive data from this App.
- **No Third-Party Analytics:** The App contains no tracking, telemetry, or user behavior analytics SDKs (e.g., no Firebase Analytics, Google Analytics, Sentry, Segment, or Facebook SDKs).
- **No Advertising:** The App is completely ad-free and contains no advertisement networks or tracking libraries.
- **Network Permissions:** Android's standard framework includes basic network permissions (`android.permission.INTERNET`, `android.permission.ACCESS_NETWORK_STATE`) for verifying network state. The App does not use these permissions to upload your personal files or telemetry. The App operates fully in Airplane mode.

---

## 4. File Deletion & User Safeguards

- **No Autonomous Deletion:** The App's AI assistant is strictly read-only and is architecturally barred from initiating file modifications or deletions.
- **Explicit Confirmation Required:** Any cleanup action requires explicit, step-by-step confirmation by the user in a dedicated deletion modal that itemizes the exact files and bytes to be deleted.
- **Operating System Safeguards:** File deletions are mediated through Android's system deletion APIs (`MediaStore.createDeleteRequest` or `DocumentsContract.deleteDocument`), respecting standard operating system safeguards.

---

## 5. Data Retention & App Backup

- **Data Retention:** Because we collect no data on external servers, we retain no data about you.
- **Local Storage:** Model files (`.gguf`) and cached storage summaries are stored in the App's sandboxed local directory on your device (`/data/user/0/com.offlineai.phoneassistant/`). You can clear this data at any time via Android Settings $\rightarrow$ Apps $\rightarrow$ Storage $\rightarrow$ Clear Data.
- **Device Backups:** If Android Cloud Backup is enabled on your device, standard non-sensitive application settings (such as UI theme preferences) may be included in your personal Google Drive backup per your device settings.

---

## 6. Children's Privacy

The App does not collect personal data from anyone, including children under the age of 13 (or under the applicable age of digital consent in your jurisdiction). The App is rated for General Audiences (PEGI 3 / Everyone).

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be posted with an updated "Effective Date". Because the App does not collect contact information, we encourage you to review this policy periodically within the App or on our publication page.

---

## 8. Contact Information

If you have questions, concerns, or requests regarding this Privacy Policy or the App's local privacy architecture, please contact:

- **Entity:** [Pending Developer Legal / Company Name]
- **Contact Email:** [Pending Developer Support Email — e.g. support@example.com]
- **Address:** [Pending Developer Physical Address / Jurisdiction]
- **Repository / Support Page:** [Pending Public Issue Tracker / Website]
