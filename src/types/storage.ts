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
  dateModifiedTimestamp?: number;
  mimeType?: string;
  durationMs?: number;
  width?: number;
  height?: number;
  artist?: string;
  album?: string;
  relativePath?: string;
  isSafeToReview: boolean;
  description?: string;
  contentUri?: string;
  isMock: boolean;
}

export type DataSourceStatus = 'live' | 'simulated' | 'unavailable';

export interface CategoryDiagnostics {
  mediaStoreTotalCount: number;
  validMappedCount: number;
  visibleCount: number;
  thumbnailErrors: number;
  permissionStatus: 'granted' | 'denied' | 'limited';
  queryError?: string | null;
}

export interface StorageSummary {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  categories: StorageCategoryDetail[];
  isMock: boolean;
  dataSourceStatus: DataSourceStatus;
  dataSourceError?: string | null;
  lastScanTimestamp: string;
  isAppAccessibleOnly?: boolean;
  storagePath?: string;
  externalTotalBytes?: number;
  externalAvailableBytes?: number;
  hasPermission?: boolean;
}

export type FileSortOption =
  | 'size_desc'
  | 'size_asc'
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc';

export type FileFilterOption = 'all' | StorageCategory;

export interface GetMediaFilesOptions {
  category?: FileFilterOption;
  minSizeBytes?: number;
  limit?: number;
  offset?: number;
  sortOption?: FileSortOption;
}

export interface MediaFilesResponse {
  files: StorageItem[];
  diagnostics: CategoryDiagnostics;
  dataSourceStatus: DataSourceStatus;
}

export interface FileDeletionResult {
  status: 'success' | 'cancelled' | 'failed' | 'partial';
  deletedCount: number;
  freedBytes: number;
  error?: string;
}

export interface AudioPlaybackInfo {
  isPlaying: boolean;
  uri?: string | null;
  positionMs: number;
  durationMs: number;
  error?: string;
}

export interface RecentScanInfo {
  id: string;
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
  scannedItemsCount: number;
  potentialSavingsBytes: number;
  summary: string;
  isMock: boolean;
}
