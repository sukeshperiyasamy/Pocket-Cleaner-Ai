import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Formatters under test
import { formatBytes, formatPercentage } from '../src/utils/formatters';

// Memory pressure logic
function calculateMemoryPressure(
  usedBytes: number,
  totalBytes: number,
  isLowMemory: boolean = false
): { pressurePercentage: number; pressureLevel: 'normal' | 'moderate' | 'critical' } {
  const pressurePercentage = totalBytes > 0
    ? Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)))
    : 0;

  const pressureLevel = isLowMemory || pressurePercentage >= 85
    ? 'critical'
    : pressurePercentage >= 70
    ? 'moderate'
    : 'normal';

  return { pressurePercentage, pressureLevel };
}

// Storage calculation logic
function calculateStorageMetrics(totalBytes: number, availableBytes: number) {
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const percentage = formatPercentage(usedBytes, totalBytes);
  return { usedBytes, percentage };
}

// Media sorting & filtering logic
interface TestFile {
  id: string;
  name: string;
  sizeBytes: number;
  category: string;
}

function filterAndSortFiles(
  files: TestFile[],
  categoryFilter: string,
  sortOrder: 'size_desc' | 'size_asc' | 'name_asc'
): TestFile[] {
  let filtered = [...files];
  if (categoryFilter !== 'all') {
    filtered = filtered.filter((f) => f.category === categoryFilter);
  }
  filtered.sort((a, b) => {
    if (sortOrder === 'size_desc') return b.sizeBytes - a.sizeBytes;
    if (sortOrder === 'size_asc') return a.sizeBytes - b.sizeBytes;
    return a.name.localeCompare(b.name);
  });
  return filtered;
}

describe('Formatters & Unit Conversions', () => {
  it('formats zero and negative bytes safely as 0 B', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(-100), '0 B');
    assert.equal(formatBytes(NaN), '0 B');
  });

  it('formats various byte quantities into correct units', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1024 * 1024 * 150), '150 MB');
    assert.equal(formatBytes(1024 * 1024 * 1024 * 128), '128 GB');
    assert.equal(formatBytes(1024 * 1024 * 1024 * 1024 * 2), '2 TB');
  });

  it('calculates percentage accurately and clamps boundaries', () => {
    assert.equal(formatPercentage(0, 0), 0);
    assert.equal(formatPercentage(50, 100), 50);
    assert.equal(formatPercentage(75, 100), 75);
    assert.equal(formatPercentage(150, 100), 100);
    assert.equal(formatPercentage(-10, 100), 0);
  });
});

describe('Android Storage Telemetry Calculations', () => {
  it('computes used storage consistently as total - available', () => {
    const total = 128 * 1024 * 1024 * 1024; // 128 GB
    const available = 48 * 1024 * 1024 * 1024; // 48 GB
    const { usedBytes, percentage } = calculateStorageMetrics(total, available);

    assert.equal(usedBytes, 80 * 1024 * 1024 * 1024);
    assert.equal(percentage, 63);
  });

  it('handles edge case where available exceeds total safely', () => {
    const total = 1000;
    const available = 2000;
    const { usedBytes, percentage } = calculateStorageMetrics(total, available);

    assert.equal(usedBytes, 0);
    assert.equal(percentage, 0);
  });
});

describe('Android Memory Pressure Telemetry', () => {
  it('identifies normal operating memory level (<70%)', () => {
    const total = 8 * 1024 * 1024 * 1024;
    const used = 4 * 1024 * 1024 * 1024; // 50%
    const { pressurePercentage, pressureLevel } = calculateMemoryPressure(used, total, false);

    assert.equal(pressurePercentage, 50);
    assert.equal(pressureLevel, 'normal');
  });

  it('identifies moderate pressure level (70-84%)', () => {
    const total = 8 * 1024 * 1024 * 1024;
    const used = 6 * 1024 * 1024 * 1024; // 75%
    const { pressurePercentage, pressureLevel } = calculateMemoryPressure(used, total, false);

    assert.equal(pressurePercentage, 75);
    assert.equal(pressureLevel, 'moderate');
  });

  it('identifies critical pressure level when allocation >= 85%', () => {
    const total = 8 * 1024 * 1024 * 1024;
    const used = 7.2 * 1024 * 1024 * 1024; // 90%
    const { pressurePercentage, pressureLevel } = calculateMemoryPressure(used, total, false);

    assert.equal(pressurePercentage, 90);
    assert.equal(pressureLevel, 'critical');
  });

  it('flags critical pressure immediately if kernel reports lowMemory state', () => {
    const total = 8 * 1024 * 1024 * 1024;
    const used = 4 * 1024 * 1024 * 1024; // only 50%, but kernel flagged lowMemory
    const { pressureLevel } = calculateMemoryPressure(used, total, true);

    assert.equal(pressureLevel, 'critical');
  });
});

describe('File Filtering and Sorting Rules', () => {
  const sampleFiles: TestFile[] = [
    { id: '1', name: 'trip_video.mp4', sizeBytes: 500 * 1024 * 1024, category: 'videos' },
    { id: '2', name: 'podcast.mp3', sizeBytes: 80 * 1024 * 1024, category: 'audio' },
    { id: '3', name: 'photo_raw.dng', sizeBytes: 45 * 1024 * 1024, category: 'images' },
    { id: '4', name: 'big_recording.mp4', sizeBytes: 1200 * 1024 * 1024, category: 'videos' },
  ];

  it('sorts files descending by size correctly', () => {
    const sorted = filterAndSortFiles(sampleFiles, 'all', 'size_desc');
    assert.equal(sorted[0].name, 'big_recording.mp4');
    assert.equal(sorted[1].name, 'trip_video.mp4');
    assert.equal(sorted[2].name, 'podcast.mp3');
    assert.equal(sorted[3].name, 'photo_raw.dng');
  });

  it('filters files by media category strictly', () => {
    const videosOnly = filterAndSortFiles(sampleFiles, 'videos', 'size_desc');
    assert.equal(videosOnly.length, 2);
    assert.ok(videosOnly.every((f) => f.category === 'videos'));
  });

  it('sorts files ascending by name', () => {
    const sortedByName = filterAndSortFiles(sampleFiles, 'all', 'name_asc');
    assert.equal(sortedByName[0].name, 'big_recording.mp4');
    assert.equal(sortedByName[1].name, 'photo_raw.dng');
  });
});
