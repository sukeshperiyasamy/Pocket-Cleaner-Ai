# Offline AI Assistant Diagnostics & Failure Mode Analysis

**Project:** Pocket Cleaner (`com.offlineai.phoneassistant`)  
**Target Hardware:** Xiaomi Redmi Note 11 family (`21091116I` / `pissarroin`), Android 13 (API 33).  
**Author:** Senior Android & AI Inference Specialist  
**Date:** October 2026

---

## 1. Failure Mode Taxonomy & Root Cause Analysis

During Phase B failure reproduction, queries against the baseline assistant pipeline were classified across 10 distinct failure categories:

| Failure Category | Concrete Manifestation | Root Cause | Implemented Resolution |
|---|---|---|---|
| **Intent Recognition Failure** | "What's eating up my storage?" routed to StatFs partition summary; "Clean junk files" returned null. | Rigid substring match (`what is using` only; missing `eating up`, `clean junk`). | Natural-language normalizer supporting broad synonym dictionaries and compound phrases. |
| **Parameter Extraction Failure** | "Show me my ten biggest files" ignored "ten"; "Videos larger than 500 MB" defaulted limits. | Limit extraction did not parse spelled-out English word numbers; only matched digits. | `extractLimit()` parses words ("one" through "twenty-five") and digits, clamping to [1, 25]. |
| **Unsupported Capability Handling** | "Remove unnecessary apps" and "Disable ads" returned generic fallback suggestions. | Unhandled intents returned `null`, concealing OS boundaries from the user. | `UNSUPPORTED_CAPABILITIES` catalog provides explicit, transparent reasons and alternatives. |
| **Destructive Command Bypass Risk**| "Delete all screenshots" routed to read-only `find_screenshots` without rejecting deletion. | Substring match on "screenshot" triggered before checking for destructive verbs. | `isDestructiveRequest()` pre-empts tool matching; rejects direct deletion and directs to Deep Cleanup. |
| **Misclassification Failure** | "Open storage settings" executed `get_storage_summary`. | "storage" keyword caught generic storage tool instead of navigation intent. | `system_navigation` intent directs user to Android Settings > Storage. |
| **Retrieval Scope Mismatch** | Indexed media files confused with total disk usage. | Lack of clear distinction between MediaStore (media files) and StatFs (partition). | Explicit boundary notes in tool results clarify data origin and partition scope. |
| **App Process Memory Isolation**| "Show my app's memory usage" returned total hardware RAM only. | No parameter allowed user to request app-specific heap/RSS memory. | Added `highlightAppUsage: true` flag to `get_memory_summary`, placing process RAM at top. |
| **Model Context Overflow** | Returning hundreds of file items caused local LLM to truncate or OOM. | Unbounded list queries exceeded 2048-token context window. | Hard clamp on result limits (max 25 items, default 10) and compacted 1-line metadata format. |
| **Untrusted Metadata Injection** | Malicious filenames (e.g. containing markdown, brackets, system tokens) fed to LLM. | Raw filenames passed into prompt without escaping. | `sanitizeMetadataString()` strips delimiters, control characters, and limits string length. |
| **Child Process Hanging** | PowerShell automation scripts stalled on nested `powershell` calls. | Child PowerShell instances hung waiting for standard input. | Script calls invoked directly within host execution engine using `$?` return verification. |

---

## 2. Mandatory RAM Telemetry Investigation Ground Truth

### 2.1 The Mystery
A previous project document stated:
> "Device RAM: Approximately 4 GB... However, native telemetry reported approximately 7.85 GB."

Was this an Android unit conversion defect, an arithmetic bug in the Kotlin native module, or incorrect documentation?

### 2.2 Native Telemetry Audit & Evidence
We inspected the physical hardware directly via ADB on the attached Xiaomi device (`21091116I`):

#### 1. Linux Kernel Hardware Memory (`/proc/meminfo`)
```bash
adb -s kjizrsgekfsglvgi shell cat /proc/meminfo
```
**Raw Kernel Output:**
```
MemTotal:        7668744 kB
MemFree:          190808 kB
MemAvailable:    2032256 kB
Buffers:            3396 kB
Cached:          2067052 kB
SwapTotal:       6291452 kB
SwapFree:        2855920 kB
```
- `MemTotal` reported by the Linux kernel is **`7,668,744 kB`** = **`7,852,793,856 bytes`**.

#### 2. Android ActivityManager Dumpsys
```bash
adb -s kjizrsgekfsglvgi shell dumpsys meminfo
```
**Raw Android System Output:**
```
Total RAM: 7,668,744K (status normal)
Free RAM: 2,514,244K ( 482,008K cached pss + 2,032,236K available)
Used RAM: 4,772,500K (status normal)
```

#### 3. Android `ActivityManager.MemoryInfo.totalMem`
The Kotlin native module (`DeviceMetricsModule.kt`) queries:
```kotlin
val memoryInfo = ActivityManager.MemoryInfo()
activityManager.getMemoryInfo(memoryInfo)
val totalBytes = memoryInfo.totalMem
```
`memoryInfo.totalMem` returns `7,852,793,856` bytes directly from the kernel page tables.

### 2.3 Unit Conversions & Discrepancy Resolution
1. **Decimal SI Units ($10^9$ bytes/GB):**
   $$\frac{7,852,793,856}{1,000,000,000} \approx \mathbf{7.85\text{ GB}}$$
   *(This is the value shown in Android Settings > About Phone and by `android.text.format.Formatter`).*
2. **Binary IEC Units ($1024^3$ bytes/GiB):**
   $$\frac{7,852,793,856}{1,073,741,824} \approx \mathbf{7.31\text{ GiB}}$$
   *(This is the binary gigabyte value shown by `formatBytes()` in JavaScript).*

### 2.4 Conclusive Finding
The physical phone attached (`kjizrsgekfsglvgi`) is an **8 GB hardware tier** device (Xiaomi 11i Hypercharge / Redmi Note 11 Pro 5G India, model `21091116I`, codename `pissarroin`). The 8 GB LPDDR4X chip exposes 7.85 GB ($7,668,744\text{ kB}$) to the Linux kernel after firmware baseband reservations.

**Conclusion:** The native module telemetry was **100% correct**. The initial "4 GB" specification was an inaccurate documentation assumption. The codebase now contains unit tests (Suites 19 and 20) confirming accurate binary vs decimal conversions and dynamic device-tier independence across 2 GB, 4 GB, 6 GB, 8 GB, 12 GB, and 16 GB Android devices.

---

## 3. Data Retrieval Sources & Scope Boundaries

Pocket Cleaner enforces strict data isolation based on Android security specifications:

| Metric Category | API Source | Scope Included | Scope Excluded |
|---|---|---|---|
| **Storage Partition Metrics** | `android.os.StatFs("/data")` | Whole partition total, used, and free bytes. | File paths, folder breakdowns, app-specific data. |
| **Indexed Media Files** | Android `MediaStore` ContentResolver | Accessible Shared Storage: Images, Videos, Audio, Downloaded Documents. | Private app sandboxes (`/data/data/*`), system partitions, ungranted folders. |
| **Deep Candidate Scans** | MediaStore Queries with Album / MIME filters | Screenshots album, ScreenRecorder folder, APK files, large files. | Hidden directories, encrypted system files. |
| **System Memory Metrics** | `ActivityManager.MemoryInfo` | Kernel physical page totals, system available memory, low-memory alert state. | Individual third-party app memory breakdowns. |
| **Assistant Process Memory** | `Debug.MemoryInfo` / Runtime stats | Private dirty memory, native heap, and RSS of Pocket Cleaner. | Other running processes. |

---

## 4. Safety Architecture & Deletion Safeguards

### Read-Only Assistant Guarantee
1. **Zero Destructive Tool APIs:** The `CAPABILITY_REGISTRY` in `src/services/capabilityRegistry.ts` registers only read-only query capabilities.
2. **Pre-Execution Validation:** `toolRegistry.executeTool()` strictly throws `ToolValidationError` if any unapproved tool name is passed.
3. **Intent-Level Interception:** Destructive language ("delete", "erase", "wipe", "clean up all") is intercepted at the intent router level before any tool lookup can occur.
4. **Mandatory Human-in-the-Loop:** File deletion remains exclusively available via the **Storage Explorer** and **Deep Cleanup** screens, where items must be explicitly selected, reviewed in preview modals, and confirmed through dual-confirmation dialogs.
