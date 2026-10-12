import { registerWebModule, NativeModule } from 'expo';

// DeviceMetricsModule is not available on the web platform.
class DeviceMetricsModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(DeviceMetricsModule, 'DeviceMetricsModule');
