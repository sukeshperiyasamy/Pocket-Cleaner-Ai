export interface NativeStorageSummary {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  externalTotalBytes: number;
  externalAvailableBytes: number;
  isAppAccessibleOnly: boolean;
  storagePath: string;
  measurementTimestamp: number;
  formattedTimestamp: string;
  isMock: boolean;
}

export interface NativeMemorySummary {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  thresholdBytes: number;
  isLowMemory: boolean;
  appUsageBytes: number;
  pressureLevel: 'normal' | 'moderate' | 'critical';
  pressurePercentage: number;
  measurementTimestamp: number;
  lastUpdated: string;
  isMock: boolean;
}

export interface NativePermissionResult {
  hasPermission: boolean;
  sdkVersion: number;
}

export interface NativeFileItem {
  id: string;
  name: string;
  path: string;
  contentUri: string;
  sizeBytes: number;
  category: 'videos' | 'images' | 'audio' | 'downloads' | 'other';
  extension: string;
  lastModified: string;
  isSafeToReview: boolean;
  description: string;
  isMock: boolean;
}

export interface NativeLargeFilesResult {
  hasPermission: boolean;
  files: NativeFileItem[];
}

export interface NativeCategoryItem {
  category: 'videos' | 'images' | 'audio' | 'downloads' | 'other';
  name: string;
  sizeBytes: number;
  fileCount: number;
}

export interface NativeCategoryBreakdownResult {
  hasPermission: boolean;
  categories: NativeCategoryItem[];
}
