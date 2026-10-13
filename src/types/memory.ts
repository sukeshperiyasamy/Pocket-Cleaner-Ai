import { DataSourceStatus } from './storage';

export type MemoryPressureLevel = 'normal' | 'moderate' | 'critical';

export interface MemorySummary {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  appUsageBytes: number;
  pressureLevel: MemoryPressureLevel;
  pressurePercentage: number;
  thresholdBytes?: number;
  isLowMemory?: boolean;
  isMock: boolean;
  dataSourceStatus: DataSourceStatus;
  dataSourceError?: string | null;
  lastUpdated: string;
}

export interface MemoryRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'educational' | 'practical' | 'warning';
  badge: string;
}
