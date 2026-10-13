import {
  PinnedModelArtifact,
  ModelDownloadProgress,
  ModelStorageCheckResult,
  ModelInstallResult,
  ModelDeliveryState,
} from '@/types/modelDelivery';

// Dynamic loader for Expo FileSystem to ensure node:test compatibility
const isNodeEnvironment =
  typeof process !== 'undefined' &&
  (Boolean(process.versions?.node) || (process as any).env?.NODE_ENV === 'test');

let fileSystemModule: typeof import('expo-file-system/legacy') | null = null;
if (!isNodeEnvironment) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fileSystemModule = require('expo-file-system/legacy');
  } catch {
    fileSystemModule = null;
  }
}
const FileSystem = fileSystemModule;

function getSafeDeviceMetrics(): any {
  if (isNodeEnvironment) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dm = require('device-metrics');
    return dm.getDeviceMetricsModule ? dm.getDeviceMetricsModule() : null;
  } catch {
    return null;
  }
}

/**
 * Pinned, cryptographically trusted catalog of supported on-device GGUF models.
 * Checksums are derived from verified upstream model releases and MUST never
 * be accepted dynamically from unauthenticated network responses.
 */
export const PINNED_MODEL_CATALOG: Record<string, PinnedModelArtifact> = {
  'SmolLM2-360M-Instruct-Q4_K_M.gguf': {
    id: 'smollm2-360m-instruct-q4_k_m',
    filename: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
    displayName: 'SmolLM2 360M Instruct (Q4_K_M)',
    expectedSizeBytes: 270590880, // ~258.05 MB
    requiredFreeStorageBytes: 550 * 1024 * 1024, // 550 MB headroom for staging + install
    trustedSha256: '2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2',
    sourceUrl:
      'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q4_k_m.gguf',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
    license: 'Apache-2.0',
    attribution: 'Hugging Face (SmolLM2 Team) — Loubna Ben Allal, Anton Lozhkov, et al.',
    description: 'Default local assistant model. 360M parameters, low RAM footprint, fast token generation.',
    recommendedFor: 'General phone assistant queries, storage and RAM questions on 4 GB–8 GB devices.',
  },
  'SmolLM2-135M-Instruct-Q4_K_M.gguf': {
    id: 'smollm2-135m-instruct-q4_k_m',
    filename: 'SmolLM2-135M-Instruct-Q4_K_M.gguf',
    displayName: 'SmolLM2 135M Instruct (Q4_K_M)',
    expectedSizeBytes: 105454432, // ~100.57 MB
    requiredFreeStorageBytes: 250 * 1024 * 1024, // 250 MB headroom
    trustedSha256: '2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d',
    sourceUrl:
      'https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
    license: 'Apache-2.0',
    attribution: 'Hugging Face (SmolLM2 Team)',
    description: 'Ultra-compact 135M parameter model for minimal RAM and storage footprint.',
    recommendedFor: 'Constrained devices or background operation with minimal memory overhead.',
  },
  'qwen2.5-0.5b-instruct-q4_k_m.gguf': {
    id: 'qwen2.5-0.5b-instruct-q4_k_m',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    displayName: 'Qwen 2.5 0.5B Instruct (Q4_K_M)',
    expectedSizeBytes: 469225472, // ~469 MB
    requiredFreeStorageBytes: 950 * 1024 * 1024, // 950 MB headroom
    trustedSha256: 'e06c10aa27a69622d9cb927bb3fe48227042a9b40bc6a56c4d7ec49df249339e',
    sourceUrl:
      'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
    license: 'Apache-2.0',
    attribution: 'Qwen Team, Alibaba Cloud',
    description: 'High-reasoning 500M parameter model for multi-step reasoning and expanded context.',
    recommendedFor: 'Devices with >= 6 GB RAM seeking higher language nuance.',
  },
};

export const DEFAULT_DELIVERY_MODEL = 'SmolLM2-360M-Instruct-Q4_K_M.gguf';

export class ModelDeliveryService {
  private activeDownload: any = null;
  private activeDownloadingFilename: string | null = null;
  private currentProgress: ModelDownloadProgress | null = null;
  private progressCallback: ((p: ModelDownloadProgress) => void) | null = null;
  private isCancelled = false;

  /**
   * Returns the app-private model directory path.
   */
  getModelDirectory(): string {
    if (!FileSystem?.documentDirectory) {
      return '';
    }
    return `${FileSystem.documentDirectory}models/`;
  }

  /**
   * Returns all pinned artifacts available in the catalog.
   */
  getCatalog(): PinnedModelArtifact[] {
    return Object.values(PINNED_MODEL_CATALOG);
  }

  /**
   * Returns artifact metadata for a specific model filename.
   */
  getArtifact(filename: string): PinnedModelArtifact | null {
    return PINNED_MODEL_CATALOG[filename] || null;
  }

  /**
   * Pre-flight check: verifies available storage against model requirements.
   */
  async checkStorage(filename: string): Promise<ModelStorageCheckResult> {
    const artifact = this.getArtifact(filename);
    const requiredBytes = artifact ? artifact.requiredFreeStorageBytes : 600 * 1024 * 1024;

    let availableBytes = 0;
    try {
      if (FileSystem && typeof FileSystem.getFreeDiskStorageAsync === 'function') {
        availableBytes = await FileSystem.getFreeDiskStorageAsync();
      }
    } catch {
      // Fallback: assume 2 GB free in simulated/test environments if query fails
      availableBytes = 2 * 1024 * 1024 * 1024;
    }

    const hasSufficientSpace = availableBytes >= requiredBytes;
    const shortfallBytes = hasSufficientSpace ? 0 : requiredBytes - availableBytes;

    return {
      hasSufficientSpace,
      availableFreeBytes: availableBytes,
      requiredFreeBytes: requiredBytes,
      shortfallBytes,
    };
  }

  /**
   * Computes streaming SHA-256 checksum of a local file.
   * Uses native Android streaming module when on device; falls back to Node.js crypto in tests.
   */
  async computeFileSha256(filePath: string): Promise<string> {
    // 1. Try Kotlin native module on physical Android device
    try {
      const nativeMod = getSafeDeviceMetrics();
      if (nativeMod && typeof nativeMod.computeFileSha256 === 'function') {
        return await nativeMod.computeFileSha256(filePath);
      }
    } catch {
      // Fall through to Node/environment fallback
    }

    // 2. Node.js environment fallback (unit tests, CI)
    if (typeof process !== 'undefined' && ((process as any).versions?.node || (process as any).env?.NODE_ENV === 'test')) {
      try {
        const cryptoMod = 'node:crypto';
        const fsMod = 'node:fs';
        const crypto: any = await import(cryptoMod);
        const fs: any = await import(fsMod);
        const cleanPath = filePath.startsWith('file://') ? filePath.replace('file://', '') : filePath;

        return await new Promise<string>((resolve, reject) => {
          const hash = crypto.createHash('sha256');
          const stream = fs.createReadStream(cleanPath);
          stream.on('data', (chunk: any) => hash.update(chunk));
          stream.on('end', () => resolve(hash.digest('hex')));
          stream.on('error', (err: any) => reject(err));
        });
      } catch (nodeErr) {
        throw new Error(`Node checksum computation failed: ${nodeErr instanceof Error ? nodeErr.message : String(nodeErr)}`);
      }
    }

    throw new Error('No supported cryptographic hash provider available in this runtime.');
  }

  /**
   * Returns current status of a model (installed, downloading, missing, corrupted).
   */
  async getDeliveryState(filename: string): Promise<ModelDeliveryState> {
    const artifact = this.getArtifact(filename);
    if (!artifact) {
      throw new Error(`Model "${filename}" is not in the trusted model catalog.`);
    }

    if (this.activeDownloadingFilename === filename && this.currentProgress) {
      return {
        status: 'downloading',
        filename,
        artifact,
        downloadProgress: this.currentProgress,
      };
    }

    const dir = this.getModelDirectory();
    if (!dir || !FileSystem) {
      return { status: 'not_installed', filename, artifact };
    }

    const targetPath = `${dir}${filename}`;
    try {
      const info = await FileSystem.getInfoAsync(targetPath);
      if (info.exists && !info.isDirectory) {
        if (info.size === artifact.expectedSizeBytes) {
          return { status: 'installed', filename, artifact };
        } else if ((info.size ?? 0) > 0) {
          return {
            status: 'corrupted',
            filename,
            artifact,
            errorMessage: `File size (${info.size} B) does not match expected size (${artifact.expectedSizeBytes} B).`,
          };
        }
      }
    } catch {
      // Ignore read errors
    }

    return { status: 'not_installed', filename, artifact };
  }

  /**
   * Verifies existing installed model against pinned SHA-256 checksum and size.
   */
  async verifyExistingModel(filename: string): Promise<{ isValid: boolean; error?: string; sha256?: string }> {
    const artifact = this.getArtifact(filename);
    if (!artifact) {
      return { isValid: false, error: `Unknown model: ${filename}` };
    }

    const dir = this.getModelDirectory();
    if (!dir || !FileSystem) {
      return { isValid: false, error: 'FileSystem runtime is unavailable in this environment.' };
    }

    const targetPath = `${dir}${filename}`;
    try {
      const info = await FileSystem.getInfoAsync(targetPath);
      if (!info.exists || info.isDirectory) {
        return { isValid: false, error: 'Model file not found on disk.' };
      }

      if (info.size !== artifact.expectedSizeBytes) {
        return {
          isValid: false,
          error: `Size mismatch: found ${info.size} bytes, expected ${artifact.expectedSizeBytes} bytes.`,
        };
      }

      const computedSha256 = await this.computeFileSha256(targetPath);
      if (computedSha256.toLowerCase() !== artifact.trustedSha256.toLowerCase()) {
        return {
          isValid: false,
          error: `Checksum mismatch: expected ${artifact.trustedSha256}, got ${computedSha256}`,
          sha256: computedSha256,
        };
      }

      return { isValid: true, sha256: computedSha256 };
    } catch (err) {
      return { isValid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Initiates on-demand model download and installation with:
   * - Storage pre-flight check
   * - Isolated staging to .downloading_${filename}
   * - Progress tracking
   * - File size verification
   * - Trusted SHA-256 verification
   * - Atomic swap into place
   */
  async downloadAndInstallModel(
    filename: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<ModelInstallResult> {
    const artifact = this.getArtifact(filename);
    if (!artifact) {
      throw new Error(`Model "${filename}" is not in the trusted model catalog.`);
    }

    if (this.activeDownload || this.activeDownloadingFilename) {
      throw new Error(
        `Another model download (${this.activeDownloadingFilename}) is already in progress. Please wait or cancel it.`
      );
    }

    this.isCancelled = false;
    this.activeDownloadingFilename = filename;
    this.progressCallback = onProgress || null;

    const updateProgress = (p: ModelDownloadProgress) => {
      this.currentProgress = p;
      if (this.progressCallback) {
        this.progressCallback(p);
      }
    };

    // Stage 1: Check storage
    updateProgress({
      stage: 'checking_storage',
      bytesDownloaded: 0,
      totalBytes: artifact.expectedSizeBytes,
      percentage: 0,
      stageText: 'Verifying available storage...',
    });

    const storageCheck = await this.checkStorage(filename);
    if (!storageCheck.hasSufficientSpace) {
      const err = `Insufficient free storage. Available: ${Math.round(
        storageCheck.availableFreeBytes / 1024 / 1024
      )} MB, Required: ${Math.round(storageCheck.requiredFreeBytes / 1024 / 1024)} MB.`;
      updateProgress({
        stage: 'error',
        bytesDownloaded: 0,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 0,
        stageText: 'Download halted: insufficient storage',
        error: err,
      });
      this.activeDownloadingFilename = null;
      throw new Error(err);
    }

    if (!FileSystem) {
      throw new Error('FileSystem module is not available in this environment.');
    }

    const dir = this.getModelDirectory();
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {
      // Directory may already exist
    }

    const stagingPath = `${dir}.downloading_${filename}`;
    const targetPath = `${dir}${filename}`;

    // Clean up any stale partial staging download from prior interrupted attempt
    try {
      const stagingInfo = await FileSystem.getInfoAsync(stagingPath);
      if (stagingInfo.exists) {
        await FileSystem.deleteAsync(stagingPath, { idempotent: true });
      }
    } catch {
      // Ignore cleanup error
    }

    try {
      // Stage 2: Downloading
      updateProgress({
        stage: 'downloading',
        bytesDownloaded: 0,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 0,
        stageText: 'Downloading model weights...',
      });

      this.activeDownload = FileSystem.createDownloadResumable(
        artifact.sourceUrl,
        stagingPath,
        {},
        (downloadProgress) => {
          if (this.isCancelled) return;
          const total = downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesExpectedToWrite
            : artifact.expectedSizeBytes;
          const downloaded = downloadProgress.totalBytesWritten;
          const pct = Math.min(100, Math.max(0, Math.round((downloaded / total) * 100)));

          updateProgress({
            stage: 'downloading',
            bytesDownloaded: downloaded,
            totalBytes: total,
            percentage: pct,
            stageText: `Downloading: ${pct}% (${Math.round(downloaded / 1024 / 1024)} / ${Math.round(
              total / 1024 / 1024
            )} MB)`,
          });
        }
      );

      const downloadResult = await this.activeDownload.downloadAsync();
      this.activeDownload = null;

      if (this.isCancelled) {
        try {
          await FileSystem.deleteAsync(stagingPath, { idempotent: true });
        } catch {
          // ignore
        }
        updateProgress({
          stage: 'cancelled',
          bytesDownloaded: 0,
          totalBytes: artifact.expectedSizeBytes,
          percentage: 0,
          stageText: 'Download cancelled by user.',
        });
        throw new Error('Download was cancelled.');
      }

      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download failed to return a valid local file URI.');
      }

      // Stage 3: Verifying file size
      updateProgress({
        stage: 'verifying_checksum',
        bytesDownloaded: artifact.expectedSizeBytes,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 100,
        stageText: 'Verifying file size and integrity...',
      });

      const fileInfo = await FileSystem.getInfoAsync(stagingPath);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        throw new Error('Downloaded file is missing or inaccessible.');
      }

      if (fileInfo.size !== artifact.expectedSizeBytes) {
        try {
          await FileSystem.deleteAsync(stagingPath, { idempotent: true });
        } catch {
          // ignore
        }
        throw new Error(
          `Integrity error: Downloaded size (${fileInfo.size} B) does not match expected size (${artifact.expectedSizeBytes} B). Staging file deleted.`
        );
      }

      // Stage 4: Verifying trusted SHA-256
      updateProgress({
        stage: 'verifying_checksum',
        bytesDownloaded: artifact.expectedSizeBytes,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 100,
        stageText: 'Computing and verifying SHA-256 checksum...',
      });

      const computedSha256 = await this.computeFileSha256(stagingPath);
      if (computedSha256.toLowerCase() !== artifact.trustedSha256.toLowerCase()) {
        try {
          await FileSystem.deleteAsync(stagingPath, { idempotent: true });
        } catch {
          // ignore
        }
        throw new Error(
          `Cryptographic verification failed! Pinned SHA-256: ${artifact.trustedSha256}, Downloaded SHA-256: ${computedSha256}. Untrusted file deleted.`
        );
      }

      // Stage 5: Atomic Install
      updateProgress({
        stage: 'installing',
        bytesDownloaded: artifact.expectedSizeBytes,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 100,
        stageText: 'Installing model into application storage...',
      });

      // Move staging file to final destination (atomic replace)
      await FileSystem.moveAsync({
        from: stagingPath,
        to: targetPath,
      });

      updateProgress({
        stage: 'ready',
        bytesDownloaded: artifact.expectedSizeBytes,
        totalBytes: artifact.expectedSizeBytes,
        percentage: 100,
        stageText: 'Model verified and ready for local inference.',
      });

      this.activeDownloadingFilename = null;
      this.currentProgress = null;

      return {
        success: true,
        filename,
        path: targetPath,
        verifiedSha256: computedSha256,
        sizeBytes: fileInfo.size,
      };
    } catch (err) {
      this.activeDownload = null;
      this.activeDownloadingFilename = null;

      // Ensure partial staging file is removed
      try {
        const checkStaging = await FileSystem.getInfoAsync(stagingPath);
        if (checkStaging.exists) {
          await FileSystem.deleteAsync(stagingPath, { idempotent: true });
        }
      } catch {
        // ignore
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!this.isCancelled) {
        updateProgress({
          stage: 'error',
          bytesDownloaded: 0,
          totalBytes: artifact.expectedSizeBytes,
          percentage: 0,
          stageText: 'Model installation failed',
          error: errorMessage,
        });
      }

      throw err;
    }
  }

  /**
   * Cancels active download and cleans up temporary staging artifacts.
   */
  async cancelDownload(): Promise<void> {
    this.isCancelled = true;
    if (this.activeDownload) {
      try {
        await this.activeDownload.cancelAsync();
      } catch {
        // Ignore cancellation error
      }
      this.activeDownload = null;
    }

    if (this.activeDownloadingFilename && FileSystem) {
      const stagingPath = `${this.getModelDirectory()}.downloading_${this.activeDownloadingFilename}`;
      try {
        await FileSystem.deleteAsync(stagingPath, { idempotent: true });
      } catch {
        // Ignore deletion error
      }
      this.activeDownloadingFilename = null;
    }

    if (this.currentProgress) {
      this.currentProgress = {
        stage: 'cancelled',
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 0,
        stageText: 'Download cancelled.',
      };
      if (this.progressCallback) {
        this.progressCallback(this.currentProgress);
      }
    }
  }

  /**
   * Deletes an installed model from application storage if requested by the user.
   */
  async deleteModel(filename: string): Promise<boolean> {
    const dir = this.getModelDirectory();
    if (!dir || !FileSystem) {
      return false;
    }
    const targetPath = `${dir}${filename}`;
    try {
      const info = await FileSystem.getInfoAsync(targetPath);
      if (info.exists) {
        await FileSystem.deleteAsync(targetPath, { idempotent: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const modelDeliveryService = new ModelDeliveryService();
