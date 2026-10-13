# Pocket-Cleaner-Ai

**Pocket Cleaner AI (Offline AI Phone Assistant)** is a free, open-source, privacy-preserving Android mobile application designed to help users understand, inspect, and safely manage phone storage and memory usage through natural language and on-device processing.

> [!IMPORTANT]
> **Phase 1 MVP Scope & Safety Guarantee:**
> All storage, memory, and AI responses in this foundation release are local simulations. No user files are scanned, modified, or deleted, and no network requests or telemetry tracking are performed.

---

## Architecture Overview

```
src/
├── app/                  # Expo Router file-based screens and navigation
│   ├── _layout.tsx       # Root layout with ThemeProvider, DarkTheme/DefaultTheme, StatusBar
│   ├── index.tsx         # Root redirect to (tabs)
│   └── (tabs)/           # Material 3 Bottom Navigation
│       ├── _layout.tsx   # Tab bar layout (5 tabs)
│       ├── index.tsx     # Home / Dashboard
│       ├── assistant.tsx # AI Assistant Chat
│       ├── storage.tsx   # Storage Explorer
│       ├── performance.tsx # Performance & Memory Truth
│       └── settings.tsx  # Settings & Privacy Guarantees
├── components/           # Reusable Material 3 design system components
│   ├── Badge.tsx         # Status chips and category pills
│   ├── Button.tsx        # Material 3 buttons with accessible 48dp touch targets
│   ├── Card.tsx          # Surface cards with themed borders and elevations
│   ├── EmptyState.tsx    # Empty & simulated permission-denied views
│   ├── Header.tsx        # Top App Bar with offline badges
│   ├── MockBanner.tsx    # Transparent sample data disclaimer
│   └── ProgressBar.tsx   # Segmented and linear progress indicators
├── features/             # Feature modules
│   ├── dashboard/        # StorageOverviewCard, RamOverviewCard, QuickActions, RecentScans
│   ├── assistant/        # ChatMessageItem, PromptChips, ChatInputBar
│   ├── storage/          # CategoryBreakdown, StorageFilterBar, FileListSection, CleanupPreviewModal
│   ├── performance/      # RamDetailsCard, AndroidMemoryArchitectureCard, RecommendationsList
│   └── settings/         # LocalAIStatusCard, ModelManagementCard, PrivacyGuaranteesCard, AppInfoCard
├── services/             # Clean service contracts and mock implementations
│   ├── storageService.ts # getStorageSummary, findLargeFiles, getRecentScans
│   ├── memoryService.ts  # getMemorySummary, getMemoryRecommendations
│   ├── assistantService.ts # sendAssistantMessage, LLM provider strategy interface
│   ├── settingsService.ts # getLocalAIStatus, getAppMetadata
│   └── index.ts
├── constants/            # Theme tokens and mock fixtures
│   ├── theme.ts          # Material 3 dark/light palettes, spacing, typography
│   └── mockData.ts       # AOSP-grounded fixtures, prompt suggestions, disclaimers
├── types/                # Strongly-typed domain interfaces
│   ├── storage.ts
│   ├── memory.ts
│   ├── assistant.ts
│   ├── settings.ts
│   └── index.ts
└── utils/
    └── formatters.ts     # formatBytes, formatPercentage
```

---

## Features Implemented in Phase 1

### 1. Home / Dashboard
- **Storage Overview Card:** Shows used (88.4 GB), free (39.6 GB), and total (128 GB) storage with percentage progress bar and category chips.
- **RAM Overview Card:** Shows available (2.9 GB), in-use (5.1 GB), and total (8.0 GB) RAM with memory pressure badge.
- **Quick Actions:** One-tap navigation to "Scan Storage", "Ask AI", and "Performance Insights".
- **Recent Scans Section:** History log of simulated scans with potential reviewable space and file counts.
- **Pull-to-refresh:** Triggers live re-scan simulation.

### 2. AI Assistant
- **Chat Interface:** Interactive conversational UI with message bubbles and timestamps.
- **Extensible LLM Provider Interface (`ILLMProvider`):** Abstracted contract currently powered by `MockLLMProvider`, architected for seamless drop-in integration with on-device ExecuTorch / llama.cpp in Phase 2.
- **Suggested Quick Prompts:**
  - *"What is using my storage?"*
  - *"Find my largest files."*
  - *"How can I improve my phone's performance?"*
  - *"Help me free up storage safely."*
- **Action Links:** Assistant responses include in-chat navigation shortcuts directly into Storage Explorer and Performance Insights.

### 3. Storage Explorer
- **Category Filter:** Filter by All Files, Videos, Images, Apps, Downloads, Audio, Other.
- **Sort Controls:** Size (Largest/Smallest), Date (Newest), Name (A-Z).
- **Multi-Selection UI:** Select files for cleanup inspection with sticky summary bar showing total selected files and size.
- **Cleanup Preview Modal:** Detailed review modal showing candidates and space to be reclaimed. Explicitly informs the user that destructive operations are disabled in this MVP.
- **Permission-Denied State Simulation:** Toggle button allowing reviewers to test the permission-restricted UX and understand Android Scoped Storage requirements.

### 4. Performance & Honest Memory Telemetry
- **RAM Telemetry Card:** Detailed breakdown of Available memory, Active OS/Services, Total RAM, and Assistant app footprint.
- **Android OS Architecture Card:** Educates users on:
  - Linux process sandboxing and why non-system apps cannot kill other apps or clear private caches (Android 8.0+ Oreo).
  - Why "Free RAM is wasted RAM" and how Android utilizes cached memory for instant app switching.
  - How Linux LMK (Low Memory Killer) automatically reclaims memory without third-party intervention.
- **Why "RAM Boosters" Are Harmful:** Transparently explains why task killers increase battery drain and CPU load.
- **Evidence-Based Recommendations:** Genuine guidance on storage headroom, background battery drain, and app hygiene.

### 5. Settings & Privacy
- **On-Device LLM Status:** Displays model specs (Llama 3.2 1B Instruct quantized INT4, ~1.85 GB) and status `Not installed`.
- **Pre-flight Hardware Checklist:** Checks RAM headroom, free storage, and ARM64 architecture support.
- **Privacy & Offline Guarantee:** Highlights 100% on-device operation, zero cloud APIs, zero analytics SDKs, and zero telemetry.
- **App & License Info:** Version 0.1.0-alpha MVP, Apache 2.0 Open Source.

---

## Commands & Verification

### Typecheck & Lint
```bash
# TypeScript strict check (0 errors)
npm run typecheck

# ESLint flat config check (0 errors, 0 warnings)
npm run lint

# Expo diagnostics (21/21 checks passed)
npx expo-doctor
```

---

## How to Launch on Android

### Option A: Via Expo Go (Fastest UI Preview)
1. Install **Expo Go** from the Google Play Store on your Android device.
2. Ensure your computer and phone are connected to the same Wi-Fi network.
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Scan the displayed QR code with your phone camera or the Expo Go app.

### Option B: On Android Emulator or Connected USB Device
1. Connect your Android phone with **USB Debugging** enabled (or start an Android Virtual Device via Android Studio).
2. Verify connection:
   ```bash
   adb devices
   ```
3. Launch directly to Android:
   ```bash
   npm run android
   ```

### Option C: Custom Development Build (For Phase 2 Native Kotlin Modules)
1. Generate the native Android project via Continuous Native Generation (CNG):
   ```bash
   npx expo prebuild --platform android
   ```
2. Build and run the debug development build locally:
   ```bash
   npx expo run:android
   ```
   *(Or build in cloud via EAS: `npx eas-cli build --profile development --platform android`)*

---

## Roadmap to Phase 2
1. **Android MediaStore & SAF Native Module:** Implement native Kotlin module using Android MediaStore APIs for user-permissioned media file inspection.
2. **On-Device LLM Inference:** Implement `ILLMProvider` using ExecuTorch / ONNX Runtime Mobile / llama.cpp for local, private prompt processing.
3. **Android ActivityManager Telemetry:** Connect `IMemoryService` to native `android.app.ActivityManager.MemoryInfo`.
