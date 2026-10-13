import { PermissionsAndroid, Platform } from 'react-native';
import { DeviceMetricsModule, isNativeModuleAvailable } from '../../modules/device-metrics/src';

/**
 * Checks whether the app currently has permission to inspect media on Android.
 */
export async function checkMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  // If native module is available, use its direct check
  const isAvailable = typeof isNativeModuleAvailable === 'function' ? isNativeModuleAvailable() : Boolean(isNativeModuleAvailable);
  if (isAvailable && DeviceMetricsModule) {
    try {
      const res = await DeviceMetricsModule.checkStoragePermissions();
      return res.hasPermission;
    } catch {
      // Fallback to PermissionsAndroid
    }
  }

  const apiLevel = Platform.Version;

  if (typeof apiLevel === 'number' && apiLevel >= 33) {
    const hasImages = await PermissionsAndroid.check(
      'android.permission.READ_MEDIA_IMAGES' as any
    );
    const hasVideos = await PermissionsAndroid.check(
      'android.permission.READ_MEDIA_VIDEO' as any
    );
    const hasAudio = await PermissionsAndroid.check(
      'android.permission.READ_MEDIA_AUDIO' as any
    );
    return hasImages || hasVideos || hasAudio;
  } else {
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
  }
}

/**
 * Requests necessary media permissions on Android.
 * Android 13+ (API 33+): Requests granular READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO.
 * Android 12 and below: Requests READ_EXTERNAL_STORAGE.
 */
export async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Platform.Version;

  try {
    if (typeof apiLevel === 'number' && apiLevel >= 33) {
      const results = await PermissionsAndroid.requestMultiple([
        'android.permission.READ_MEDIA_IMAGES' as any,
        'android.permission.READ_MEDIA_VIDEO' as any,
        'android.permission.READ_MEDIA_AUDIO' as any,
      ]);

      const imagesGranted =
        results['android.permission.READ_MEDIA_IMAGES'] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const videosGranted =
        results['android.permission.READ_MEDIA_VIDEO'] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const audioGranted =
        results['android.permission.READ_MEDIA_AUDIO'] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return imagesGranted || videosGranted || audioGranted;
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Inspection Permission',
          message:
            'Offline AI Phone Assistant needs access to inspect your device storage to discover large media files on-device.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.warn('Error requesting storage permissions:', error);
    return false;
  }
}
