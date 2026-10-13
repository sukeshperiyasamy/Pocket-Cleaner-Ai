import {
  StorageCandidate,
  StorageAnalysisFilter,
  CategorySummaryInfo,
  StorageAnalysisScanResult,
  NativeDirectoryPickerResult,
  NativePersistedDirectoryItem,
  NativeApkAnalysisResult,
  CandidateCategory,
} from '@/types/storageAnalysis';
import { FileDeletionResult, StorageItem } from '@/types/storage';
import {
  ensureNativeModule,
} from '../../modules/device-metrics/src';
import { storageService, onStorageCacheInvalidated } from './storageService';

export interface IStorageAnalysisService {
  scanCandidates(options?: {
    safTreeUris?: string[];
    cancelSignal?: { isCancelled: boolean };
    forceRefresh?: boolean;
  }): Promise<StorageAnalysisScanResult>;
  invalidateCache(): void;
  cancelScan(): Promise<boolean>;
  filterCandidates(candidates: StorageCandidate[], filter: StorageAnalysisFilter): StorageCandidate[];
  getCategorySummaries(candidates: StorageCandidate[]): CategorySummaryInfo[];
  openDirectoryPicker(): Promise<NativeDirectoryPickerResult>;
  getPersistedDirectoryUris(): Promise<NativePersistedDirectoryItem[]>;
  releasePersistedDirectoryUri(treeUri: string): Promise<boolean>;
  analyzeApk(apkPathOrUri: string): Promise<NativeApkAnalysisResult>;
  deleteCandidates(candidates: StorageCandidate[]): Promise<FileDeletionResult>;
}

export const CATEGORY_METADATA: Record<
  CandidateCategory,
  { title: string; icon: string; color: string; description: string }
> = {
  screenshots: {
    title: 'Screenshots',
    icon: 'camera-outline',
    color: '#06B6D4',
    description: 'Captured screens stored in Screenshots folder',
  },
  screen_recordings: {
    title: 'Screen Recordings',
    icon: 'videocam-outline',
    color: '#EC4899',
    description: 'Video recordings of device screen activity',
  },
  large_media: {
    title: 'Large Media',
    icon: 'film-outline',
    color: '#F59E0B',
    description: 'Photos >20MB, videos >150MB, audio >30MB',
  },
  old_downloads_docs: {
    title: 'Old Downloads & Docs',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    description: 'Documents and archives not modified for 30+ days',
  },
  apk_installers: {
    title: 'APK Installers',
    icon: 'cube-outline',
    color: '#10B981',
    description: 'Downloaded application packages (APK files)',
  },
  temp_cache_files: {
    title: 'Temp & Cache Files',
    icon: 'trash-bin-outline',
    color: '#64748B',
    description: 'Temporary-looking files (.tmp, .log, .bak) for review',
  },
};

// Sandbox mock fallback for Expo Go
const MOCK_CANDIDATES: StorageCandidate[] = [
  {
    id: 'mock_apk_1',
    name: 'sample_tool_v1.0.apk',
    path: 'Download/sample_tool_v1.0.apk',
    contentUri: 'content://media/external/downloads/101',
    sizeBytes: 45 * 1024 * 1024,
    category: 'apk_installers',
    extension: 'apk',
    dateModifiedTimestamp: Date.now() - 40 * 86400000,
    ageDays: 40,
    ageLabel: 'Not modified for 40 days',
    recommendationReason: 'Standalone APK installer — not currently installed',
    riskLevel: 'medium',
    isSaf: false,
    apkAnalysis: {
      isValidApk: true,
      packageName: 'com.example.sampletool',
      appLabel: 'Sample Tool',
      apkVersionName: '1.0.0',
      apkVersionCode: 10,
      isInstalled: false,
      isComparisonVerified: false,
      matchStatus: 'not_installed_or_unverified',
    },
  },
  {
    id: 'mock_screenshot_1',
    name: 'Screenshot_20260215_142011.png',
    path: 'DCIM/Screenshots/Screenshot_20260215_142011.png',
    contentUri: 'content://media/external/images/media/201',
    sizeBytes: 4 * 1024 * 1024,
    category: 'screenshots',
    extension: 'png',
    dateModifiedTimestamp: Date.now() - 60 * 86400000,
    ageDays: 60,
    ageLabel: 'Not modified for 60 days',
    recommendationReason: 'Screen capture stored in Screenshots album',
    riskLevel: 'medium',
    isSaf: false,
  },
  {
    id: 'mock_screen_rec_1',
    name: 'Screenrecorder-2026-01-10.mp4',
    path: 'DCIM/ScreenRecorder/Screenrecorder-2026-01-10.mp4',
    contentUri: 'content://media/external/video/media/301',
    sizeBytes: 180 * 1024 * 1024,
    category: 'screen_recordings',
    extension: 'mp4',
    dateModifiedTimestamp: Date.now() - 95 * 86400000,
    ageDays: 95,
    ageLabel: 'Not modified for 95 days',
    recommendationReason: 'Screen recording video capture',
    riskLevel: 'medium',
    isSaf: false,
  },
  {
    id: 'mock_doc_1',
    name: 'project_archive_backup.zip',
    path: 'Download/project_archive_backup.zip',
    contentUri: 'content://media/external/downloads/401',
    sizeBytes: 120 * 1024 * 1024,
    category: 'old_downloads_docs',
    extension: 'zip',
    dateModifiedTimestamp: Date.now() - 120 * 86400000,
    ageDays: 120,
    ageLabel: 'Not modified for 120 days',
    recommendationReason: 'Document/archive not modified for 120 days',
    riskLevel: 'low',
    isSaf: false,
  },
  {
    id: 'mock_temp_1',
    name: 'sync_cache.tmp',
    path: 'Download/sync_cache.tmp',
    contentUri: 'content://media/external/downloads/501',
    sizeBytes: 15 * 1024 * 1024,
    category: 'temp_cache_files',
    extension: 'tmp',
    dateModifiedTimestamp: Date.now() - 35 * 86400000,
    ageDays: 35,
    ageLabel: 'Not modified for 35 days',
    recommendationReason: 'Temporary extension (.tmp) — candidate for review',
    riskLevel: 'low',
    isSaf: false,
  },
];

export class StorageAnalysisService implements IStorageAnalysisService {
  private cachedScanResult: StorageAnalysisScanResult | null = null;
  private scanCacheTimestamp: number = 0;
  private inFlightScanPromise: Promise<StorageAnalysisScanResult> | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30s in-memory TTL to avoid repeated heavy sweeps during navigation

  constructor() {
    onStorageCacheInvalidated(() => {
      this.invalidateCache();
    });
  }

  invalidateCache(): void {
    this.cachedScanResult = null;
    this.scanCacheTimestamp = 0;
    this.inFlightScanPromise = null;
  }

  async cancelScan(): Promise<boolean> {
    this.inFlightScanPromise = null;
    const mod = await ensureNativeModule(2500);
    if (mod && typeof mod.cancelDeepScan === 'function') {
      try {
        await mod.cancelDeepScan();
        return true;
      } catch (e) {
        console.warn('[storageAnalysisService] cancelDeepScan failed:', e);
      }
    }
    return false;
  }

  async scanCandidates(options?: {
    safTreeUris?: string[];
    cancelSignal?: { isCancelled: boolean };
    forceRefresh?: boolean;
  }): Promise<StorageAnalysisScanResult> {
    const forceRefresh = options?.forceRefresh ?? false;
    const hasCustomSaf = Boolean(options?.safTreeUris && options.safTreeUris.length > 0);

    if (!forceRefresh && !hasCustomSaf && this.cachedScanResult && (Date.now() - this.scanCacheTimestamp < this.CACHE_TTL_MS)) {
      if (options?.cancelSignal?.isCancelled) {
        return {
          ...this.cachedScanResult,
          candidates: [],
          diagnostics: {
            ...this.cachedScanResult.diagnostics,
            error: 'Scan cancelled by user',
          },
        };
      }
      return this.cachedScanResult;
    }

    if (!forceRefresh && !hasCustomSaf && this.inFlightScanPromise) {
      return this.inFlightScanPromise;
    }

    const scanPromise = (async (): Promise<StorageAnalysisScanResult> => {
      const mod = await ensureNativeModule(2500);

      if (mod && typeof mod.scanDeepCleanupCandidates === 'function') {
        try {
          const persisted = await this.getPersistedDirectoryUris();
          const combinedUris = [
            ...(options?.safTreeUris || []),
            ...persisted.map((p) => p.treeUri),
          ];
          const uniqueTreeUris = Array.from(new Set(combinedUris));

          if (options?.cancelSignal?.isCancelled) {
            return {
              hasPermission: true,
              candidates: [],
              folders: [],
              diagnostics: {
                totalCandidates: 0,
                mediaStoreCandidates: 0,
                safCandidates: 0,
                foldersAggregated: 0,
                scanDurationMs: 0,
                error: 'Scan cancelled by user',
              },
              dataSourceStatus: 'live',
            };
          }

          const res = await mod.scanDeepCleanupCandidates({
            safTreeUris: uniqueTreeUris,
          });

          if (options?.cancelSignal?.isCancelled) {
            return {
              hasPermission: res.hasPermission,
              candidates: [],
              folders: [],
              diagnostics: {
                ...res.diagnostics,
                error: 'Scan cancelled by user',
              },
              dataSourceStatus: 'live',
            };
          }

          const liveResult: StorageAnalysisScanResult = {
            hasPermission: res.hasPermission,
            candidates: res.candidates || [],
            folders: res.folders || [],
            diagnostics: res.diagnostics || {
              totalCandidates: (res.candidates || []).length,
              mediaStoreCandidates: (res.candidates || []).length,
              safCandidates: 0,
              foldersAggregated: (res.folders || []).length,
              scanDurationMs: 0,
            },
            dataSourceStatus: 'live',
          };

          if (!hasCustomSaf) {
            this.cachedScanResult = liveResult;
            this.scanCacheTimestamp = Date.now();
          }

          return liveResult;
        } catch (err: any) {
          console.warn('[storageAnalysisService] scanDeepCleanupCandidates failed:', err);
        }
      }

      // Sandbox fallback
      const simResult: StorageAnalysisScanResult = {
        hasPermission: true,
        candidates: MOCK_CANDIDATES,
        folders: [
          {
            folderPath: 'DCIM/Screenshots',
            totalSizeBytes: 24 * 1024 * 1024,
            itemCount: 6,
            isIncomplete: true,
            note: 'Contains indexed shared files only; app sandboxes and unindexed files are not included.',
          },
          {
            folderPath: 'Download',
            totalSizeBytes: 180 * 1024 * 1024,
            itemCount: 4,
            isIncomplete: true,
            note: 'Contains indexed shared files only; app sandboxes and unindexed files are not included.',
          },
        ],
        diagnostics: {
          totalCandidates: MOCK_CANDIDATES.length,
          mediaStoreCandidates: MOCK_CANDIDATES.length,
          safCandidates: 0,
          foldersAggregated: 2,
          scanDurationMs: 45,
        },
        dataSourceStatus: 'simulated',
      };

      if (!hasCustomSaf) {
        this.cachedScanResult = simResult;
        this.scanCacheTimestamp = Date.now();
      }

      return simResult;
    })();

    if (!hasCustomSaf) {
      this.inFlightScanPromise = scanPromise;
    }

    try {
      return await scanPromise;
    } finally {
      if (!hasCustomSaf) {
        this.inFlightScanPromise = null;
      }
    }
  }

  filterCandidates(
    candidates: StorageCandidate[],
    filter: StorageAnalysisFilter
  ): StorageCandidate[] {
    let result = [...candidates];

    // 1. Category filter
    if (filter.category !== 'all') {
      result = result.filter((c) => c.category === filter.category);
    }

    // 2. Age filter
    if (filter.minAgeDays > 0) {
      result = result.filter((c) => c.ageDays >= filter.minAgeDays);
    }

    // 3. Min size filter
    if (filter.minSizeBytes && filter.minSizeBytes > 0) {
      result = result.filter((c) => c.sizeBytes >= filter.minSizeBytes!);
    }

    // 4. Search query
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.path.toLowerCase().includes(q) ||
          c.recommendationReason.toLowerCase().includes(q) ||
          (c.apkAnalysis?.appLabel && c.apkAnalysis.appLabel.toLowerCase().includes(q))
      );
    }

    // 5. Deterministic sorting
    const sortBy = filter.sortBy || 'size_desc';
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'size_desc': {
          const diff = b.sizeBytes - a.sizeBytes;
          return diff !== 0 ? diff : b.id.localeCompare(a.id);
        }
        case 'size_asc': {
          const diff = a.sizeBytes - b.sizeBytes;
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case 'date_desc': {
          const diff = b.dateModifiedTimestamp - a.dateModifiedTimestamp;
          return diff !== 0 ? diff : b.id.localeCompare(a.id);
        }
        case 'date_asc': {
          const diff = a.dateModifiedTimestamp - b.dateModifiedTimestamp;
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case 'name_asc': {
          const diff = a.name.localeCompare(b.name);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        default:
          return 0;
      }
    });
  }

  getCategorySummaries(candidates: StorageCandidate[]): CategorySummaryInfo[] {
    const categories: CandidateCategory[] = [
      'screenshots',
      'screen_recordings',
      'large_media',
      'old_downloads_docs',
      'apk_installers',
      'temp_cache_files',
    ];

    return categories.map((cat) => {
      const matching = candidates.filter((c) => c.category === cat);
      const totalSizeBytes = matching.reduce((sum, c) => sum + c.sizeBytes, 0);
      const meta = CATEGORY_METADATA[cat];

      // Aggregate risk: if any high, overall is high; if any medium, overall is medium
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (matching.some((m) => m.riskLevel === 'high')) {
        riskLevel = 'high';
      } else if (matching.some((m) => m.riskLevel === 'medium')) {
        riskLevel = 'medium';
      }

      return {
        category: cat,
        title: meta.title,
        count: matching.length,
        totalSizeBytes,
        riskLevel,
        icon: meta.icon,
        color: meta.color,
        description: meta.description,
      };
    });
  }

  async openDirectoryPicker(): Promise<NativeDirectoryPickerResult> {
    const mod = await ensureNativeModule(2500);
    if (mod && typeof mod.openDirectoryPicker === 'function') {
      const res = await mod.openDirectoryPicker();
      if (res.success) {
        this.invalidateCache();
      }
      return res;
    }
    return {
      success: false,
      cancelled: true,
      error: 'SAF directory picker unavailable in current environment',
    };
  }

  async getPersistedDirectoryUris(): Promise<NativePersistedDirectoryItem[]> {
    const mod = await ensureNativeModule(2500);
    if (mod && typeof mod.getPersistedDirectoryUris === 'function') {
      return mod.getPersistedDirectoryUris();
    }
    return [];
  }

  async releasePersistedDirectoryUri(treeUri: string): Promise<boolean> {
    const mod = await ensureNativeModule(2500);
    if (mod && typeof mod.releasePersistedDirectoryUri === 'function') {
      const res = await mod.releasePersistedDirectoryUri(treeUri);
      if (res.success) {
        this.invalidateCache();
      }
      return res.success;
    }
    return false;
  }

  async analyzeApk(apkPathOrUri: string): Promise<NativeApkAnalysisResult> {
    const mod = await ensureNativeModule(2500);
    if (mod && typeof mod.analyzeApk === 'function') {
      return mod.analyzeApk(apkPathOrUri);
    }
    return {
      isValidApk: false,
      isInstalled: false,
      isComparisonVerified: false,
      matchStatus: 'not_installed_or_unverified',
      error: 'Native APK analysis unavailable',
    };
  }

  async deleteCandidates(candidates: StorageCandidate[]): Promise<FileDeletionResult> {
    if (!candidates || candidates.length === 0) {
      return { status: 'success', deletedCount: 0, freedBytes: 0 };
    }

    // Convert StorageCandidate items to StorageItem
    const storageItems: StorageItem[] = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      path: c.path,
      contentUri: c.contentUri,
      sizeBytes: c.sizeBytes,
      category:
        c.category === 'screenshots' || c.category === 'large_media'
          ? 'images'
          : c.category === 'screen_recordings'
          ? 'videos'
          : 'downloads',
      extension: c.extension,
      lastModified: c.ageLabel,
      dateModifiedTimestamp: c.dateModifiedTimestamp,
      isSafeToReview: true,
      description: c.recommendationReason,
      isMock: false,
    }));

    const result = await storageService.deleteFiles(storageItems);
    if (result.status === 'success') {
      this.invalidateCache();
      storageService.invalidateCache();
    }
    return result;
  }
}

export const storageAnalysisService = new StorageAnalysisService();
