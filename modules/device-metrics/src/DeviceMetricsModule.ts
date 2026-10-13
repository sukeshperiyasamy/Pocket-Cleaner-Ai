import { requireNativeModule, requireOptionalNativeModule } from 'expo';
import {
  NativeStorageSummary,
  NativeMemorySummary,
  NativePermissionResult,
  NativeLargeFilesResult,
  NativeCategoryBreakdownResult,
  NativeMediaFilesResult,
  NativeFileDeleteResult,
  NativeAudioPlaybackState,
  NativeDirectoryPickerResult,
  NativePersistedDirectoryItem,
  NativeApkAnalysisResult,
  NativeDeepScanResult,
} from './DeviceMetrics.types';

export interface IDeviceMetricsNative {
  getStorageSummary(): Promise<NativeStorageSummary>;
  getMemorySummary(): Promise<NativeMemorySummary>;
  checkStoragePermissions(): Promise<NativePermissionResult>;
  findLargeFiles(minSizeBytes: number, maxResults: number): Promise<NativeLargeFilesResult>;
  getCategoryBreakdown(): Promise<NativeCategoryBreakdownResult>;
  getMediaFiles(
    category: string,
    minSizeBytes: number,
    limit: number,
    offset: number,
    sortBy: string,
    sortOrder: string
  ): Promise<NativeMediaFilesResult>;
  requestDeleteFiles(contentUris: string[]): Promise<NativeFileDeleteResult>;
  openMediaInSystemViewer(contentUri: string, mimeType?: string): Promise<{ success: boolean; error?: string }>;
  playAudio(contentUri: string): Promise<NativeAudioPlaybackState>;
  pauseAudio(): Promise<NativeAudioPlaybackState>;
  resumeAudio(): Promise<NativeAudioPlaybackState>;
  stopAudio(): Promise<NativeAudioPlaybackState>;
  getAudioPlaybackState(): Promise<NativeAudioPlaybackState>;
  openDirectoryPicker(): Promise<NativeDirectoryPickerResult>;
  getPersistedDirectoryUris(): Promise<NativePersistedDirectoryItem[]>;
  releasePersistedDirectoryUri(treeUri: string): Promise<{ success: boolean; error?: string }>;
  analyzeApk(apkPathOrUri: string): Promise<NativeApkAnalysisResult>;
  scanDeepCleanupCandidates(options?: { safTreeUris?: string[] }): Promise<NativeDeepScanResult>;
  cancelDeepScan(): Promise<{ success: boolean }>;
  computeFileSha256(filePath: string): Promise<string>;
}

export interface NativeModuleDiagnostics {
  isAvailable: boolean;
  loadError: string | null;
  runtimeError: string | null;
  fallbackReason: string | null;
  registeredExpoModules: string[];
  moduleName: string;
  hasGlobalExpo: boolean;
  rawExpoModulesKeys: string[];
}

let cachedNativeModule: IDeviceMetricsNative | null = null;
let lastLoadError: string | null = null;
let lastRuntimeError: string | null = null;
let lastFallbackReason: string | null = null;

export function recordNativeRuntimeError(error: string | null) {
  lastRuntimeError = error;
}

export function recordFallbackReason(reason: string | null) {
  lastFallbackReason = reason;
}

export function getDeviceMetricsModule(): IDeviceMetricsNative | null {
  if (cachedNativeModule) {
    return cachedNativeModule;
  }

  try {
    // 1. Try requireOptionalNativeModule first (safely checks JSI / Bridgeless expo.modules)
    const optMod = requireOptionalNativeModule<IDeviceMetricsNative>('DeviceMetrics');
    if (optMod) {
      cachedNativeModule = optMod;
      lastLoadError = null;
      console.log('[DeviceMetrics] Successfully resolved native module via requireOptionalNativeModule');
      return optMod;
    }

    // 2. Direct check on globalThis.expo.modules if JSI was installed after initial import
    const expoGlobal = (globalThis as any)?.expo;
    if (expoGlobal?.modules?.DeviceMetrics) {
      cachedNativeModule = expoGlobal.modules.DeviceMetrics as IDeviceMetricsNative;
      lastLoadError = null;
      console.log('[DeviceMetrics] Successfully resolved native module via globalThis.expo.modules.DeviceMetrics');
      return cachedNativeModule;
    }

    // 3. Fall back to requireNativeModule to capture exact exception if not found
    const reqMod = requireNativeModule<IDeviceMetricsNative>('DeviceMetrics');
    if (reqMod) {
      cachedNativeModule = reqMod;
      lastLoadError = null;
      console.log('[DeviceMetrics] Successfully resolved native module via requireNativeModule');
      return reqMod;
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    lastLoadError = errorMsg;
    console.warn('[DeviceMetrics] Native module resolution attempt failed:', errorMsg);
  }

  return null;
}

export async function ensureNativeModule(timeoutMs: number = 2500): Promise<IDeviceMetricsNative | null> {
  const current = getDeviceMetricsModule();
  if (current) return current;

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const retry = getDeviceMetricsModule();
    if (retry) {
      console.log(`[DeviceMetrics] Successfully resolved native module after waiting ${Date.now() - startTime}ms for JSI interop.`);
      return retry;
    }
  }

  return null;
}

export function isNativeModuleAvailable(): boolean {
  return getDeviceMetricsModule() !== null;
}

export function getNativeModuleDiagnostics(): NativeModuleDiagnostics {
  const mod = getDeviceMetricsModule();
  const expoGlobal = (globalThis as any)?.expo;
  const registered = expoGlobal?.modules ? Object.keys(expoGlobal.modules) : [];

  return {
    isAvailable: mod !== null,
    loadError: lastLoadError,
    runtimeError: lastRuntimeError,
    fallbackReason: lastFallbackReason || (mod === null ? 'Native module uninitialized or running in Expo Go sandbox' : null),
    registeredExpoModules: registered,
    moduleName: 'DeviceMetrics',
    hasGlobalExpo: Boolean(expoGlobal),
    rawExpoModulesKeys: registered,
  };
}

// Resilient proxy wrapper so existing code calling DeviceMetricsModule.getStorageSummary()
// dynamically resolves the underlying instance at call-time.
const DeviceMetricsProxy = new Proxy({} as IDeviceMetricsNative, {
  get(_target, prop: string | symbol) {
    const instance = getDeviceMetricsModule();
    if (!instance) {
      console.warn(`[DeviceMetricsProxy] Method '${String(prop)}' called while native module is not available. Error:`, lastLoadError);
      return undefined;
    }
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export { cachedNativeModule as nativeModuleInstance };
export default DeviceMetricsProxy;
