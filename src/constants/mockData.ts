import {
  StorageSummary,
  StorageItem,
  RecentScanInfo,
  MemorySummary,
  MemoryRecommendation,
  PromptSuggestion,
  ChatMessage,
  LocalAIModelInfo,
  AppMetadata,
} from '@/types';

export const MOCK_DISCLAIMER_TEXT =
  'Notice: All storage, memory, and assistant data in Phase 1 MVP are local simulations. No real phone files are modified, and no telemetry or cloud connections are made.';

export const MOCK_STORAGE_SUMMARY: StorageSummary = {
  totalBytes: 128 * 1024 * 1024 * 1024, // 128 GB
  usedBytes: 88.4 * 1024 * 1024 * 1024, // 88.4 GB (~69%)
  freeBytes: 39.6 * 1024 * 1024 * 1024, // 39.6 GB
  lastScanTimestamp: 'Today, 04:30 AM',
  isMock: true,
  categories: [
    {
      category: 'videos',
      name: 'Videos',
      sizeBytes: 34.2 * 1024 * 1024 * 1024,
      fileCount: 42,
      icon: 'videocam-outline',
      color: '#EF4444',
    },
    {
      category: 'images',
      name: 'Images',
      sizeBytes: 24.8 * 1024 * 1024 * 1024,
      fileCount: 1420,
      icon: 'image-outline',
      color: '#3B82F6',
    },
    {
      category: 'apps',
      name: 'Apps & Data',
      sizeBytes: 16.5 * 1024 * 1024 * 1024,
      fileCount: 68,
      icon: 'apps-outline',
      color: '#10B981',
    },
    {
      category: 'downloads',
      name: 'Downloads',
      sizeBytes: 8.2 * 1024 * 1024 * 1024,
      fileCount: 115,
      icon: 'download-outline',
      color: '#F59E0B',
    },
    {
      category: 'audio',
      name: 'Audio',
      sizeBytes: 3.1 * 1024 * 1024 * 1024,
      fileCount: 240,
      icon: 'musical-notes-outline',
      color: '#8B5CF6',
    },
    {
      category: 'other',
      name: 'Other Files',
      sizeBytes: 1.6 * 1024 * 1024 * 1024,
      fileCount: 512,
      icon: 'folder-open-outline',
      color: '#06B6D4',
    },
  ],
};

export const MOCK_LARGE_FILES: StorageItem[] = [
  {
    id: 'f-1',
    name: 'Vacation_4K_Drone_Footage.mp4',
    path: '/storage/emulated/0/DCIM/Camera/Vacation_4K_Drone_Footage.mp4',
    sizeBytes: 4.8 * 1024 * 1024 * 1024, // 4.8 GB
    category: 'videos',
    extension: 'mp4',
    lastModified: '2026-09-18',
    isSafeToReview: true,
    description: 'High bitrate 4K video recording (42 mins)',
    isMock: true,
  },
  {
    id: 'f-2',
    name: 'offline_maps_europe_bundle.obb',
    path: '/storage/emulated/0/Android/obb/com.maps.offline/main.obb',
    sizeBytes: 2.9 * 1024 * 1024 * 1024, // 2.9 GB
    category: 'other',
    extension: 'obb',
    lastModified: '2026-08-11',
    isSafeToReview: false,
    description: 'Navigation map assets pack (May be required by installed app)',
    isMock: true,
  },
  {
    id: 'f-3',
    name: 'Presentation_Keynote_Backup.zip',
    path: '/storage/emulated/0/Download/Presentation_Keynote_Backup.zip',
    sizeBytes: 1.85 * 1024 * 1024 * 1024, // 1.85 GB
    category: 'downloads',
    extension: 'zip',
    lastModified: '2026-09-29',
    isSafeToReview: true,
    description: 'Archived conference deck and raw video demos',
    isMock: true,
  },
  {
    id: 'f-4',
    name: 'Podcast_Series_Season3_Full.mp3',
    path: '/storage/emulated/0/Music/Podcasts/Podcast_Series_Season3_Full.mp3',
    sizeBytes: 890 * 1024 * 1024, // 890 MB
    category: 'audio',
    extension: 'mp3',
    lastModified: '2026-07-22',
    isSafeToReview: true,
    description: 'Downloaded offline episode batch',
    isMock: true,
  },
  {
    id: 'f-5',
    name: 'Old_Firmware_OTA_Package.zip',
    path: '/storage/emulated/0/Download/Old_Firmware_OTA_Package.zip',
    sizeBytes: 1.4 * 1024 * 1024 * 1024, // 1.4 GB
    category: 'downloads',
    extension: 'zip',
    lastModified: '2026-04-15',
    isSafeToReview: true,
    description: 'Downloaded update package older than 6 months',
    isMock: true,
  },
  {
    id: 'f-6',
    name: 'RAW_Wedding_Photo_Burst_01.dng',
    path: '/storage/emulated/0/DCIM/Raw/RAW_Wedding_Photo_Burst_01.dng',
    sizeBytes: 680 * 1024 * 1024, // 680 MB
    category: 'images',
    extension: 'dng',
    lastModified: '2026-10-02',
    isSafeToReview: true,
    description: 'Uncompressed raw sensor burst series',
    isMock: true,
  },
  {
    id: 'f-7',
    name: 'ScreenRecording_20261005_Gameplay.mp4',
    path: '/storage/emulated/0/Movies/Screenrecords/ScreenRecording_20261005_Gameplay.mp4',
    sizeBytes: 1.15 * 1024 * 1024 * 1024, // 1.15 GB
    category: 'videos',
    extension: 'mp4',
    lastModified: '2026-10-05',
    isSafeToReview: true,
    description: 'Screen recorder capture (60fps 1080p)',
    isMock: true,
  },
  {
    id: 'f-8',
    name: 'Telegram_Cache_Document_Archive.pdf',
    path: '/storage/emulated/0/Download/Telegram_Cache_Document_Archive.pdf',
    sizeBytes: 420 * 1024 * 1024, // 420 MB
    category: 'downloads',
    extension: 'pdf',
    lastModified: '2026-09-10',
    isSafeToReview: true,
    description: 'Cached architectural engineering manual',
    isMock: true,
  },
];

export const MOCK_RECENT_SCANS: RecentScanInfo[] = [
  {
    id: 'scan-1',
    timestamp: 'Today at 04:30 AM',
    status: 'completed',
    scannedItemsCount: 2349,
    potentialSavingsBytes: 9.8 * 1024 * 1024 * 1024, // 9.8 GB
    summary: 'Found 7 large media files and 3 dormant downloaded archives.',
    isMock: true,
  },
  {
    id: 'scan-2',
    timestamp: 'Yesterday at 09:15 PM',
    status: 'completed',
    scannedItemsCount: 2310,
    potentialSavingsBytes: 8.6 * 1024 * 1024 * 1024,
    summary: 'Identified obsolete firmware zip in Downloads directory.',
    isMock: true,
  },
];

export const MOCK_MEMORY_SUMMARY: MemorySummary = {
  totalBytes: 8 * 1024 * 1024 * 1024, // 8.0 GB RAM
  usedBytes: 5.1 * 1024 * 1024 * 1024, // 5.1 GB Used
  availableBytes: 2.9 * 1024 * 1024 * 1024, // 2.9 GB Free/Cached
  appUsageBytes: 42 * 1024 * 1024, // 42 MB
  pressureLevel: 'moderate',
  pressurePercentage: 64,
  isMock: true,
  lastUpdated: 'Just now (Simulated)',
};

export const MOCK_MEMORY_RECOMMENDATIONS: MemoryRecommendation[] = [
  {
    id: 'rec-android-truth',
    title: 'How Android Handles RAM (No Fake Cleaners)',
    description:
      'Unlike desktop operating systems, Android is designed to keep RAM utilized. Free RAM is wasted RAM because cached processes allow apps to reopen instantly without battery-draining CPU spikes. Android’s Low Memory Killer (LMK) automatically reclaims memory whenever an active app requires it.',
    type: 'educational',
    badge: 'Android OS Architecture',
  },
  {
    id: 'rec-task-killers',
    title: 'Why "RAM Boosters" Hurt Your Battery',
    description:
      'Since Android 8.0 Oreo, third-party apps cannot terminate other apps or force-clear their private memory. Apps that claim to "Boost RAM" only force cached services to die, which Android immediately restarts, burning excessive CPU cycles and draining battery.',
    type: 'warning',
    badge: 'Technical Transparency',
  },
  {
    id: 'rec-real-optimizations',
    title: 'Genuine Ways to Maintain Smooth Performance',
    description:
      '1. Keep at least 10–15% storage free so Android flash wear leveling and database indexing run fast.\n2. Uninstall apps you no longer use rather than force-closing them.\n3. Check Android Settings > Apps > Battery usage for anomalous background consumption.',
    type: 'practical',
    badge: 'Recommended Action',
  },
];

export const MOCK_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'p-1',
    label: 'What is using my storage?',
    prompt: 'What is using my storage?',
    category: 'storage',
  },
  {
    id: 'p-2',
    label: 'Find my largest files.',
    prompt: 'Find my largest files.',
    category: 'cleanup',
  },
  {
    id: 'p-3',
    label: "How can I improve my phone's performance?",
    prompt: "How can I improve my phone's performance?",
    category: 'performance',
  },
  {
    id: 'p-4',
    label: 'Help me free up storage safely.',
    prompt: 'Help me free up storage safely.',
    category: 'cleanup',
  },
];

export const MOCK_INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text:
      "Hello! I'm your Offline AI Phone Assistant. I am designed to help you inspect storage, explain memory behavior, and safely manage files—entirely on your device without sending any data to cloud servers.\n\n[MOCK MODE NOTICE: In Phase 1 MVP, my responses use a local rule-based mock engine. Local LLM inference will be connected in Phase 2.]",
    timestamp: 'Just now',
    isMock: true,
  },
];

export const MOCK_LOCAL_AI_STATUS: LocalAIModelInfo = {
  name: 'Llama-3.2-1B-Instruct (GGUF Q4_K_M)',
  architecture: 'Llama 3.2 Transformer',
  quantization: '4-bit Quantized INT4',
  status: 'not_installed',
  modelSizeBytes: 1.85 * 1024 * 1024 * 1024, // ~1.85 GB
  minRamBytes: 3.5 * 1024 * 1024 * 1024, // 3.5 GB
  executionProvider: 'On-Device NPU / CPU (ExecuTorch / llama.cpp)',
  isMock: true,
};

export const APP_METADATA: AppMetadata = {
  name: 'Offline AI Phone Assistant',
  version: '0.1.0-alpha',
  buildNumber: '1',
  license: 'Apache 2.0 (Open Source)',
  repoUrl: 'https://github.com/open-assistant/offline-phone-assistant',
  privacyHighlights: [
    '100% Offline & On-Device processing',
    'Zero cloud AI APIs or external server dependencies',
    'Zero advertising, tracking SDKs, or analytics telemetry',
    'Transparent explanations: No deceptive "RAM boosting"',
    'Non-destructive file inspection: Deletion is never automated',
  ],
};
