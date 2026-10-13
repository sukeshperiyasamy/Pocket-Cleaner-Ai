import { StorageItem, FileSortOption } from '@/types';

/**
 * Deterministic multi-criteria sorting for storage items
 * - Size: Largest first (numeric byte value descending)
 * - Size: Smallest first (numeric byte value ascending)
 * - Date: Newest / Oldest
 * - Name: Alphabetical
 * - Deterministic tie-breaker: Unique ID comparison guarantees identical ordering
 */
export function sortStorageItems(
  items: StorageItem[],
  sortOption: FileSortOption = 'size_desc'
): StorageItem[] {
  return [...items].sort((a, b) => {
    switch (sortOption) {
      case 'size_desc': {
        const diff = b.sizeBytes - a.sizeBytes;
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      }
      case 'size_asc': {
        const diff = a.sizeBytes - b.sizeBytes;
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'date_desc': {
        const dateA = a.dateModifiedTimestamp || 0;
        const dateB = b.dateModifiedTimestamp || 0;
        const diff = dateB - dateA;
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      }
      case 'date_asc': {
        const dateA = a.dateModifiedTimestamp || 0;
        const dateB = b.dateModifiedTimestamp || 0;
        const diff = dateA - dateB;
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'name_asc': {
        const diff = a.name.localeCompare(b.name);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      case 'name_desc': {
        const diff = b.name.localeCompare(a.name);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }
      default:
        return 0;
    }
  });
}
