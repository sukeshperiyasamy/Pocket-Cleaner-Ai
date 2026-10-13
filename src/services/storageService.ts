import {
  StorageSummary,
  StorageItem,
  RecentScanInfo,
  StorageCategoryDetail,
  GetMediaFilesOptions,
  MediaFilesResponse,
  FileDeletionResult,
  AudioPlaybackInfo,
  CategoryDiagnostics,
  FileSortOption,
} from '@/types';
import {
  MOCK_STORAGE_SUMMARY,
  MOCK_LARGE_FILES,
  MOCK_RECENT_SCANS,
} from '@/constants/mockData';
import {
  DeviceMetricsModule,
  isNativeModuleAvailable,
  ensureNativeModule,
  getNativeModuleDiagnostics,
  recordNativeRuntimeError,
  recordFallbackReason,
  NativeCategoryItem,
  NativeMediaItem,
  NativeModuleDiagnostics,
} from '../../modules/device-metrics/src';
import {
  checkMediaPermissions,
  requestMediaPermissions,
} from '@/utils/permissions';

type InvalidationCallback = () => void;
const cacheInvalidationListeners: InvalidationCallback[] = [];

export function onStorageCacheInvalidated(cb: InvalidationCallback): () => void {
  cacheInvalidationListeners.push(cb);
  return () => {
    const idx = cacheInvalidationListeners.indexOf(cb);
    if (idx !== -1) cacheInvalidationListeners.splice(idx, 1);
  };
}

export interface IStorageService {
  getStorageSummary(forceRefresh?: boolean): Promise<StorageSummary>;
  invalidateCache(): void;
  getMediaFiles(options?: GetMediaFilesOptions, forceRefresh?: boolean): Promise<MediaFilesResponse>;
  findLargeFiles(minSizeBytes?: number, maxResults?: number): Promise<StorageItem[]>;
  deleteFiles(items: StorageItem[]): Promise<FileDeletionResult>;
  openMediaInSystem(contentUri: string, mimeType?: string): Promise<{ success: boolean; error?: string }>;
  playAudio(contentUri: string): Promise<AudioPlaybackInfo>;
  pauseAudio(): Promise<AudioPlaybackInfo>;
  resumeAudio(): Promise<AudioPlaybackInfo>;
  stopAudio(): Promise<AudioPlaybackInfo>;
  getAudioState(): Promise<AudioPlaybackInfo>;
  getRecentScans(): Promise<RecentScanInfo[]>;
  requestStorageScan(): Promise<StorageSummary>;
  getStorageCategories(forceRefresh?: boolean): Promise<StorageCategoryDetail[]>;
  hasStoragePermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  isNativeAvailable(): boolean;
  getDiagnostics(): NativeModuleDiagnostics;
}

/**
 * Helper to sort items deterministically in JavaScript
 */
export function sortStorageItems(items: StorageItem[], sortOption: FileSortOption = 'size_desc'): StorageItem[] {
  return [...items].sort((a, b) => {
    switch (sortOption) {
      case 'size_desc': {
        const diff = b.sizeBytes - a.sizeBytes;
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      }
      case 'size_asc': {
        const diff = a.sizeBytes - b.sizeBytes;
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'date_desc': {
        const dateA = a.dateModifiedTimestamp || 0;
        const dateB = b.dateModifiedTimestamp || 0;
        const diff = dateB - dateA;
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      }
      case 'date_asc': {
        const dateA = a.dateModifiedTimestamp || 0;
        const dateB = b.dateModifiedTimestamp || 0;
        const diff = dateA - dateB;
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'name_asc': {
        const diff = a.name.localeCompare(b.name);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'name_desc': {
        const diff = b.name.localeCompare(a.name);
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      }
      default:
        return 0;
    }
  });
}

/**
 * AndroidNativeStorageService
 * Implementation of IStorageService that queries real Android StatFs and MediaStore APIs
 * via our custom Kotlin Expo Module (DeviceMetricsModule).
 */
export class AndroidNativeStorageService implements IStorageService {
  private cachedSummary: StorageSummary | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 25000; // 25s in-memory TTL to avoid repeated MediaStore iteration on tab navigation
  private mediaFilesCache = new Map<string, { data: MediaFilesResponse; timestamp: number }>();
  private inFlightMediaPromises = new Map<string, Promise<MediaFilesResponse>>();

  invalidateCache(): void {
    this.cachedSummary = null;
    this.cacheTimestamp = 0;
    this.mediaFilesCache.clear();
    this.inFlightMediaPromises.clear();
    for (const listener of cacheInvalidationListeners) {
      try {
        listener();
      } catch (e) {
        console.warn('[storageService] Invalidation listener error:', e);
      }
    }
  }

  isNativeAvailable(): boolean {
    const available = typeof isNativeModuleAvailable === 'function'
      ? isNativeModuleAvailable()
      : Boolean(isNativeModuleAvailable);
    return available && DeviceMetricsModule !== null;
  }

  getDiagnostics(): NativeModuleDiagnostics {
    return getNativeModuleDiagnostics();
  }

  async hasStoragePermission(): Promise<boolean> {
    return checkMediaPermissions();
  }

  async requestPermission(): Promise<boolean> {
    const granted = await requestMediaPermissions();
    if (granted) {
      this.invalidateCache();
    }
    return granted;
  }

  async getStorageSummary(forceRefresh: boolean = false): Promise<StorageSummary> {
    if (!forceRefresh && this.cachedSummary && (Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS)) {
      return this.cachedSummary;
    }

    const mod = await ensureNativeModule(2500);
    if (mod) {
      try {
        const nativeSummary = await mod.getStorageSummary();
        recordNativeRuntimeError(null);
        recordFallbackReason(null);
        console.log('[storageService] Native storage summary:', JSON.stringify(nativeSummary));
        const hasPerm = await this.hasStoragePermission();

        let categories: StorageCategoryDetail[] = [];

        if (hasPerm) {
          try {
            const breakdown = await mod.getCategoryBreakdown();
            if (breakdown && breakdown.categories) {
              categories = breakdown.categories.map((cat: NativeCategoryItem) => ({
                category: cat.category,
                name: cat.name,
                sizeBytes: cat.sizeBytes,
                fileCount: cat.fileCount,
                icon:
                  cat.category === 'videos'
                    ? 'videocam-outline'
                    : cat.category === 'images'
                    ? 'image-outline'
                    : cat.category === 'audio'
                    ? 'musical-notes-outline'
                    : 'folder-open-outline',
                color:
                  cat.category === 'videos'
                    ? '#EF4444'
                    : cat.category === 'images'
                    ? '#3B82F6'
                    : cat.category === 'audio'
                    ? '#10B981'
                    : '#8B5CF6',
              }));
            }
          } catch (err) {
            console.warn('[storageService] getCategoryBreakdown failed:', err);
          }
        }

        const summary: StorageSummary = {
          totalBytes: nativeSummary.totalBytes,
          usedBytes: nativeSummary.usedBytes,
          freeBytes: nativeSummary.availableBytes,
          categories,
          isMock: false,
          dataSourceStatus: 'live',
          dataSourceError: null,
          lastScanTimestamp: nativeSummary.formattedTimestamp,
          isAppAccessibleOnly: nativeSummary.isAppAccessibleOnly,
          storagePath: nativeSummary.storagePath,
          externalTotalBytes: nativeSummary.externalTotalBytes,
          externalAvailableBytes: nativeSummary.externalAvailableBytes,
          hasPermission: hasPerm,
        };

        this.cachedSummary = summary;
        this.cacheTimestamp = Date.now();
        return summary;
      } catch (error: any) {
        const msg = error?.message || String(error);
        recordNativeRuntimeError(msg);
        recordFallbackReason(`Native getStorageSummary failed: ${msg}`);
        console.warn('Native getStorageSummary failed, marking unavailable:', error);
        return {
          totalBytes: 0,
          usedBytes: 0,
          freeBytes: 0,
          categories: [],
          isMock: true,
          dataSourceStatus: 'unavailable',
          dataSourceError: msg,
          lastScanTimestamp: 'Query failed',
          hasPermission: false,
        };
      }
    }

    recordFallbackReason('Running in Expo Go sandbox without custom native dev build');
    return {
      ...MOCK_STORAGE_SUMMARY,
      isMock: true,
      dataSourceStatus: 'simulated',
      dataSourceError: 'Native module unavailable in Expo Go sandbox',
      lastScanTimestamp: 'Simulated Fallback',
    };
  }

  /**
   * Phase 3 Core: Queries actual individual files by category from MediaStore
   */
  async getMediaFiles(
    options: GetMediaFilesOptions = {},
    forceRefresh: boolean = false
  ): Promise<MediaFilesResponse> {
    const {
      category = 'all',
      minSizeBytes = 0,
      limit = 100,
      offset = 0,
      sortOption = 'size_desc',
    } = options;

    const cacheKey = `${category}_${minSizeBytes}_${limit}_${offset}_${sortOption}`;

    if (!forceRefresh) {
      const cached = this.mediaFilesCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
        return cached.data;
      }
      const inFlight = this.inFlightMediaPromises.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }
    }

    const fetchPromise = (async (): Promise<MediaFilesResponse> => {
      const mod = await ensureNativeModule(2500);
      const hasPerm = await this.hasStoragePermission();

      if (!hasPerm) {
        return {
          files: [],
          diagnostics: {
            mediaStoreTotalCount: 0,
            validMappedCount: 0,
            visibleCount: 0,
            thumbnailErrors: 0,
            permissionStatus: 'denied',
            queryError: 'Media permissions required to inspect MediaStore files.',
          },
          dataSourceStatus: mod ? 'live' : 'simulated',
        };
      }

      if (mod) {
        try {
          let sortBy = 'size';
          let sortOrder = 'desc';

          if (sortOption.startsWith('name')) {
            sortBy = 'name';
            sortOrder = sortOption.endsWith('desc') ? 'desc' : 'asc';
          } else if (sortOption.startsWith('date')) {
            sortBy = 'date';
            sortOrder = sortOption.endsWith('desc') ? 'desc' : 'asc';
          } else if (sortOption.startsWith('size')) {
            sortBy = 'size';
            sortOrder = sortOption.endsWith('asc') ? 'asc' : 'desc';
          }

          const res = await mod.getMediaFiles(
            category,
            minSizeBytes,
            limit,
            offset,
            sortBy,
            sortOrder
          );

          if (res && res.hasPermission && Array.isArray(res.files)) {
            const mappedFiles: StorageItem[] = res.files.map((f: NativeMediaItem) => ({
              id: f.id,
              name: f.name,
              path: f.path,
              contentUri: f.contentUri,
              sizeBytes: f.sizeBytes,
              category: f.category,
              extension: f.extension,
              lastModified: f.lastModified,
              dateModifiedTimestamp: f.dateModifiedTimestamp,
              mimeType: f.mimeType,
              durationMs: f.durationMs,
              width: f.width,
              height: f.height,
              artist: f.artist,
              album: f.album,
              relativePath: f.relativePath,
              isSafeToReview: true,
              description: f.description || `Device Media (${f.mimeType || f.category})`,
              isMock: false,
            }));

            // Apply deterministic sort fallback in JS
            const sorted = sortStorageItems(mappedFiles, sortOption);

            const diagnostics: CategoryDiagnostics = {
              mediaStoreTotalCount: res.totalCountInMediaStore ?? sorted.length,
              validMappedCount: res.validMappedCount ?? sorted.length,
              visibleCount: sorted.length,
              thumbnailErrors: 0,
              permissionStatus: 'granted',
              queryError: res.error || null,
            };

            const liveResult: MediaFilesResponse = {
              files: sorted,
              diagnostics,
              dataSourceStatus: 'live',
            };

            this.mediaFilesCache.set(cacheKey, { data: liveResult, timestamp: Date.now() });
            return liveResult;
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          recordNativeRuntimeError(msg);
          console.warn('[storageService] Native getMediaFiles failed:', err);

          return {
            files: [],
            diagnostics: {
              mediaStoreTotalCount: 0,
              validMappedCount: 0,
              visibleCount: 0,
              thumbnailErrors: 0,
              permissionStatus: 'granted',
              queryError: `Query failed: ${msg}`,
            },
            dataSourceStatus: 'unavailable',
          };
        }
      }

      // Fallback for Expo Go sandbox
      let filtered = MOCK_LARGE_FILES.map((f) => ({ ...f, isMock: true }));
      if (category !== 'all') {
        filtered = filtered.filter((f) => f.category === category);
      }
      if (minSizeBytes > 0) {
        filtered = filtered.filter((f) => f.sizeBytes >= minSizeBytes);
      }
      const sorted = sortStorageItems(filtered, sortOption).slice(offset, offset + limit);

      const simResult: MediaFilesResponse = {
        files: sorted,
        diagnostics: {
          mediaStoreTotalCount: filtered.length,
          validMappedCount: sorted.length,
          visibleCount: sorted.length,
          thumbnailErrors: 0,
          permissionStatus: 'granted',
          queryError: 'Simulated sandbox mode (Expo Go)',
        },
        dataSourceStatus: 'simulated',
      };
      this.mediaFilesCache.set(cacheKey, { data: simResult, timestamp: Date.now() });
      return simResult;
    })();

    this.inFlightMediaPromises.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightMediaPromises.delete(cacheKey);
    }
  }

  async findLargeFiles(
    minSizeBytes: number = 0,
    maxResults: number = 50
  ): Promise<StorageItem[]> {
    const res = await this.getMediaFiles({
      category: 'all',
      minSizeBytes,
      limit: maxResults,
      sortOption: 'size_desc',
    });
    return res.files;
  }

  /**
   * Phase 4 Safe Cleanup: Calls native Android user consent deletion
   */
  async deleteFiles(items: StorageItem[]): Promise<FileDeletionResult> {
    if (!items || items.length === 0) {
      return { status: 'success', deletedCount: 0, freedBytes: 0 };
    }

    const mod = await ensureNativeModule(2500);
    const totalBytesToFree = items.reduce((acc, item) => acc + item.sizeBytes, 0);

    if (mod) {
      try {
        const contentUris = items.map((i) => i.contentUri || i.id);
        const result = await mod.requestDeleteFiles(contentUris);

        if (result.success) {
          this.invalidateCache();
          const freed = items.slice(0, result.deletedCount).reduce((acc, f) => acc + f.sizeBytes, 0);
          return {
            status: 'success',
            deletedCount: result.deletedCount,
            freedBytes: freed,
          };
        } else if (result.cancelled) {
          return {
            status: 'cancelled',
            deletedCount: 0,
            freedBytes: 0,
          };
        } else {
          return {
            status: 'failed',
            deletedCount: result.deletedCount ?? 0,
            freedBytes: 0,
            error: result.error || 'System deletion failed or was rejected.',
          };
        }
      } catch (err: any) {
        return {
          status: 'failed',
          deletedCount: 0,
          freedBytes: 0,
          error: err?.message || 'Native delete request threw an exception.',
        };
      }
    }

    // Mock deletion for sandbox testing
    return {
      status: 'success',
      deletedCount: items.length,
      freedBytes: totalBytesToFree,
    };
  }

  async openMediaInSystem(contentUri: string, mimeType?: string): Promise<{ success: boolean; error?: string }> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      return mod.openMediaInSystemViewer(contentUri, mimeType);
    }
    return { success: false, error: 'Native module unavailable' };
  }

  async playAudio(contentUri: string): Promise<AudioPlaybackInfo> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      const res = await mod.playAudio(contentUri);
      return {
        isPlaying: res.isPlaying,
        uri: res.uri,
        positionMs: res.positionMs,
        durationMs: res.durationMs,
        error: res.error,
      };
    }
    return { isPlaying: false, uri: contentUri, positionMs: 0, durationMs: 0, error: 'Native audio player unavailable' };
  }

  async pauseAudio(): Promise<AudioPlaybackInfo> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      const res = await mod.pauseAudio();
      return {
        isPlaying: res.isPlaying,
        uri: res.uri,
        positionMs: res.positionMs,
        durationMs: res.durationMs,
      };
    }
    return { isPlaying: false, uri: null, positionMs: 0, durationMs: 0 };
  }

  async resumeAudio(): Promise<AudioPlaybackInfo> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      const res = await mod.resumeAudio();
      return {
        isPlaying: res.isPlaying,
        uri: res.uri,
        positionMs: res.positionMs,
        durationMs: res.durationMs,
      };
    }
    return { isPlaying: false, uri: null, positionMs: 0, durationMs: 0 };
  }

  async stopAudio(): Promise<AudioPlaybackInfo> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      await mod.stopAudio();
      return {
        isPlaying: false,
        uri: null,
        positionMs: 0,
        durationMs: 0,
      };
    }
    return { isPlaying: false, uri: null, positionMs: 0, durationMs: 0 };
  }

  async getAudioState(): Promise<AudioPlaybackInfo> {
    const mod = await ensureNativeModule(2500);
    if (mod) {
      const res = await mod.getAudioPlaybackState();
      return {
        isPlaying: res.isPlaying,
        uri: res.uri,
        positionMs: res.positionMs,
        durationMs: res.durationMs,
      };
    }
    return { isPlaying: false, uri: null, positionMs: 0, durationMs: 0 };
  }

  async getRecentScans(): Promise<RecentScanInfo[]> {
    if (this.isNativeAvailable()) {
      return [
        {
          id: 'real-scan-1',
          timestamp: 'Live Native Inspection',
          status: 'completed',
          scannedItemsCount: 0,
          potentialSavingsBytes: 0,
          summary: 'Android StatFs & MediaStore live telemetry connected.',
          isMock: false,
        },
      ];
    }
    return MOCK_RECENT_SCANS.map((scan) => ({ ...scan, isMock: true }));
  }

  async requestStorageScan(): Promise<StorageSummary> {
    return this.getStorageSummary(true);
  }

  async getStorageCategories(forceRefresh: boolean = false): Promise<StorageCategoryDetail[]> {
    const summary = await this.getStorageSummary(forceRefresh);
    return summary.categories;
  }
}

export const storageService: IStorageService = new AndroidNativeStorageService();

// Standalone exports
export const getStorageSummary = (forceRefresh?: boolean): Promise<StorageSummary> =>
  storageService.getStorageSummary(forceRefresh);

export const getMediaFiles = (
  options?: GetMediaFilesOptions,
  forceRefresh?: boolean
): Promise<MediaFilesResponse> =>
  storageService.getMediaFiles(options, forceRefresh);

export const findLargeFiles = (
  minSizeBytes?: number,
  maxResults?: number
): Promise<StorageItem[]> =>
  storageService.findLargeFiles(minSizeBytes, maxResults);

export const deleteFiles = (items: StorageItem[]): Promise<FileDeletionResult> =>
  storageService.deleteFiles(items);

export const getRecentScans = (): Promise<RecentScanInfo[]> =>
  storageService.getRecentScans();
