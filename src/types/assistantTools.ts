/**
 * Type definitions for Grounded AI Tools in the Offline Assistant.
 * All tools are strictly read-only and query actual device storage/memory APIs.
 */

export type AssistantToolName =
  | 'get_storage_summary'
  | 'get_storage_categories'
  | 'find_large_files'
  | 'find_screenshots'
  | 'find_screen_recordings'
  | 'get_memory_summary'
  | 'search_accessible_files';

export interface GetStorageSummaryParams {
  forceRefresh?: boolean;
}

export interface GetStorageCategoriesParams {
  forceRefresh?: boolean;
}

export interface FindLargeFilesParams {
  minSizeBytes?: number;
  category?: 'all' | 'videos' | 'images' | 'audio' | 'downloads';
  limit?: number;
}

export interface FindScreenshotsParams {
  limit?: number;
}

export interface FindScreenRecordingsParams {
  limit?: number;
}

export interface GetMemorySummaryParams {
  forceRefresh?: boolean;
  highlightAppUsage?: boolean;
}

export interface SearchAccessibleFilesParams {
  query: string;
  limit?: number;
}

export type ToolParamsMap = {
  get_storage_summary: GetStorageSummaryParams;
  get_storage_categories: GetStorageCategoriesParams;
  find_large_files: FindLargeFilesParams;
  find_screenshots: FindScreenshotsParams;
  find_screen_recordings: FindScreenRecordingsParams;
  get_memory_summary: GetMemorySummaryParams;
  search_accessible_files: SearchAccessibleFilesParams;
};

export interface StorageSummaryToolResult {
  toolName: 'get_storage_summary';
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercentage: number;
  storagePath: string;
  source: 'android_statfs' | 'simulated';
  isMock: boolean;
  boundaryNote: string;
}

export interface CategoryBreakdownItem {
  category: string;
  name: string;
  sizeBytes: number;
  fileCount: number;
}

export interface StorageCategoriesToolResult {
  toolName: 'get_storage_categories';
  categories: CategoryBreakdownItem[];
  totalIndexedBytes: number;
  totalIndexedCount: number;
  isMock: boolean;
  boundaryNote: string;
}

export interface FileMetadataItem {
  id: string;
  name: string;
  sizeBytes: number;
  category: string;
  lastModified?: string;
  relativePath?: string;
}

export interface FindLargeFilesToolResult {
  toolName: 'find_large_files';
  minSizeBytes: number;
  category: string;
  files: FileMetadataItem[];
  totalFound: number;
  isMock: boolean;
  boundaryNote: string;
}

export interface FindScreenshotsToolResult {
  toolName: 'find_screenshots';
  screenshots: FileMetadataItem[];
  count: number;
  totalBytes: number;
  isMock: boolean;
  boundaryNote: string;
}

export interface FindScreenRecordingsToolResult {
  toolName: 'find_screen_recordings';
  recordings: FileMetadataItem[];
  count: number;
  totalBytes: number;
  isMock: boolean;
  boundaryNote: string;
}

export interface MemorySummaryToolResult {
  toolName: 'get_memory_summary';
  totalRAMBytes: number;
  availableRAMBytes: number;
  usedRAMBytes: number;
  appUsageBytes: number;
  pressurePercentage: number;
  pressureLevel: 'normal' | 'moderate' | 'critical';
  isLowMemory: boolean;
  highlightAppUsage?: boolean;
  isMock: boolean;
  boundaryNote: string;
}

export interface SearchAccessibleFilesToolResult {
  toolName: 'search_accessible_files';
  query: string;
  matches: FileMetadataItem[];
  count: number;
  isMock: boolean;
  accessibleScopeNote: string;
}

export type AssistantToolResult =
  | StorageSummaryToolResult
  | StorageCategoriesToolResult
  | FindLargeFilesToolResult
  | FindScreenshotsToolResult
  | FindScreenRecordingsToolResult
  | MemorySummaryToolResult
  | SearchAccessibleFilesToolResult;

export interface ToolExecutionRequest {
  toolName: AssistantToolName;
  parameters: Record<string, unknown>;
}

export interface ToolExecutionSuccess<T extends AssistantToolResult = AssistantToolResult> {
  success: true;
  toolName: AssistantToolName;
  result: T;
  executionDurationMs: number;
}

export interface ToolExecutionFailure {
  success: false;
  toolName: string;
  error: string;
  executionDurationMs: number;
}

export type ToolExecutionOutcome = ToolExecutionSuccess | ToolExecutionFailure;

export type IntentResolutionType =
  | 'tool_execution'
  | 'unsupported_capability'
  | 'destructive_rejected'
  | 'system_navigation'
  | 'clarification_needed'
  | 'conversational';

export interface ToolIntentResolution {
  type: 'tool_execution';
  toolName: AssistantToolName;
  parameters: Record<string, unknown>;
  confidence: number;
}

export interface UnsupportedCapabilityResolution {
  type: 'unsupported_capability';
  capability: 'manage_apps' | 'block_ads' | 'unsupported_other';
  reason: string;
  recommendedAlternative: string;
}

export interface DestructiveRejectedResolution {
  type: 'destructive_rejected';
  action: 'delete_files' | 'modify_files';
  reason: string;
  suggestedAction: {
    label: string;
    route: string;
  };
}

export interface SystemNavigationResolution {
  type: 'system_navigation';
  destination: 'storage_settings' | 'app_settings';
  guidance: string;
}

export interface ClarificationNeededResolution {
  type: 'clarification_needed';
  promptSuggestions: string[];
  clarificationMessage: string;
}

export interface ConversationalResolution {
  type: 'conversational';
}

export type IntentResolution =
  | ToolIntentResolution
  | UnsupportedCapabilityResolution
  | DestructiveRejectedResolution
  | SystemNavigationResolution
  | ClarificationNeededResolution
  | ConversationalResolution;
