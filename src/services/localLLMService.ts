import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ModelStatus,
  ModelInfo,
  ModelStatusResult,
  InferenceOptions,
  InferenceResult,
  ModelLoadOptions,
} from '@/types';

// Dynamic import holder for llama.rn to avoid hard crashes in non-native / test environments
let llamaModule: typeof import('llama.rn') | null = null;
try {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    llamaModule = require('llama.rn');
  }
} catch {
  llamaModule = null;
}

const DEFAULT_MODELS: Record<string, { name: string; contextWindow: number; quantization: string }> = {
  'SmolLM2-360M-Instruct-Q4_K_M.gguf': {
    name: 'SmolLM2 360M Instruct',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
  },
  'SmolLM2-135M-Instruct-Q4_K_M.gguf': {
    name: 'SmolLM2 135M Instruct',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
  },
  'qwen2.5-0.5b-instruct-q4_k_m.gguf': {
    name: 'Qwen 2.5 0.5B Instruct',
    contextWindow: 2048,
    quantization: 'Q4_K_M',
  },
};

const DEFAULT_PRIMARY_MODEL = 'SmolLM2-360M-Instruct-Q4_K_M.gguf';

export class LocalLLMService {
  private status: ModelStatus = 'unavailable';
  private activeModelInfo: ModelInfo | null = null;
  private activeContext: any = null; // LlamaContext
  private isModelLoading = false;
  private isGenerating = false;
  private isCancelled = false;
  private currentLoadPromise: Promise<ModelStatusResult> | null = null;
  private lastError: string | null = null;

  /**
   * Returns the app-private model directory path.
   */
  getAppModelDirectory(): string {
    if (!FileSystem.documentDirectory) {
      return '';
    }
    return `${FileSystem.documentDirectory}models/`;
  }

  /**
   * Sanitizes internal filesystem paths and raw exceptions from user-facing error messages.
   */
  private sanitizeError(err: unknown): string {
    if (!err) return 'An unknown error occurred during local inference.';
    let message = err instanceof Error ? err.message : String(err);
    // Mask absolute device paths
    message = message.replace(/\/data\/user\/\d+\/[^/\s]+/g, '[app_storage]');
    message = message.replace(/\/data\/local\/tmp\/[^\s]+/g, '[temp_storage]');
    message = message.replace(/[A-Z]:\\[^\s]+/g, '[local_path]');
    return message;
  }

  /**
   * Checks whether the native llama.rn library is supported and available in the current runtime.
   */
  isNativeAvailable(): boolean {
    return llamaModule !== null && (Platform.OS === 'android' || Platform.OS === 'ios');
  }

  /**
   * Returns metadata for all discovered GGUF models in the app-private directory.
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    const modelsDir = this.getAppModelDirectory();
    if (!modelsDir) return [];

    try {
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(modelsDir);
      const modelInfos: ModelInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.gguf')) continue;

        const filePath = `${modelsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && !fileInfo.isDirectory && (fileInfo.size ?? 0) > 0) {
          const defaults = DEFAULT_MODELS[file] || {
            name: file.replace('.gguf', ''),
            contextWindow: 2048,
            quantization: 'GGUF',
          };

          modelInfos.push({
            filename: file,
            modelName: defaults.name,
            path: filePath,
            sizeBytes: fileInfo.size ?? 0,
            contextWindow: defaults.contextWindow,
            quantization: defaults.quantization,
            isAvailable: true,
          });
        }
      }

      return modelInfos;
    } catch {
      return [];
    }
  }

  /**
   * Returns the current model availability and loading state.
   */
  async getModelStatus(): Promise<ModelStatusResult> {
    if (!this.isNativeAvailable()) {
      return {
        status: 'unavailable',
        error: 'Native on-device LLM runtime is not supported in this environment.',
        isNativeAvailable: false,
      };
    }

    if (this.status === 'loaded' && this.activeContext && this.activeModelInfo) {
      return {
        status: 'loaded',
        modelInfo: this.activeModelInfo,
        isNativeAvailable: true,
      };
    }

    if (this.status === 'loading') {
      return {
        status: 'loading',
        modelInfo: this.activeModelInfo || undefined,
        isNativeAvailable: true,
      };
    }

    // Check for available models in app-private storage
    const models = await this.getAvailableModels();
    if (models.length > 0) {
      const preferred = models.find((m) => m.filename === DEFAULT_PRIMARY_MODEL) || models[0];
      this.status = 'available';
      this.activeModelInfo = preferred;
      return {
        status: 'available',
        modelInfo: preferred,
        isNativeAvailable: true,
      };
    }

    this.status = 'unavailable';
    this.activeModelInfo = null;
    return {
      status: 'unavailable',
      error: this.lastError || 'No GGUF model found in app private storage.',
      isNativeAvailable: true,
    };
  }

  /**
   * Loads a GGUF model into memory using native llama.cpp bindings.
   * Safeguards against duplicate / concurrent loads.
   */
  async loadModel(options?: ModelLoadOptions): Promise<ModelStatusResult> {
    if (!this.isNativeAvailable()) {
      this.status = 'error';
      return {
        status: 'error',
        error: 'Native LLM runtime is unavailable in this environment.',
        isNativeAvailable: false,
      };
    }

    // Prevent duplicate concurrent load operations
    if (this.isModelLoading && this.currentLoadPromise) {
      return this.currentLoadPromise;
    }

    // If already loaded with the same model, return immediately
    const targetFilename = options?.modelFilename || this.activeModelInfo?.filename || DEFAULT_PRIMARY_MODEL;
    if (this.status === 'loaded' && this.activeContext && this.activeModelInfo?.filename === targetFilename) {
      return {
        status: 'loaded',
        modelInfo: this.activeModelInfo,
        isNativeAvailable: true,
      };
    }

    this.isModelLoading = true;
    this.status = 'loading';
    this.lastError = null;

    this.currentLoadPromise = (async () => {
      try {
        // If an existing model was loaded, release it first
        if (this.activeContext) {
          try {
            await this.activeContext.release();
          } catch {
            // Ignore cleanup failure of previous context
          }
          this.activeContext = null;
        }

        const models = await this.getAvailableModels();
        const targetModel = models.find((m) => m.filename === targetFilename);

        if (!targetModel) {
          this.status = 'unavailable';
          this.isModelLoading = false;
          this.lastError = `Model file "${targetFilename}" not found in app storage.`;
          return {
            status: 'unavailable',
            error: this.lastError,
            isNativeAvailable: true,
          };
        }

        if (targetModel.sizeBytes === 0) {
          this.status = 'error';
          this.isModelLoading = false;
          this.lastError = 'Model file is empty or corrupted.';
          return {
            status: 'error',
            error: this.lastError,
            isNativeAvailable: true,
          };
        }

        // Initialize Llama native context
        const nCtx = options?.nCtx ?? 1024;
        const nThreads = options?.nThreads ?? 4;

        let cleanPath = targetModel.path;
        if (cleanPath.startsWith('file://')) {
          cleanPath = cleanPath.slice(7);
        }

        const context = await llamaModule!.initLlama(
          {
            model: cleanPath,
            n_ctx: nCtx,
            n_threads: nThreads,
            n_gpu_layers: 0, // Pure CPU NEON/dotprod for maximum stability on 4 GB RAM
            use_mlock: false,
            use_mmap: true,   // Demand-paging weights minimizes resident memory footprint
          },
          options?.onProgress
        );

        this.activeContext = context;
        this.activeModelInfo = targetModel;
        this.status = 'loaded';
        this.isModelLoading = false;

        return {
          status: 'loaded',
          modelInfo: targetModel,
          isNativeAvailable: true,
        };
      } catch (err) {
        this.status = 'error';
        this.activeContext = null;
        this.isModelLoading = false;
        this.lastError = this.sanitizeError(err);
        return {
          status: 'error',
          error: this.lastError,
          isNativeAvailable: true,
        };
      } finally {
        this.isModelLoading = false;
        this.currentLoadPromise = null;
      }
    })();

    return this.currentLoadPromise;
  }

  /**
   * Generates a completion from prompt text.
   * Runs on a background native thread; prevents concurrent requests.
   */
  async generateResponse(
    prompt: string,
    options?: InferenceOptions
  ): Promise<InferenceResult> {
    if (this.status !== 'loaded' || !this.activeContext) {
      throw new Error('Local model is not loaded. Please load the model before generating.');
    }

    if (this.isGenerating) {
      throw new Error('Inference is already in progress. Please wait for completion or cancel.');
    }

    this.isGenerating = true;
    this.isCancelled = false;
    const startTime = Date.now();
    let tokensGenerated = 0;

    try {
      const maxTokens = Math.min(Math.max(options?.maxTokens ?? 128, 1), 512);
      const temperature = options?.temperature ?? 0.3;
      const topP = options?.topP ?? 0.9;
      const stop = options?.stopSequences ?? ['<|im_end|>', '<|endoftext|>', '\nUser:'];

      const result = await this.activeContext.completion(
        {
          prompt,
          n_predict: maxTokens,
          temperature,
          top_p: topP,
          stop,
        },
        (tokenData: { token: string }) => {
          tokensGenerated++;
          if (options?.onToken && !this.isCancelled) {
            options.onToken(tokenData.token);
          }
        }
      );

      const durationMs = Math.max(Date.now() - startTime, 1);
      const totalTokens = result.timings?.predicted_n ?? tokensGenerated;
      const tps = totalTokens > 0 ? (totalTokens / (durationMs / 1000)) : 0;

      return {
        text: result.text.trim(),
        tokensGenerated: totalTokens,
        durationMs,
        tokensPerSecond: Math.round(tps * 10) / 10,
        isCancelled: this.isCancelled,
        modelName: this.activeModelInfo?.modelName || 'Local Model',
      };
    } catch (err) {
      if (this.isCancelled) {
        const durationMs = Date.now() - startTime;
        return {
          text: '',
          tokensGenerated,
          durationMs,
          tokensPerSecond: 0,
          isCancelled: true,
          modelName: this.activeModelInfo?.modelName || 'Local Model',
        };
      }
      throw new Error(this.sanitizeError(err));
    } finally {
      this.isGenerating = false;
      this.isCancelled = false;
    }
  }

  /**
   * Cancels any active generation without unloading the model.
   */
  async cancelInference(): Promise<boolean> {
    if (!this.isGenerating || !this.activeContext) {
      return false;
    }

    this.isCancelled = true;
    try {
      await this.activeContext.stopCompletion();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Unloads the active model and releases native resources deterministically.
   */
  async unloadModel(): Promise<boolean> {
    if (this.isGenerating) {
      await this.cancelInference();
    }

    if (this.activeContext) {
      try {
        await this.activeContext.release();
      } catch {
        // Ignored
      }
      this.activeContext = null;
    }

    this.status = 'available';
    this.isGenerating = false;
    this.isModelLoading = false;
    this.lastError = null;

    // Refresh status to verify if model remains available on disk
    await this.getModelStatus();
    return true;
  }
}

export const localLLMService = new LocalLLMService();
