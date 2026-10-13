# Release Changelog — Offline AI Phone Assistant

**Package:** `com.offlineai.phoneassistant`  
**Current Version:** `1.0.0` (Build `1`)  

---

## [1.0.0] — 2026-10-13

### Initial Production Candidate Release (Phase 6)

#### 🧠 On-Device Artificial Intelligence
- **Local LLM Engine:** Integrated `llama.rn@0.12.9` with `llama.cpp` runtime for genuinely local offline inference on device CPU/GPU.
- **Local Tool Registry:** Added 7 approved, typed, read-only tools (`get_storage_summary`, `get_storage_categories`, `find_large_files`, `find_screenshots`, `find_screen_recordings`, `get_memory_summary`, `search_accessible_files`).
- **Grounded Tool Context:** Assistant responses are grounded exclusively in real system metrics; the model never hallucinates numbers or invents file statistics.
- **Dual Inference Support:** Supports local GGUF models in sandboxed app storage with instant, rule-based fallback when models are not loaded.

#### 📊 Storage Analysis & Cleanup Safeguards
- **Deep Storage Analyzer:** Fast indexing of media categories (Images, Videos, Audio) and custom directories.
- **Smart Clutter Detection:** Dedicated filters for screenshots and screen recordings.
- **Large File Filtering:** Threshold filters for files >10 MB, >50 MB, >100 MB, and >500 MB.
- **Scoped Storage Access:** MediaStore queries combined with Storage Access Framework (SAF) tree picker (`ACTION_OPEN_DOCUMENT_TREE`).
- **Strict Deletion Protection:** The AI assistant is strictly read-only and barred from modifying files. File deletion requires explicit, multi-step user confirmation with exact itemization of names, sizes, and total space to be freed.

#### ⚡ System Telemetry & Performance
- **Honest RAM Telemetry:** Real Android memory metrics queried directly via `ActivityManager.MemoryInfo` and kernel `/proc/meminfo`.
- **Educational Guidance:** Honest explanation of Android's Low Memory Killer (LMK) architecture, discouraging harmful third-party "RAM booster" practices.
- **RAM Discrepancy Resolution:** Validated kernel byte metrics ($7,852,793,856$ bytes on 8 GB hardware) across binary (IEC) and decimal (SI) representations with a full regression test suite.
- **Navigation & Layout:** Safe-area insets optimized for three-button Android system navigation and gesture modes.

#### 🛡️ Google Play Policy & Release Hardening
- **Target SDK 36:** Fully complies with Google Play target API requirements (exceeding API 34/35 requirements for 2024–2026).
- **Manifest Cleanliness:** Removed `SYSTEM_ALERT_WINDOW` from production release builds.
- **Zero Cloud Telemetry:** No analytics SDKs, advertising libraries, or user tracking.
- **Release Automation:** Added automated `npm run preflight` validation script and Gradle bundleRelease workflow.
- **Play App Signing Configuration:** Keystores and signing properties isolated from Git with secure developer fallback.
