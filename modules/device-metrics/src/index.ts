import DeviceMetricsModule, {
  isNativeModuleAvailable,
  getDeviceMetricsModule,
  ensureNativeModule,
  getNativeModuleDiagnostics,
  recordNativeRuntimeError,
  recordFallbackReason,
  type NativeModuleDiagnostics,
} from './DeviceMetricsModule';

export * from './DeviceMetrics.types';
export {
  DeviceMetricsModule,
  isNativeModuleAvailable,
  getDeviceMetricsModule,
  ensureNativeModule,
  getNativeModuleDiagnostics,
  recordNativeRuntimeError,
  recordFallbackReason,
  type NativeModuleDiagnostics,
};
export default DeviceMetricsModule;

