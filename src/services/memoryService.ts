import { MemorySummary, MemoryRecommendation } from '@/types';
import {
  MOCK_MEMORY_SUMMARY,
  MOCK_MEMORY_RECOMMENDATIONS,
} from '@/constants/mockData';
import {
  DeviceMetricsModule,
  isNativeModuleAvailable,
} from '../../modules/device-metrics/src';

export interface IMemoryService {
  getMemorySummary(): Promise<MemorySummary>;
  getMemoryRecommendations(): Promise<MemoryRecommendation[]>;
  isNativeAvailable(): boolean;
}

/**
 * AndroidNativeMemoryService
 * Implementation of IMemoryService that queries real Android ActivityManager.MemoryInfo
 * via our custom Kotlin Expo Module (DeviceMetricsModule).
 * Accurately measures system RAM, available pages, threshold, and lowMemory state.
 */
export class AndroidNativeMemoryService implements IMemoryService {
  isNativeAvailable(): boolean {
    return isNativeModuleAvailable && DeviceMetricsModule !== null;
  }

  async getMemorySummary(): Promise<MemorySummary> {
    if (this.isNativeAvailable()) {
      try {
        const nativeMem = await DeviceMetricsModule!.getMemorySummary();
        return {
          totalBytes: nativeMem.totalBytes,
          usedBytes: nativeMem.usedBytes,
          availableBytes: nativeMem.availableBytes,
          appUsageBytes: nativeMem.appUsageBytes,
          pressureLevel: nativeMem.pressureLevel,
          pressurePercentage: nativeMem.pressurePercentage,
          thresholdBytes: nativeMem.thresholdBytes,
          isLowMemory: nativeMem.isLowMemory,
          isMock: false,
          lastUpdated: nativeMem.lastUpdated,
        };
      } catch (error) {
        console.warn('Native getMemorySummary failed, using fallback:', error);
      }
    }

    // Fallback for Expo Go sandbox
    return {
      ...MOCK_MEMORY_SUMMARY,
      isMock: true,
      lastUpdated: 'Expo Go (Simulated Fallback)',
    };
  }

  async getMemoryRecommendations(): Promise<MemoryRecommendation[]> {
    return MOCK_MEMORY_RECOMMENDATIONS;
  }
}

export const memoryService: IMemoryService = new AndroidNativeMemoryService();

// Standalone interface-matching function export as specified in requirements
export const getMemorySummary = (): Promise<MemorySummary> =>
  memoryService.getMemorySummary();
