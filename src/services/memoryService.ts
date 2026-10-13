import { MemorySummary, MemoryRecommendation } from '@/types';
import {
  MOCK_MEMORY_SUMMARY,
  MOCK_MEMORY_RECOMMENDATIONS,
} from '@/constants/mockData';
import {
  DeviceMetricsModule,
  isNativeModuleAvailable,
  ensureNativeModule,
  getNativeModuleDiagnostics,
  recordNativeRuntimeError,
  recordFallbackReason,
  NativeModuleDiagnostics,
} from '../../modules/device-metrics/src';

export interface IMemoryService {
  getMemorySummary(forceRefresh?: boolean): Promise<MemorySummary>;
  invalidateCache(): void;
  getMemoryRecommendations(): Promise<MemoryRecommendation[]>;
  isNativeAvailable(): boolean;
  getDiagnostics(): NativeModuleDiagnostics;
}

/**
 * AndroidNativeMemoryService
 * Implementation of IMemoryService that queries real Android ActivityManager.MemoryInfo
 * via our custom Kotlin Expo Module (DeviceMetricsModule).
 * Accurately measures system RAM, available pages, threshold, and lowMemory state.
 */
export class AndroidNativeMemoryService implements IMemoryService {
  private cachedSummary: MemorySummary | null = null;
  private cacheTimestamp: number = 0;
  private inFlightPromise: Promise<MemorySummary> | null = null;
  private readonly CACHE_TTL_MS = 6000; // 6s in-memory TTL to avoid repeated IPC calls during rapid tab switching

  invalidateCache(): void {
    this.cachedSummary = null;
    this.cacheTimestamp = 0;
    this.inFlightPromise = null;
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

  async getMemorySummary(forceRefresh: boolean = false): Promise<MemorySummary> {
    if (!forceRefresh && this.cachedSummary && (Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS)) {
      return this.cachedSummary;
    }

    if (!forceRefresh && this.inFlightPromise) {
      return this.inFlightPromise;
    }

    const fetchPromise = (async (): Promise<MemorySummary> => {
      const mod = await ensureNativeModule(2500);
      if (mod) {
        try {
          const nativeMem = await mod.getMemorySummary();
          recordNativeRuntimeError(null);
          recordFallbackReason(null);
          console.log('[memoryService] Native memory summary:', JSON.stringify(nativeMem));
          const summary: MemorySummary = {
            totalBytes: nativeMem.totalBytes,
            usedBytes: nativeMem.usedBytes,
            availableBytes: nativeMem.availableBytes,
            appUsageBytes: nativeMem.appUsageBytes,
            pressureLevel: nativeMem.pressureLevel,
            pressurePercentage: nativeMem.pressurePercentage,
            thresholdBytes: nativeMem.thresholdBytes,
            isLowMemory: nativeMem.isLowMemory,
            isMock: false,
            dataSourceStatus: 'live',
            dataSourceError: null,
            lastUpdated: nativeMem.lastUpdated,
          };
          this.cachedSummary = summary;
          this.cacheTimestamp = Date.now();
          return summary;
        } catch (error: any) {
          const msg = error?.message || String(error);
          recordNativeRuntimeError(msg);
          recordFallbackReason(`Native getMemorySummary failed: ${msg}`);
          console.warn('Native getMemorySummary failed, marking unavailable:', error);
          return {
            totalBytes: 0,
            usedBytes: 0,
            availableBytes: 0,
            appUsageBytes: 0,
            pressureLevel: 'normal',
            pressurePercentage: 0,
            isMock: true,
            dataSourceStatus: 'unavailable',
            dataSourceError: msg,
            lastUpdated: 'Query failed',
          };
        }
      }

      // Fallback for Expo Go sandbox
      recordFallbackReason('Running in Expo Go sandbox without custom native dev build');
      const simSummary: MemorySummary = {
        ...MOCK_MEMORY_SUMMARY,
        isMock: true,
        dataSourceStatus: 'simulated',
        dataSourceError: 'Native module unavailable in Expo Go sandbox',
        lastUpdated: 'Expo Go (Simulated Fallback)',
      };
      this.cachedSummary = simSummary;
      this.cacheTimestamp = Date.now();
      return simSummary;
    })();

    this.inFlightPromise = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      this.inFlightPromise = null;
    }
  }

  async getMemoryRecommendations(): Promise<MemoryRecommendation[]> {
    return MOCK_MEMORY_RECOMMENDATIONS;
  }
}

export const memoryService: IMemoryService = new AndroidNativeMemoryService();

// Standalone interface-matching function export as specified in requirements
export const getMemorySummary = (forceRefresh?: boolean): Promise<MemorySummary> =>
  memoryService.getMemorySummary(forceRefresh);
