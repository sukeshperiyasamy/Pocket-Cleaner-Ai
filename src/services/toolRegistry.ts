import {
  AssistantToolName,
  AssistantToolResult,
  ToolExecutionRequest,
  ToolExecutionOutcome,
  StorageSummaryToolResult,
  StorageCategoriesToolResult,
  FindLargeFilesToolResult,
  FindScreenshotsToolResult,
  FindScreenRecordingsToolResult,
  MemorySummaryToolResult,
  SearchAccessibleFilesToolResult,
  FileMetadataItem,
} from '@/types';
import type { IStorageService } from './storageService';
import type { IMemoryService } from './memoryService';
import type { IStorageAnalysisService } from './storageAnalysisService';

export const APPROVED_TOOL_NAMES: readonly AssistantToolName[] = [
  'get_storage_summary',
  'get_storage_categories',
  'find_large_files',
  'find_screenshots',
  'find_screen_recordings',
  'get_memory_summary',
  'search_accessible_files',
] as const;

const APPROVED_CATEGORIES = new Set(['all', 'videos', 'images', 'audio', 'downloads']);

export class ToolValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

/**
 * Validates and sanitizes parameters for tool execution.
 * Enforces strict typing, numeric bounds, and character sanitation.
 */
export function validateToolRequest(request: ToolExecutionRequest): ToolExecutionRequest {
  if (!request || typeof request !== 'object') {
    throw new ToolValidationError('Tool execution request must be an object.');
  }

  const { toolName, parameters = {} } = request;

  if (!toolName || typeof toolName !== 'string') {
    throw new ToolValidationError('Tool request is missing a valid toolName.');
  }

  // Reject any unapproved or destructive action
  if (!APPROVED_TOOL_NAMES.includes(toolName as AssistantToolName)) {
    throw new ToolValidationError(
      `Unknown or unauthorized tool: "${toolName}". Only registered read-only tools can be executed.`
    );
  }

  const sanitizedParams: Record<string, unknown> = {};

  switch (toolName as AssistantToolName) {
    case 'get_storage_summary':
    case 'get_storage_categories':
    case 'get_memory_summary': {
      sanitizedParams.forceRefresh = Boolean(parameters.forceRefresh);
      if (toolName === 'get_memory_summary' && parameters.highlightAppUsage) {
        sanitizedParams.highlightAppUsage = Boolean(parameters.highlightAppUsage);
      }
      break;
    }

    case 'find_large_files': {
      // minSizeBytes validation
      let minBytes = 0;
      if (parameters.minSizeBytes !== undefined && parameters.minSizeBytes !== null) {
        const parsed = Number(parameters.minSizeBytes);
        if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
          throw new ToolValidationError('minSizeBytes must be a positive finite number.');
        }
        // Clamp to maximum 100 GB
        minBytes = Math.min(parsed, 100 * 1024 * 1024 * 1024);
      }
      sanitizedParams.minSizeBytes = minBytes;

      // Category validation
      let cat = 'all';
      if (parameters.category !== undefined && parameters.category !== null) {
        const catStr = String(parameters.category).toLowerCase().trim();
        if (!APPROVED_CATEGORIES.has(catStr)) {
          throw new ToolValidationError(
            `Unsupported category "${catStr}". Must be one of: ${Array.from(APPROVED_CATEGORIES).join(', ')}`
          );
        }
        cat = catStr;
      }
      sanitizedParams.category = cat;

      // Limit validation (1-25, default 10)
      let limit = 10;
      if (parameters.limit !== undefined && parameters.limit !== null) {
        const parsedLimit = parseInt(String(parameters.limit), 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          throw new ToolValidationError('limit must be a positive integer.');
        }
        limit = Math.min(Math.max(parsedLimit, 1), 25);
      }
      sanitizedParams.limit = limit;
      break;
    }

    case 'find_screenshots':
    case 'find_screen_recordings': {
      let limit = 10;
      if (parameters.limit !== undefined && parameters.limit !== null) {
        const parsedLimit = parseInt(String(parameters.limit), 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          throw new ToolValidationError('limit must be a positive integer.');
        }
        limit = Math.min(Math.max(parsedLimit, 1), 25);
      }
      sanitizedParams.limit = limit;
      break;
    }

    case 'search_accessible_files': {
      if (parameters.query === undefined || parameters.query === null || typeof parameters.query !== 'string') {
        throw new ToolValidationError('search_accessible_files requires a string "query" parameter.');
      }
      const rawQuery = parameters.query.trim();
      if (!rawQuery) {
        throw new ToolValidationError('Search query cannot be empty.');
      }
      // Sanitize query: strip control characters, limit length to 100 chars
      const sanitizedQuery = rawQuery.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 100);
      sanitizedParams.query = sanitizedQuery;

      let limit = 10;
      if (parameters.limit !== undefined && parameters.limit !== null) {
        const parsedLimit = parseInt(String(parameters.limit), 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          throw new ToolValidationError('limit must be a positive integer.');
        }
        limit = Math.min(Math.max(parsedLimit, 1), 25);
      }
      sanitizedParams.limit = limit;
      break;
    }
  }

  return {
    toolName: toolName as AssistantToolName,
    parameters: sanitizedParams,
  };
}

let _storageService: IStorageService | null = null;
let _memoryService: IMemoryService | null = null;
let _storageAnalysisService: IStorageAnalysisService | null = null;

async function getStorageService(): Promise<IStorageService> {
  if (!_storageService) {
    const mod = await import('./storageService');
    _storageService = mod.storageService;
  }
  return _storageService;
}

async function getMemoryService(): Promise<IMemoryService> {
  if (!_memoryService) {
    const mod = await import('./memoryService');
    _memoryService = mod.memoryService;
  }
  return _memoryService;
}

async function getStorageAnalysisService(): Promise<IStorageAnalysisService> {
  if (!_storageAnalysisService) {
    const mod = await import('./storageAnalysisService');
    _storageAnalysisService = mod.storageAnalysisService;
  }
  return _storageAnalysisService;
}

export interface ToolRegistryDependencies {
  storageService?: IStorageService;
  memoryService?: IMemoryService;
  storageAnalysisService?: IStorageAnalysisService;
}

/**
 * LocalToolRegistry
 * Registry of approved TypeScript services that execute native storage and memory queries.
 * Strictly read-only; impossible to perform file modifications or deletions.
 */
export class LocalToolRegistry {
  private customStorageService?: IStorageService;
  private customMemoryService?: IMemoryService;
  private customStorageAnalysisService?: IStorageAnalysisService;

  constructor(deps?: ToolRegistryDependencies) {
    if (deps) {
      this.customStorageService = deps.storageService;
      this.customMemoryService = deps.memoryService;
      this.customStorageAnalysisService = deps.storageAnalysisService;
    }
  }

  private async resolveStorage(): Promise<IStorageService> {
    return this.customStorageService || getStorageService();
  }

  private async resolveMemory(): Promise<IMemoryService> {
    return this.customMemoryService || getMemoryService();
  }

  private async resolveStorageAnalysis(): Promise<IStorageAnalysisService> {
    return this.customStorageAnalysisService || getStorageAnalysisService();
  }

  /**
   * Executes an approved tool safely.
   */
  async executeTool(rawRequest: ToolExecutionRequest): Promise<ToolExecutionOutcome> {
    const startTime = Date.now();

    try {
      const validated = validateToolRequest(rawRequest);

      let result: AssistantToolResult;

      switch (validated.toolName) {
        case 'get_storage_summary':
          result = await this.getStorageSummary(validated.parameters);
          break;
        case 'get_storage_categories':
          result = await this.getStorageCategories(validated.parameters);
          break;
        case 'find_large_files':
          result = await this.findLargeFiles(validated.parameters);
          break;
        case 'find_screenshots':
          result = await this.findScreenshots(validated.parameters);
          break;
        case 'find_screen_recordings':
          result = await this.findScreenRecordings(validated.parameters);
          break;
        case 'get_memory_summary':
          result = await this.getMemorySummary(validated.parameters);
          break;
        case 'search_accessible_files':
          result = await this.searchAccessibleFiles(validated.parameters);
          break;
        default:
          throw new ToolValidationError(`Unsupported tool execution: ${validated.toolName}`);
      }

      const durationMs = Math.max(1, Date.now() - startTime);
      return {
        success: true,
        toolName: validated.toolName,
        result,
        executionDurationMs: durationMs,
      };
    } catch (err) {
      const durationMs = Math.max(1, Date.now() - startTime);
      return {
        success: false,
        toolName: rawRequest?.toolName || 'unknown',
        error: err instanceof Error ? err.message : String(err),
        executionDurationMs: durationMs,
      };
    }
  }

  /**
   * Tool 1: get_storage_summary
   * Actual filesystem metrics via Android StatFs.
   */
  private async getStorageSummary(params: Record<string, unknown>): Promise<StorageSummaryToolResult> {
    const forceRefresh = Boolean(params.forceRefresh);
    const storage = await this.resolveStorage();
    const summary = await storage.getStorageSummary(forceRefresh);

    const usedPercentage = summary.totalBytes > 0
      ? Math.min(100, Math.max(0, Math.round((summary.usedBytes / summary.totalBytes) * 100)))
      : 0;

    return {
      toolName: 'get_storage_summary',
      totalBytes: summary.totalBytes,
      usedBytes: summary.usedBytes,
      freeBytes: summary.freeBytes,
      usedPercentage,
      storagePath: summary.storagePath || '/data',
      source: summary.isMock ? 'simulated' : 'android_statfs',
      isMock: summary.isMock,
      boundaryNote:
        'Device-wide filesystem statistics measured via Android StatFs. ' +
        'This reflects physical storage volume partition metrics, distinguishing device filesystem capacity ' +
        'from the sum of indexed media files.',
    };
  }

  /**
   * Tool 2: get_storage_categories
   * Actual categorized media breakdown from existing storage service.
   */
  private async getStorageCategories(params: Record<string, unknown>): Promise<StorageCategoriesToolResult> {
    const forceRefresh = Boolean(params.forceRefresh);
    const storage = await this.resolveStorage();
    const summary = await storage.getStorageSummary(forceRefresh);

    const categories = (summary.categories || []).map((cat) => ({
      category: cat.category,
      name: cat.name,
      sizeBytes: cat.sizeBytes,
      fileCount: cat.fileCount,
    }));

    const totalIndexedBytes = categories.reduce((sum, c) => sum + c.sizeBytes, 0);
    const totalIndexedCount = categories.reduce((sum, c) => sum + c.fileCount, 0);

    return {
      toolName: 'get_storage_categories',
      categories,
      totalIndexedBytes,
      totalIndexedCount,
      isMock: summary.isMock,
      boundaryNote:
        'Indexed categories represent discoverable media files only (Images, Videos, Audio, Documents). ' +
        'They do not account for Android OS system partitions, application APK binaries, or private app sandbox directories.',
    };
  }

  /**
   * Tool 3: find_large_files
   * Queries actual accessible matching files with pagination/limit.
   */
  private async findLargeFiles(params: Record<string, unknown>): Promise<FindLargeFilesToolResult> {
    const minSizeBytes = Number(params.minSizeBytes) || 0;
    const category = (params.category as any) || 'all';
    const limit = Number(params.limit) || 10;

    const storage = await this.resolveStorage();
    const mediaRes = await storage.getMediaFiles({
      category,
      minSizeBytes,
      limit,
      sortOption: 'size_desc',
    });

    const mappedFiles: FileMetadataItem[] = mediaRes.files.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.sizeBytes,
      category: f.category,
      lastModified: f.lastModified,
      relativePath: f.relativePath,
    }));

    return {
      toolName: 'find_large_files',
      minSizeBytes,
      category,
      files: mappedFiles,
      totalFound: mediaRes.diagnostics.validMappedCount ?? mappedFiles.length,
      isMock: mediaRes.dataSourceStatus !== 'live',
      boundaryNote: `Listing top ${mappedFiles.length} accessible files sorted by size (>= ${minSizeBytes} bytes). Result count clamped to avoid prompt overflow.`,
    };
  }

  /**
   * Tool 4: find_screenshots
   * Returns accessible, indexed screenshots with metadata.
   */
  private async findScreenshots(params: Record<string, unknown>): Promise<FindScreenshotsToolResult> {
    const limit = Number(params.limit) || 10;

    const analysis = await this.resolveStorageAnalysis();
    const scanResult = await analysis.scanCandidates();
    const screenshotCandidates = scanResult.candidates.filter(
      (c) => c.category === 'screenshots' || c.path.toLowerCase().includes('screenshots')
    );

    // Sort by size descending
    screenshotCandidates.sort((a, b) => b.sizeBytes - a.sizeBytes);

    const sliced = screenshotCandidates.slice(0, limit);
    const mapped: FileMetadataItem[] = sliced.map((c) => ({
      id: c.id,
      name: c.name,
      sizeBytes: c.sizeBytes,
      category: 'screenshots',
      lastModified: c.ageLabel,
      relativePath: c.path,
    }));

    const totalBytes = screenshotCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);

    return {
      toolName: 'find_screenshots',
      screenshots: mapped,
      count: screenshotCandidates.length,
      totalBytes,
      isMock: scanResult.dataSourceStatus !== 'live',
      boundaryNote:
        'Discovered via MediaStore in Screenshots albums. Represents accessible screen capture images.',
    };
  }

  /**
   * Tool 5: find_screen_recordings
   * Returns actual matching screen recordings from media index.
   */
  private async findScreenRecordings(params: Record<string, unknown>): Promise<FindScreenRecordingsToolResult> {
    const limit = Number(params.limit) || 10;

    const analysis = await this.resolveStorageAnalysis();
    const scanResult = await analysis.scanCandidates();
    const recordingCandidates = scanResult.candidates.filter(
      (c) =>
        c.category === 'screen_recordings' ||
        c.path.toLowerCase().includes('screenrecorder') ||
        c.name.toLowerCase().includes('screenrecorder')
    );

    // Sort by size descending
    recordingCandidates.sort((a, b) => b.sizeBytes - a.sizeBytes);

    const sliced = recordingCandidates.slice(0, limit);
    const mapped: FileMetadataItem[] = sliced.map((c) => ({
      id: c.id,
      name: c.name,
      sizeBytes: c.sizeBytes,
      category: 'screen_recordings',
      lastModified: c.ageLabel,
      relativePath: c.path,
    }));

    const totalBytes = recordingCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);

    return {
      toolName: 'find_screen_recordings',
      recordings: mapped,
      count: recordingCandidates.length,
      totalBytes,
      isMock: scanResult.dataSourceStatus !== 'live',
      boundaryNote:
        'Discovered via MediaStore in ScreenRecorder albums and matching video filenames.',
    };
  }

  /**
   * Tool 6: get_memory_summary
   * Actual RAM metrics from Android ActivityManager.MemoryInfo.
   */
  private async getMemorySummary(params: Record<string, unknown>): Promise<MemorySummaryToolResult> {
    const forceRefresh = Boolean(params.forceRefresh);
    const memory = await this.resolveMemory();
    const mem = await memory.getMemorySummary(forceRefresh);

    return {
      toolName: 'get_memory_summary',
      totalRAMBytes: mem.totalBytes,
      availableRAMBytes: mem.availableBytes,
      usedRAMBytes: mem.usedBytes,
      appUsageBytes: mem.appUsageBytes,
      pressurePercentage: mem.pressurePercentage,
      pressureLevel: mem.pressureLevel,
      isLowMemory: Boolean(mem.isLowMemory),
      highlightAppUsage: Boolean(params.highlightAppUsage),
      isMock: mem.isMock,
      boundaryNote:
        'Queried via Android ActivityManager.MemoryInfo. ' +
        'Total and available RAM reflect system-wide memory pages managed by the Android kernel. ' +
        'App usage reflects current application process memory.',
    };
  }

  /**
   * Tool 7: search_accessible_files
   * Searches only authorized locations and media collections.
   */
  private async searchAccessibleFiles(params: Record<string, unknown>): Promise<SearchAccessibleFilesToolResult> {
    const query = String(params.query || '').toLowerCase().trim();
    const limit = Number(params.limit) || 10;

    const storage = await this.resolveStorage();
    const mediaRes = await storage.getMediaFiles({ category: 'all', limit: 100 });
    const matches = mediaRes.files.filter(
      (f) => f.name.toLowerCase().includes(query) || (f.relativePath && f.relativePath.toLowerCase().includes(query))
    );

    const sliced = matches.slice(0, limit);
    const mapped: FileMetadataItem[] = sliced.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.sizeBytes,
      category: f.category,
      lastModified: f.lastModified,
      relativePath: f.relativePath,
    }));

    return {
      toolName: 'search_accessible_files',
      query,
      matches: mapped,
      count: matches.length,
      isMock: mediaRes.dataSourceStatus !== 'live',
      accessibleScopeNote:
        'Searched authorized MediaStore shared collections (Images, Videos, Audio, Downloads). ' +
        'Private application sandboxes, system root storage, and non-granted directories are not accessible and were not searched.',
    };
  }
}

export const toolRegistry = new LocalToolRegistry();
