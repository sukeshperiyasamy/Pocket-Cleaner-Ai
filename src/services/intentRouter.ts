import {
  AssistantToolName,
  ToolExecutionRequest,
  IntentResolution,
} from '@/types';
import { APPROVED_TOOL_NAMES, validateToolRequest } from './toolRegistry';
import { UNSUPPORTED_CAPABILITIES } from './capabilityRegistry';

/**
 * Word to number mapping for natural language limits (e.g. "ten biggest files")
 */
const WORD_NUMBER_MAP: Record<string, number> = {
  single: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  'twenty-five': 25,
};

/**
 * Extracts numeric limit from user query, supporting both digit strings ("5", "10")
 * and English word numbers ("ten", "five"), clamped between 1 and maxLimit.
 */
export function extractLimit(query: string, defaultLimit = 10, maxLimit = 25): number {
  if (!query) return defaultLimit;
  const q = query.toLowerCase();

  // 1. Spelled-out words
  for (const [word, num] of Object.entries(WORD_NUMBER_MAP)) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    if (wordRegex.test(q)) {
      return Math.min(Math.max(num, 1), maxLimit);
    }
  }

  // 2. Digits: e.g. "top 10", "5 largest", "limit 20", "limit -5", "limit 5000"
  const digitMatch = q.match(/(?:top|first|limit|show|find|me)?\s*(-?\d+)\b/);
  if (digitMatch) {
    const parsed = parseInt(digitMatch[1], 10);
    if (!isNaN(parsed)) {
      return Math.min(Math.max(parsed, 1), maxLimit);
    }
  }

  return defaultLimit;
}

/**
 * Extracts byte value from human query string (e.g. "500 MB", "1.5 GB", "200 megabytes")
 */
export function extractMinSizeBytes(query: string): number {
  if (!query) return 0;
  const match = query.match(
    /(\d+(?:\.\d+)?)\s*(gb|gigabytes?|mb|megabytes?|kb|kilobytes?|bytes?|b)\b/i
  );
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const rawUnit = match[2].toLowerCase();

  if (isNaN(value) || value <= 0) return 0;

  if (rawUnit.startsWith('g')) {
    return Math.round(value * 1024 * 1024 * 1024);
  }
  if (rawUnit.startsWith('m')) {
    return Math.round(value * 1024 * 1024);
  }
  if (rawUnit.startsWith('k')) {
    return Math.round(value * 1024);
  }
  return Math.round(value);
}

/**
 * Extracts media category if mentioned in query, handling synonyms, singular, and plural.
 */
export function extractCategory(
  query: string
): 'all' | 'videos' | 'images' | 'audio' | 'downloads' {
  if (!query) return 'all';
  const q = query.toLowerCase();

  if (/\b(videos?|movies?|clips?|mp4)\b/i.test(q)) return 'videos';
  if (/\b(photos?|images?|pictures?|pics?|jpe?g|png)\b/i.test(q)) return 'images';
  if (/\b(audios?|musics?|songs?|sounds?|mp3|tracks?)\b/i.test(q)) return 'audio';
  if (/\b(downloads?|documents?|docs?|pdfs?)\b/i.test(q)) return 'downloads';

  return 'all';
}

/**
 * Detects if the user query contains a request to delete, erase, or wipe files.
 * Returns true if a destructive action is requested.
 */
export function isDestructiveRequest(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();

  // Explicit search query check: searching for a file even if its name contains words like 'delete'
  if (
    /^(?:please\s+)?(?:search for|find files? named?|find all(?: downloaded)?|look for|find file with(?:\s+emoji filename)?)\s+/i.test(q)
  ) {
    if (!/\b(?:and|then)\s+(?:delete|remove|erase|wipe)\b/i.test(q)) {
      return false;
    }
  }

  if (
    q.includes('delete_everything') ||
    q.includes('delete everything') ||
    q.includes('rm -rf') ||
    q.includes('wipe all') ||
    q.includes('erase everything') ||
    q.includes('format my external sd card') ||
    q.includes('format sd card') ||
    q.includes('remove /system') ||
    q.includes('delete the operating system')
  ) {
    return true;
  }

  const destructiveVerbs = /\b(delete|deleting|remove|removing|erase|erasing|wipe|wiping|purge|purging|trash|destroy|destroying|clear|clearing|format|formatting|clean\s*up\s*all)\b/i;
  const fileNouns = /\b(screenshots?|videos?|photos?|images?|files?|audios?|recordings?|all|everything|downloads?|sd\s*card|apks?|operating\s*system|storage|\/system|\/sdcard|duplicates?)\b/i;

  return destructiveVerbs.test(q) && fileNouns.test(q);
}

/**
 * Parses JSON tool call produced by a language model.
 * Gracefully returns null if model output is not valid JSON or specifies an unapproved tool.
 */
export function parseModelToolCall(modelOutput: string): ToolExecutionRequest | null {
  if (!modelOutput || typeof modelOutput !== 'string') return null;

  try {
    let jsonStr = modelOutput.trim();

    // Strip markdown code fences if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr);

    const toolName = parsed.tool || parsed.toolName || parsed.name;
    const parameters = parsed.parameters || parsed.args || parsed.arguments || {};

    if (!toolName || typeof toolName !== 'string') return null;

    if (!APPROVED_TOOL_NAMES.includes(toolName as AssistantToolName)) {
      return null;
    }

    return validateToolRequest({
      toolName: toolName as AssistantToolName,
      parameters,
    });
  } catch {
    return null;
  }
}

/**
 * Comprehensive intent resolution engine.
 * Classifies input into:
 * - tool_execution: approved read-only tools
 * - destructive_rejected: attempts to perform file deletion
 * - unsupported_capability: out-of-scope actions (app uninstall, ad blocking)
 * - system_navigation: system settings direction
 * - conversational: open-ended assistance
 */
export function resolveIntent(
  userMessage: string,
  modelToolCallText?: string
): IntentResolution {
  if (!userMessage || typeof userMessage !== 'string') {
    return { type: 'conversational' };
  }

  // 1. If model produced a valid approved tool call, prioritize it
  if (modelToolCallText) {
    const fromModel = parseModelToolCall(modelToolCallText);
    if (fromModel) {
      return {
        type: 'tool_execution',
        toolName: fromModel.toolName,
        parameters: fromModel.parameters,
        confidence: 0.95,
      };
    }
  }

  const normalized = userMessage.toLowerCase().trim();

  // 2. Safety Gate: Reject direct deletion requests
  if (isDestructiveRequest(normalized)) {
    const desc = UNSUPPORTED_CAPABILITIES.direct_file_deletion;
    return {
      type: 'destructive_rejected',
      action: 'delete_files',
      reason: desc.reason,
      suggestedAction: {
        label: 'Review in Deep Cleanup',
        route: '/deep-cleanup',
      },
    };
  }

  // 3. Unsupported Capabilities: App uninstallation/installation/management
  if (
    /\b(remove|uninstall|delete|clean|close|kill|install|force\s*stop)\s+(?:unnecessary\s+|background\s+)?(?:apps?|whatsapp|instagram|fortnite|chrome|apk)\b/i.test(normalized) ||
    /\b(uninstall|force\s*stop)\b/i.test(normalized) ||
    /\binstall\s+[a-z0-9_.-]+\s+apk\b/i.test(normalized) ||
    /\buninstall\s+apps?\b/i.test(normalized)
  ) {
    const cap = UNSUPPORTED_CAPABILITIES.manage_apps;
    return {
      type: 'unsupported_capability',
      capability: 'manage_apps',
      reason: cap.reason,
      recommendedAlternative: cap.alternativeGuidance,
    };
  }

  // 4. Unsupported Capabilities: System-wide ad blocking
  if (
    /\b(disable|block|turn off|remove|stop)\s+(?:all\s+)?(?:youtube\s+)?(?:ads|advertisements?)\b/i.test(normalized) ||
    /\bad\s*blocker?\b/i.test(normalized)
  ) {
    const cap = UNSUPPORTED_CAPABILITIES.block_ads;
    return {
      type: 'unsupported_capability',
      capability: 'block_ads',
      reason: cap.reason,
      recommendedAlternative: cap.alternativeGuidance,
    };
  }

  // 4b. Unsupported Capabilities: Hardware / telephony / security / browser data
  if (
    /\b(flashlight|torch|overclock|hack\s*wi-?fi|spam\s*calls|ringtone|browsing\s*history|cookies)\b/i.test(normalized)
  ) {
    return {
      type: 'unsupported_capability',
      capability: 'unsupported_other',
      reason: 'This action exceeds application sandboxing and permission boundaries on Android.',
      recommendedAlternative: 'Please perform this action directly in your Android System Settings.',
    };
  }

  // 5. System Navigation
  if (
    /\b(open|show|access|where\s+can\s+i|how\s+do\s+i\s+(?:open|access|find|manage)|where\s+do\s+i\s+find|where\s+is)\s+(?:phone\s+|device\s+|system\s+|android\s+|the\s+)?(?:storage\s+settings|settings|developer\s+options|app\s+permissions|permissions|battery|clear\s+cache|security\s+cleaner|running\s+services|cleaner\s+app)\b/i.test(normalized) ||
    /\b(storage\s+settings|developer\s+options|running\s+services|how\s+to\s+check\s+ram\s+in\s+android|clear\s+cache.*in\s+settings|xiaomi\s+security|security\s+cleaner)\b/i.test(normalized) ||
    normalized.includes('open storage settings') ||
    normalized.includes('manage app permissions') ||
    normalized.includes('developer options') ||
    normalized.includes('grant media storage permission') ||
    normalized.includes('battery and performance')
  ) {
    const isAppNav = normalized.includes('permission') || normalized.includes('app') || normalized.includes('clear cache');
    return {
      type: 'system_navigation',
      destination: isAppNav ? 'app_settings' : 'storage_settings',
      guidance:
        'To navigate system settings on Android, go to Android Settings on your device. ' +
        'Within Pocket Cleaner, you can explore partitioned files in the Storage Explorer tab.',
    };
  }

  // 5b. Ambiguous / Vague queries requiring clarification
  const ambiguousPhrases = [
    'help',
    'clean',
    'make it faster',
    'fix my phone',
    'what can you do',
    'what can you do?',
    'check',
    'hello assistant',
    'do something',
  ];
  if (ambiguousPhrases.includes(normalized)) {
    return {
      type: 'clarification_needed',
      promptSuggestions: [
        'How much storage is left on my phone?',
        'What are the 5 largest files on my device?',
        'How much RAM does this phone have and how much is free?',
      ],
      clarificationMessage:
        'I am your offline device assistant. I can inspect storage categories, find large files and screenshots, or report real-time RAM telemetry. What would you like to check?',
    };
  }

  // 6. Screen recording queries (e.g. "screen recordings taking space", "find screen recordings", "screen capture video files")
  if (
    /\bscreen\s*(?:record(?:ing|er)s?|videos?|capture\s*videos?)\b/i.test(normalized)
  ) {
    const limit = extractLimit(normalized, 10);
    return {
      type: 'tool_execution',
      toolName: 'find_screen_recordings',
      parameters: { limit },
      confidence: 0.95,
    };
  }

  // 7. Screenshot queries (e.g. "find my screenshots", "show screenshots", "screen caps", "screnshots")
  if (
    /\bscreen\s*(?:shots?|captures?|caps?)\b/i.test(normalized) ||
    /\bscrenshots?\b/i.test(normalized)
  ) {
    const limit = extractLimit(normalized, 10);
    return {
      type: 'tool_execution',
      toolName: 'find_screenshots',
      parameters: { limit },
      confidence: 0.95,
    };
  }

  // 8. Storage Breakdown / Categories (e.g. "What is using the most storage?", "Categorize memory usage by file type", "what files r occupying memory?")
  // Placed before general RAM check so file-type / storage category queries that mention "memory" route to categories
  if (
    normalized.includes('what is using the most storage') ||
    normalized.includes('using the most storage') ||
    normalized.includes('eating up') ||
    normalized.includes('taking up space') ||
    normalized.includes('taking up my storage') ||
    normalized.includes('taking the most space') ||
    normalized.includes('hogging') ||
    normalized.includes('breakdown') ||
    normalized.includes('categories') ||
    normalized.includes('category') ||
    normalized.includes('types of files') ||
    normalized.includes('file type') ||
    normalized.includes('categorize') ||
    normalized.includes('storage usage for') ||
    normalized.includes('space are my videos taking up') ||
    normalized.includes('occupying memory') ||
    normalized.includes('taking up storgae')
  ) {
    return {
      type: 'tool_execution',
      toolName: 'get_storage_categories',
      parameters: {},
      confidence: 0.92,
    };
  }

  // 9. RAM / Memory / Performance queries
  if (
    /\b(ram|memory|performance)\b/i.test(normalized)
  ) {
    const isAppSpecific =
      normalized.includes('app') ||
      normalized.includes('pocket cleaner') ||
      normalized.includes('process');

    return {
      type: 'tool_execution',
      toolName: 'get_memory_summary',
      parameters: {
        highlightAppUsage: isAppSpecific,
      },
      confidence: 0.9,
    };
  }

  // 10. Junk Files / Safe Cleanup Review queries (e.g. "Clean junk files", "Find files I can safely review for cleanup")
  if (
    normalized.includes('clean junk') ||
    normalized.includes('junk files') ||
    normalized.includes('review for cleanup') ||
    normalized.includes('safely review') ||
    normalized.includes('files to clean') ||
    normalized.includes('how much storage can i free') ||
    normalized.includes('how much space can i free') ||
    normalized.includes('free up')
  ) {
    return {
      type: 'tool_execution',
      toolName: 'find_large_files',
      parameters: {
        minSizeBytes: 25 * 1024 * 1024, // 25 MB candidates for cleanup review
        category: 'all',
        limit: 10,
      },
      confidence: 0.88,
    };
  }

  // 11. Large Files / Large Videos / Specific size thresholds
  // e.g. "Find videos larger than 500 MB", "Show me my ten biggest files", "Show my largest photos", "find huge files"
  if (
    normalized.includes('largest') ||
    normalized.includes('biggest') ||
    normalized.includes('heavy') ||
    normalized.includes('huge') ||
    normalized.includes('larger than') ||
    normalized.includes('bigger than') ||
    normalized.includes('greater than') ||
    normalized.includes('more than') ||
    normalized.includes('over ') ||
    normalized.includes('large file') ||
    normalized.includes('large video') ||
    normalized.includes('large photo')
  ) {
    const minBytes = extractMinSizeBytes(normalized);
    const category = extractCategory(normalized);
    const limit = extractLimit(normalized, 10);

    return {
      type: 'tool_execution',
      toolName: 'find_large_files',
      parameters: {
        minSizeBytes: minBytes > 0 ? minBytes : 10 * 1024 * 1024, // Default 10 MB if unspecified
        category,
        limit,
      },
      confidence: 0.9,
    };
  }

  // 12. Explicit file search (e.g. 'search for "report"', 'find file test.pdf', 'find files named invoice in downloads', 'search for pdf files in my downloads', 'find files with name <script>')
  const searchPrefixMatch = normalized.match(
    /(?:search for|find files? named?|find files? with name|find all(?: downloaded)?|look for|find file with(?:\s+emoji filename)?)\s+/i
  );

  if (searchPrefixMatch && searchPrefixMatch.index !== undefined) {
    let cleanQuery = normalized.substring(searchPrefixMatch.index + searchPrefixMatch[0].length).trim();

    // Strip trailing punctuation first
    cleanQuery = cleanQuery.replace(/[.,;!?]+$/, '').trim();

    // Check if query specifies 'with <name> in the name'
    const withName = cleanQuery.match(/(?:files?\s+)?with\s+["']?([^"'\n\r]+?)["']?\s+in\s+the\s+name/i);
    if (withName) {
      cleanQuery = withName[1].trim();
    } else {
      // Clean query by removing trailing phrases like 'in my downloads', 'in storage', 'files'
      cleanQuery = cleanQuery.replace(/\s+(?:in|on)\s+(?:(?:my\s+)?downloads?|storage|phone|my device)$/i, '').trim();
      cleanQuery = cleanQuery.replace(/\s+files?$/i, '').trim();
    }

    cleanQuery = cleanQuery.replace(/^["']|["']$/g, '').trim();
    cleanQuery = cleanQuery.replace(/[.,;!?]+$/, '').trim();

    if (cleanQuery) {
      const limit = extractLimit(normalized, 10);
      return {
        type: 'tool_execution',
        toolName: 'search_accessible_files',
        parameters: {
          query: cleanQuery,
          limit,
        },
        confidence: 0.95,
      };
    }
  }

  // 13. General storage summary queries (e.g. "how much storage", "free storage", "total storage", "how full is my phone")
  if (
    normalized.includes('storage summary') ||
    normalized.includes('how much storage') ||
    normalized.includes('total storage') ||
    normalized.includes('free storage') ||
    normalized.includes('disk space') ||
    normalized.includes('storage space') ||
    normalized.includes('how much space') ||
    normalized.includes('storage') ||
    normalized.includes('how full') ||
    normalized.includes('disk status') ||
    normalized.includes('internal disk') ||
    normalized.includes('room is left') ||
    normalized.includes('phone capacity') ||
    normalized.includes('remaining gigs') ||
    normalized.includes('available gigabytes') ||
    normalized.includes('hdd') ||
    normalized.includes('occupied on')
  ) {
    return {
      type: 'tool_execution',
      toolName: 'get_storage_summary',
      parameters: {},
      confidence: 0.85,
    };
  }

  return { type: 'conversational' };
}

/**
 * Deterministic intent router that returns a ToolExecutionRequest if and only if
 * the intent is resolved to an approved read-only tool.
 * Returns null for unsupported operations, safety rejections, or conversational input.
 */
export function routeIntentDeterministically(userMessage: string): ToolExecutionRequest | null {
  const resolution = resolveIntent(userMessage);
  if (resolution.type === 'tool_execution') {
    return {
      toolName: resolution.toolName,
      parameters: resolution.parameters,
    };
  }
  return null;
}

/**
 * Resolves tool request with model-first or deterministic fallback.
 */
export function resolveToolRequest(
  userMessage: string,
  modelToolCallText?: string
): ToolExecutionRequest | null {
  if (modelToolCallText) {
    const fromModel = parseModelToolCall(modelToolCallText);
    if (fromModel) {
      return fromModel;
    }
  }

  return routeIntentDeterministically(userMessage);
}
