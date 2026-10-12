import { MemorySummary, MemoryRecommendation } from '@/types';
import {
  MOCK_MEMORY_SUMMARY,
  MOCK_MEMORY_RECOMMENDATIONS,
} from '@/constants/mockData';

export interface IMemoryService {
  getMemorySummary(): Promise<MemorySummary>;
  getMemoryRecommendations(): Promise<MemoryRecommendation[]>;
}

/**
 * MockMemoryService
 * Implementation of IMemoryService using mock fixtures.
 * In Phase 2, this will interface with Android's ActivityManager.MemoryInfo
 * and android.os.Debug APIs via Kotlin native modules.
 */
export class MockMemoryService implements IMemoryService {
  async getMemorySummary(): Promise<MemorySummary> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      ...MOCK_MEMORY_SUMMARY,
      isMock: true,
      lastUpdated: 'Just now (Simulated)',
    };
  }

  async getMemoryRecommendations(): Promise<MemoryRecommendation[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_MEMORY_RECOMMENDATIONS;
  }
}

export const memoryService: IMemoryService = new MockMemoryService();

// Standalone interface-matching function export as specified in requirements
export const getMemorySummary = (): Promise<MemorySummary> =>
  memoryService.getMemorySummary();
