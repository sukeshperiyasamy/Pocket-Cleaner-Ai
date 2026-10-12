import { requireNativeModule } from 'expo';
import {
  NativeStorageSummary,
  NativeMemorySummary,
  NativePermissionResult,
  NativeLargeFilesResult,
  NativeCategoryBreakdownResult,
} from './DeviceMetrics.types';

export interface IDeviceMetricsNative {
  getStorageSummary(): Promise<NativeStorageSummary>;
  getMemorySummary(): Promise<NativeMemorySummary>;
  checkStoragePermissions(): Promise<NativePermissionResult>;
  findLargeFiles(minSizeBytes: number, maxResults: number): Promise<NativeLargeFilesResult>;
  getCategoryBreakdown(): Promise<NativeCategoryBreakdownResult>;
}

let nativeModuleInstance: IDeviceMetricsNative | null = null;
let isNativeModuleAvailable = false;

try {
  nativeModuleInstance = requireNativeModule<IDeviceMetricsNative>('DeviceMetrics');
  if (nativeModuleInstance) {
    isNativeModuleAvailable = true;
  }
} catch {
  // Native module is not linked (e.g. running inside Expo Go without development build)
  isNativeModuleAvailable = false;
}

export { isNativeModuleAvailable };
export default nativeModuleInstance;
