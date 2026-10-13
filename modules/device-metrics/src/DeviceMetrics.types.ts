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

export interface NativeMediaItem extends NativeFileItem {
  dateModifiedTimestamp?: number;
  mimeType?: string;
  durationMs?: number;
  width?: number;
  height?: number;
  artist?: string;
  album?: string;
  relativePath?: string;
}

export interface NativeMediaFilesResult {
  hasPermission: boolean;
  category: string;
  totalCountInMediaStore: number;
  validMappedCount: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: string;
  files: NativeMediaItem[];
  error?: string | null;
}

export interface NativeFileDeleteResult {
  success: boolean;
  deletedCount: number;
  cancelled: boolean;
  status: 'success' | 'cancelled' | 'failed';
  safDeletedCount?: number;
  error?: string;
}

export interface NativeAudioPlaybackState {
  isPlaying: boolean;
  uri?: string | null;
  positionMs: number;
  durationMs: number;
  error?: string;
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

export interface NativeDirectoryPickerResult {
  success: boolean;
  treeUri?: string | null;
  name?: string | null;
  cancelled: boolean;
  error?: string;
}

export interface NativePersistedDirectoryItem {
  treeUri: string;
  name: string;
  isReadGranted: boolean;
  isWriteGranted: boolean;
  persistedTime: number;
}

export interface NativeApkAnalysisResult {
  isValidApk: boolean;
  packageName?: string;
  appLabel?: string;
  apkVersionName?: string;
  apkVersionCode?: number;
  isInstalled: boolean;
  isComparisonVerified: boolean;
  installedVersionName?: string;
  installedVersionCode?: number;
  matchStatus:
    | 'matches_installed_same'
    | 'matches_installed_newer'
    | 'matches_installed_older'
    | 'not_installed_or_unverified'
    | 'visibility_restricted';
  error?: string;
}

export type CandidateCategory =
  | 'screenshots'
  | 'screen_recordings'
  | 'large_media'
  | 'old_downloads_docs'
  | 'apk_installers'
  | 'temp_cache_files';

export type CandidateRiskLevel = 'low' | 'medium' | 'high';

export interface NativeDeepCandidateItem {
  id: string;
  name: string;
  path: string;
  contentUri: string;
  sizeBytes: number;
  category: CandidateCategory;
  extension: string;
  dateModifiedTimestamp: number;
  ageDays: number;
  ageLabel: string;
  recommendationReason: string;
  riskLevel: CandidateRiskLevel;
  isSaf: boolean;
  apkAnalysis?: NativeApkAnalysisResult;
}

export interface NativeFolderAnalysisItem {
  folderPath: string;
  totalSizeBytes: number;
  itemCount: number;
  isIncomplete: boolean;
  note: string;
}

export interface NativeDeepScanDiagnostics {
  totalCandidates: number;
  mediaStoreCandidates: number;
  safCandidates: number;
  foldersAggregated: number;
  scanDurationMs: number;
  error?: string;
}

export interface NativeDeepScanResult {
  hasPermission: boolean;
  candidates: NativeDeepCandidateItem[];
  folders: NativeFolderAnalysisItem[];
  diagnostics: NativeDeepScanDiagnostics;
}
