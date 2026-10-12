import {
  StorageSummary,
  StorageItem,
  RecentScanInfo,
  StorageCategoryDetail,
} from '@/types';
import {
  MOCK_STORAGE_SUMMARY,
  MOCK_LARGE_FILES,
  MOCK_RECENT_SCANS,
} from '@/constants/mockData';

export interface IStorageService {
  getStorageSummary(): Promise<StorageSummary>;
  findLargeFiles(minSizeBytes?: number, maxResults?: number): Promise<StorageItem[]>;
  getRecentScans(): Promise<RecentScanInfo[]>;
  requestStorageScan(): Promise<StorageSummary>;
  getStorageCategories(): Promise<StorageCategoryDetail[]>;
}

/**
 * MockStorageService
 * Implementation of IStorageService using local mock fixtures.
 * In Phase 2, this will be swapped or extended with a native Android
 * StorageAccessFramework / MediaStore Kotlin module via Expo Custom Native Modules.
 */
export class MockStorageService implements IStorageService {
  async getStorageSummary(): Promise<StorageSummary> {
    // Simulate brief local disk inspection delay (100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      ...MOCK_STORAGE_SUMMARY,
      isMock: true,
    };
  }

  async findLargeFiles(
    minSizeBytes: number = 100 * 1024 * 1024, // default 100MB
    maxResults: number = 20
  ): Promise<StorageItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return MOCK_LARGE_FILES.filter((file) => file.sizeBytes >= minSizeBytes)
      .slice(0, maxResults)
      .map((item) => ({ ...item, isMock: true }));
  }

  async getRecentScans(): Promise<RecentScanInfo[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_RECENT_SCANS.map((scan) => ({ ...scan, isMock: true }));
  }

  async requestStorageScan(): Promise<StorageSummary> {
    // Simulate active scan progress
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      ...MOCK_STORAGE_SUMMARY,
      lastScanTimestamp: 'Just now (Simulated)',
      isMock: true,
    };
  }

  async getStorageCategories(): Promise<StorageCategoryDetail[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_STORAGE_SUMMARY.categories;
  }
}

// Export singleton default instance
export const storageService: IStorageService = new MockStorageService();

// Standalone interface-matching function exports as specified in requirements
export const getStorageSummary = (): Promise<StorageSummary> =>
  storageService.getStorageSummary();

export const findLargeFiles = (
  minSizeBytes?: number,
  maxResults?: number
): Promise<StorageItem[]> =>
  storageService.findLargeFiles(minSizeBytes, maxResults);

export const getRecentScans = (): Promise<RecentScanInfo[]> =>
  storageService.getRecentScans();
