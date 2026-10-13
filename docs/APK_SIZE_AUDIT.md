# APK Size Audit & Artifact Decomposition Report

**Project:** Pocket Cleaner (`com.offlineai.phoneassistant`)  
**Application ID:** `com.offlineai.phoneassistant`  
**Audit Date:** October 2026  
**Target Hardware:** Xiaomi Redmi Note 11 family (`21091116I`), Android 13 (API 33), 8 GB RAM tier (`7,668,744 kB` kernel MemTotal).

---

## 1. Executive Summary & Core Findings

1. **GGUF Weights Are NOT Bundled in APK or AAB:**  
   Physical zip decomposition of `app-debug.apk` and `app-release.aab` proves that **zero `.gguf` model files are bundled** inside the application package. Model weights reside exclusively in application-private storage (`/data/user/0/com.offlineai.phoneassistant/files/models/`) and are managed outside the base APK.
2. **Why the Debug APK is 351.01 MB:**  
   - **88.3% of the Debug APK is native shared libraries (`lib/` = 309.94 MB).**
   - The Debug APK is a "fat" multi-ABI package containing uncompressed C++ `.so` binaries for **four distinct architectures** (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`).
   - The `llama.rn` engine compiles multiple CPU-microarchitecture variants per ABI (e.g. `librnllama_v8_2_dotprod_i8mm_hexagon_opencl.so`, `librnllama_v8_2.so`, `librnllama_v8.so`) to support dynamic vector acceleration on different chipsets.
   - In Android debug builds, native libraries are stored with zero compression (`extractNativeLibs = true`) to enable instant deployment and symbol resolution.
3. **Release App Bundle (AAB) is 114.22 MB:**  
   - The production App Bundle is compressed to **114.22 MB** total across all 4 architectures combined.
   - When delivered through Google Play, Google Play generates **split APKs per ABI**. An end-user downloading the `arm64-v8a` version downloads only **~35–42 MB**, well below the Google Play 150 MB base APK download limit.

---

## 2. Artifact Size Comparison

| Build Output | Path | Size | Compression | Multi-ABI? | Bundled GGUF? |
|---|---|---|---|---|---|
| **Debug APK** | `android/app/build/outputs/apk/debug/app-debug.apk` | **351.01 MB** | Uncompressed native libs | Yes (4 ABIs) | **NO (0 bytes)** |
| **Release AAB**| `android/app/build/outputs/bundle/release/app-release.aab` | **114.22 MB** | Deflate compressed | Yes (4 ABIs) | **NO (0 bytes)** |
| **Per-Device Split (est.)** | Google Play delivery slice (`arm64-v8a`) | **~38.5 MB** | Optimized per-device | Single ABI | **NO (0 bytes)** |

---

## 3. Detailed APK Contents Breakdown (`app-debug.apk`)

Physical decomposition of `app-debug.apk` (1,739 total zip entries):

### 3.1 Folder Level Decomposition
| Top-Level Directory | Entry Count | Compressed Size | Uncompressed Size | % of Total APK |
|---|---|---|---|---|
| `lib/` (Native C++ Shared Libraries) | 114 | **309.94 MB** | **309.94 MB** | **88.30%** |
| `classes*.dex` (Compiled Dalvik Bytecode) | 9 | **22.19 MB** | **56.66 MB** | **6.32%** |
| `assets/` (Hermes JS bundle + fonts) | 8 | **3.55 MB** | **3.55 MB** | **1.01%** |
| `resources.arsc` (Compiled resources table) | 1 | **2.16 MB** | **2.16 MB** | **0.62%** |
| `res/` (Drawables, layouts, icons) | 1,351 | **1.89 MB** | **3.40 MB** | **0.54%** |
| Other (META-INF, Manifest, properties) | 256 | **0.31 MB** | **0.78 MB** | **0.09%** |
| **Total** | **1,739** | **351.01 MB** | **376.49 MB** | **100%** |

### 3.2 Top Contributors by Size Inside the APK
| File Entry in APK | Size | Description |
|---|---|---|
| `lib/arm64-v8a/libreactnative.so` | 22.34 MB | React Native 0.86.3 C++ core engine (`arm64-v8a`) |
| `lib/x86_64/libreactnative.so` | 21.57 MB | React Native C++ core engine (`x86_64` emulator) |
| `lib/x86/libreactnative.so` | 21.52 MB | React Native C++ core engine (`x86` emulator) |
| `classes.dex` | 16.06 MB | Android application and library Java/Kotlin bytecode |
| `lib/armeabi-v7a/libreactnative.so` | 12.93 MB | React Native C++ core engine (32-bit ARM) |
| `classes6.dex` | 12.43 MB | Multi-dex split bytecode partition 6 |
| `lib/arm64-v8a/librnllama_v8_2_dotprod_i8mm_hexagon_opencl.so` | 11.78 MB | llama.cpp ARMv8.2 accelerated engine with OpenCL |
| `lib/x86_64/librnllama_x86_64.so` | 10.73 MB | llama.cpp x86_64 engine with AVX instructions |
| `lib/x86_64/librnllama.so` | 10.71 MB | llama.cpp x86_64 base engine |
| `classes8.dex` | 10.31 MB | Multi-dex split bytecode partition 8 |
| `classes9.dex` | 9.80 MB | Multi-dex split bytecode partition 9 |
| `lib/arm64-v8a/librnllama_v8_2_dotprod_i8mm.so` | 9.43 MB | llama.cpp ARMv8.2 dotprod + int8 matrix multiplication |
| `lib/arm64-v8a/librnllama_v8_2_dotprod.so` | 9.42 MB | llama.cpp ARMv8.2 dotprod variant |
| `lib/arm64-v8a/librnllama_v8_2_i8mm.so` | 9.40 MB | llama.cpp ARMv8.2 i8mm variant |
| `lib/arm64-v8a/librnllama_v8.so` | 9.36 MB | llama.cpp ARMv8 base variant |
| `lib/arm64-v8a/librnllama_v8_2.so` | 9.35 MB | llama.cpp ARMv8.2 variant |
| `lib/arm64-v8a/librnllama.so` | 9.32 MB | llama.cpp fallback variant |
| `lib/x86/libreanimated.so` | 8.09 MB | React Native Reanimated C++ animation runtime |
| `lib/arm64-v8a/libreanimated.so` | 7.90 MB | React Native Reanimated C++ animation runtime |
| `lib/x86_64/libreanimated.so` | 7.54 MB | React Native Reanimated C++ animation runtime |

---

## 4. On-Device Model Storage Audit

Inspecting the physical device storage via ADB (`run-as com.offlineai.phoneassistant ls -la files/models/`):

```
-rw-rw-rw- 1 u0_a410 u0_a410 270590880 2026-10-12 22:02 SmolLM2-360M-Instruct-Q4_K_M.gguf
-rw-rw-rw- 1 u0_a410 u0_a410 105454432 2026-10-12 22:02 SmolLM2-135M-Instruct-Q4_K_M.gguf
```

### Verified Model Artifacts on Physical Hardware
| Model Filename | Size on Disk | SHA-256 Checksum | Delivery Mechanism |
|---|---|---|---|
| `SmolLM2-360M-Instruct-Q4_K_M.gguf` | 270,590,880 bytes (~258.05 MB) | `2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2` | App-private storage (`files/models/`), sideloaded via ADB |
| `SmolLM2-135M-Instruct-Q4_K_M.gguf` | 105,454,432 bytes (~100.57 MB) | `2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d` | App-private storage (`files/models/`), sideloaded via ADB |

---

## 5. Device Identity & Hardware Telemetry Ground Truth

To resolve the previous documentation discrepancy (where the phone was described as a 4 GB RAM device while native telemetry reported ~7.85 GB), we queried Android build properties and Linux kernel memory directly:

| Telemetry Property | Command / Source | Ground Truth Value | Analysis |
|---|---|---|---|
| **Manufacturer** | `getprop ro.product.manufacturer` | `Xiaomi` | Verified OEM |
| **Model** | `getprop ro.product.model` | `21091116I` | Regional model code |
| **Product / Device Codename** | `getprop ro.product.name` | `pissarroin` | Xiaomi 11i Hypercharge / Redmi Note 11 Pro+ 5G (India) |
| **Android Version** | `getprop ro.build.version.release` | `13` | Android 13 Tiramisu |
| **API Level** | `getprop ro.build.version.sdk` | `33` | Target API 33 |
| **CPU Architecture** | `getprop ro.product.cpu.abi` | `arm64-v8a` | 64-bit ARM |
| **Kernel `MemTotal`** | `/proc/meminfo` | `7,668,744 kB` | $7,852,793,856$ bytes |
| **Android Dumpsys RAM** | `dumpsys meminfo` | `Total RAM: 7,668,744K` | Hardware memory allocation |
| **Decimal SI Capacity** | $7,852,793,856 / 10^9$ | **7.85 GB** | Formatted by Android Settings |
| **Binary IEC Capacity** | $7,852,793,856 / 1024^3$ | **7.31 GiB** | Formatted by JavaScript `formatBytes` |
| **Installed App Version** | `dumpsys package ...` | `versionCode=1`, `versionName=1.0.0` | Production release candidate |

### Identity Discrepancy Resolution
The hardware attached to the developer machine is an **8 GB physical RAM SKU** (`21091116I`, codename `pissarroin`), rather than the base Redmi Note 11 4 GB SKU (`spes`). The native module was reporting the true physical memory of the attached phone. No hardcoded workarounds are needed.
