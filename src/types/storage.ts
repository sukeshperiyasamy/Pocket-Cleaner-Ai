export type StorageCategory =
  | 'images'
  | 'videos'
  | 'downloads'
  | 'other'
  | 'apps'
  | 'audio';

export interface StorageCategoryDetail {
  category: StorageCategory;
  name: string;
  sizeBytes: number;
  fileCount: number;
  icon: string;
  color: string;
}

export interface StorageItem {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  category: StorageCategory;
  extension: string;
  lastModified: string;
  isSafeToReview: boolean;
  description?: string;
  contentUri?: string;
  isMock: boolean;
}

export interface StorageSummary {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  categories: StorageCategoryDetail[];
  isMock: boolean;
  lastScanTimestamp: string;
  isAppAccessibleOnly?: boolean;
  storagePath?: string;
  externalTotalBytes?: number;
  externalAvailableBytes?: number;
  hasPermission?: boolean;
}

export type FileSortOption = 'size_desc' | 'size_asc' | 'date_desc' | 'name_asc';
export type FileFilterOption = 'all' | StorageCategory;

export interface RecentScanInfo {
  id: string;
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
  scannedItemsCount: number;
  potentialSavingsBytes: number;
  summary: string;
  isMock: boolean;
}
