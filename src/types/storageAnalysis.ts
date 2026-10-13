import {
  NativeApkAnalysisResult,
  NativeDeepCandidateItem,
  NativeFolderAnalysisItem,
  NativeDeepScanDiagnostics,
  NativePersistedDirectoryItem,
  NativeDirectoryPickerResult,
  CandidateCategory,
  CandidateRiskLevel,
} from '../../modules/device-metrics/src/DeviceMetrics.types';

export {
  CandidateCategory,
  CandidateRiskLevel,
  NativeApkAnalysisResult,
  NativeFolderAnalysisItem,
  NativeDeepScanDiagnostics,
  NativePersistedDirectoryItem,
  NativeDirectoryPickerResult,
};

export type StorageCandidate = NativeDeepCandidateItem;

export type AgeFilterDays = 0 | 30 | 90 | 180 | 365;

export interface StorageAnalysisFilter {
  category: CandidateCategory | 'all';
  minAgeDays: AgeFilterDays;
  minSizeBytes?: number;
  searchQuery?: string;
  sortBy?: 'size_desc' | 'size_asc' | 'date_desc' | 'date_asc' | 'name_asc';
}

export interface CategorySummaryInfo {
  category: CandidateCategory;
  title: string;
  count: number;
  totalSizeBytes: number;
  riskLevel: CandidateRiskLevel;
  icon: string;
  color: string;
  description: string;
}

export interface StorageAnalysisScanResult {
  hasPermission: boolean;
  candidates: StorageCandidate[];
  folders: NativeFolderAnalysisItem[];
  diagnostics: NativeDeepScanDiagnostics;
  dataSourceStatus: 'live' | 'simulated' | 'unavailable';
}
