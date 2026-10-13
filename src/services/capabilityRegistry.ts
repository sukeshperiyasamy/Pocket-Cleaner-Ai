import { AssistantToolName } from '@/types';

export interface CapabilityParameterDescriptor {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: unknown;
  description: string;
  validationRules: string;
}

export interface AssistantCapabilityDescriptor {
  id: AssistantToolName;
  name: string;
  description: string;
  isReadOnly: true;
  requiresUserConfirmation: false;
  requiredPermissions: readonly string[];
  parameters: readonly CapabilityParameterDescriptor[];
  possibleErrors: readonly string[];
  resultSchema: string;
}

export interface UnsupportedCapabilityDescriptor {
  id: string;
  name: string;
  description: string;
  isSupported: false;
  reason: string;
  alternativeGuidance: string;
}

/**
 * Single source of truth for all assistant-executable capabilities.
 * Every capability is strictly read-only and queries local Android APIs.
 */
export const CAPABILITY_REGISTRY: Record<AssistantToolName, AssistantCapabilityDescriptor> = {
  get_storage_summary: {
    id: 'get_storage_summary',
    name: 'Get Storage Summary',
    description: 'Retrieves device-wide filesystem capacity, used space, and free space via Android StatFs.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: [],
    parameters: [
      {
        name: 'forceRefresh',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: 'Bypass internal cache to re-query StatFs immediately',
        validationRules: 'Boolean value',
      },
    ],
    possibleErrors: [
      'STATFS_READ_FAILED: Unable to stat /data storage partition',
      'PERMISSION_DENIED: Storage volume inaccessible',
    ],
    resultSchema: 'StorageSummaryToolResult { totalBytes, usedBytes, freeBytes, usedPercentage, storagePath, source, boundaryNote }',
  },

  get_storage_categories: {
    id: 'get_storage_categories',
    name: 'Get Storage Categories',
    description: 'Retrieves aggregated media category breakdown (Images, Videos, Audio, Documents) via MediaStore.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO'],
    parameters: [
      {
        name: 'forceRefresh',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: 'Bypass media cache to re-aggregate categories',
        validationRules: 'Boolean value',
      },
    ],
    possibleErrors: [
      'MEDIASTORE_QUERY_FAILED: Failed to query ContentResolver',
      'PERMISSION_DENIED: Media read permissions not granted by user',
    ],
    resultSchema: 'StorageCategoriesToolResult { categories: CategoryBreakdownItem[], totalIndexedBytes, totalIndexedCount, boundaryNote }',
  },

  find_large_files: {
    id: 'find_large_files',
    name: 'Find Large Files',
    description: 'Queries discoverable media files filtered by minimum byte threshold and category with stable size-descending sort.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO'],
    parameters: [
      {
        name: 'minSizeBytes',
        type: 'number',
        required: false,
        defaultValue: 10485760, // 10 MB
        description: 'Minimum file size in bytes to filter results',
        validationRules: 'Positive number, clamped to 100 GB max',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        defaultValue: 'all',
        description: 'Category filter: "all" | "videos" | "images" | "audio" | "downloads"',
        validationRules: 'Must match one of approved categories',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        defaultValue: 10,
        description: 'Maximum number of items to return',
        validationRules: 'Integer between 1 and 25',
      },
    ],
    possibleErrors: [
      'MEDIASTORE_QUERY_FAILED: Query failed on media URI',
      'PERMISSION_DENIED: User has not granted media permissions',
    ],
    resultSchema: 'FindLargeFilesToolResult { files: FileMetadataItem[], minSizeBytes, category, totalFound, boundaryNote }',
  },

  find_screenshots: {
    id: 'find_screenshots',
    name: 'Find Screenshots',
    description: 'Locates accessible screenshots album items in MediaStore, ordered by size descending.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: ['READ_MEDIA_IMAGES'],
    parameters: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        defaultValue: 10,
        description: 'Maximum screenshot items to return',
        validationRules: 'Integer between 1 and 25',
      },
    ],
    possibleErrors: [
      'MEDIASTORE_QUERY_FAILED: Failed querying image albums',
      'PERMISSION_DENIED: Media images permission not granted',
    ],
    resultSchema: 'FindScreenshotsToolResult { screenshots: FileMetadataItem[], count, totalBytes, boundaryNote }',
  },

  find_screen_recordings: {
    id: 'find_screen_recordings',
    name: 'Find Screen Recordings',
    description: 'Locates accessible screen recording video files in MediaStore, ordered by size descending.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: ['READ_MEDIA_VIDEO'],
    parameters: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        defaultValue: 10,
        description: 'Maximum screen recordings to return',
        validationRules: 'Integer between 1 and 25',
      },
    ],
    possibleErrors: [
      'MEDIASTORE_QUERY_FAILED: Failed querying video albums',
      'PERMISSION_DENIED: Media video permission not granted',
    ],
    resultSchema: 'FindScreenRecordingsToolResult { recordings: FileMetadataItem[], count, totalBytes, boundaryNote }',
  },

  get_memory_summary: {
    id: 'get_memory_summary',
    name: 'Get Memory Summary',
    description: 'Retrieves system-wide RAM metrics via Android ActivityManager.MemoryInfo and current process memory usage.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: [],
    parameters: [
      {
        name: 'forceRefresh',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: 'Bypass memory cache to re-sample ActivityManager immediately',
        validationRules: 'Boolean value',
      },
      {
        name: 'highlightAppUsage',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: 'Flag indicating whether user requested app-specific process memory',
        validationRules: 'Boolean value',
      },
    ],
    possibleErrors: [
      'ACTIVITY_MANAGER_UNAVAILABLE: System service not accessible',
    ],
    resultSchema: 'MemorySummaryToolResult { totalRAMBytes, availableRAMBytes, usedRAMBytes, appUsageBytes, pressurePercentage, pressureLevel, isLowMemory, boundaryNote }',
  },

  search_accessible_files: {
    id: 'search_accessible_files',
    name: 'Search Accessible Files',
    description: 'Searches accessible MediaStore collections for files matching a text query in name or path.',
    isReadOnly: true,
    requiresUserConfirmation: false,
    requiredPermissions: ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO'],
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: 'Search string to match against filename or relative path',
        validationRules: 'Non-empty string, control chars stripped, max 100 chars',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        defaultValue: 10,
        description: 'Maximum matches to return',
        validationRules: 'Integer between 1 and 25',
      },
    ],
    possibleErrors: [
      'SEARCH_QUERY_EMPTY: Query cannot be blank',
      'MEDIASTORE_QUERY_FAILED: Failed querying ContentResolver',
    ],
    resultSchema: 'SearchAccessibleFilesToolResult { query, matches: FileMetadataItem[], count, accessibleScopeNote }',
  },
};

/**
 * Catalog of unsupported operations to provide transparent, informative guidance
 * rather than silent misrouting or false promises.
 */
export const UNSUPPORTED_CAPABILITIES: Record<string, UnsupportedCapabilityDescriptor> = {
  manage_apps: {
    id: 'manage_apps',
    name: 'Uninstall or Remove Applications',
    description: 'Uninstalling or removing third-party applications from the device.',
    isSupported: false,
    reason:
      'Android platform security restricts application installation and uninstallation to the system package installer or Google Play. Pocket Cleaner does not hold device-admin or package-management privileges.',
    alternativeGuidance:
      'To remove apps, open Android Settings > Apps > Manage Apps or visit the Google Play Store Manage Apps section.',
  },

  block_ads: {
    id: 'block_ads',
    name: 'System-Wide Ad Blocking',
    description: 'Disabling or blocking advertisements across the Android operating system and third-party apps.',
    isSupported: false,
    reason:
      'System-wide ad blocking requires modifying DNS configurations, establishing a local VPN tunnel, or root modifications. Pocket Cleaner is an offline storage and device assistant, not a network-filtering proxy.',
    alternativeGuidance:
      'To manage ads on your phone, configure Private DNS in Android Settings > Network & Internet > Private DNS (e.g. dns.adguard.com) or inspect individual browser ad-block settings.',
  },

  direct_file_deletion: {
    id: 'direct_file_deletion',
    name: 'Direct AI-Driven File Deletion',
    description: 'Autonomous deletion of user files, photos, videos, or screenshots by the AI assistant.',
    isSupported: false,
    reason:
      'AI-driven autonomous file deletion is strictly disabled by design to eliminate the risk of accidental data loss or hallucinated bulk deletion. All file deletions require explicit human inspection and single/multi-item confirmation.',
    alternativeGuidance:
      'You can safely inspect cleanup candidates, review screenshots, and confirm deletion in the Deep Cleanup screen.',
  },
};
