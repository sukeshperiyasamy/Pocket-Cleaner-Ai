import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography, Radius } from '@/constants/theme';
import {
  DeviceMetricsModule,
  getNativeModuleDiagnostics,
  type NativeModuleDiagnostics,
} from '../../../modules/device-metrics/src';
import { checkMediaPermissions } from '@/utils/permissions';
import { formatBytes } from '@/utils/formatters';

export function NativeDiagnosticsCard() {
  const theme = useTheme();
  const [diag, setDiag] = useState<NativeModuleDiagnostics>(getNativeModuleDiagnostics);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const refreshDiagnostics = useCallback(() => {
    setDiag(getNativeModuleDiagnostics());
    checkMediaPermissions()
      .then((perm) => setHasPermission(perm))
      .catch(() => setHasPermission(false));
  }, []);

  const runLiveTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      console.log('[NativeDiagnosticsCard] Starting live test of DeviceMetrics native module...');
      const startTime = Date.now();
      const storage = await DeviceMetricsModule.getStorageSummary();
      console.log('[NativeDiagnosticsCard] storage result:', JSON.stringify(storage));
      const memory = await DeviceMetricsModule.getMemorySummary();
      console.log('[NativeDiagnosticsCard] memory result:', JSON.stringify(memory));
      const duration = Date.now() - startTime;

      setTestResult(
        `SUCCESS (${duration}ms)\n` +
        `• StatFs Storage: ${formatBytes(storage.usedBytes)} used / ${formatBytes(storage.totalBytes)} total (isMock=${storage.isMock})\n` +
        `• MemoryInfo RAM: ${formatBytes(memory.availableBytes)} avail / ${formatBytes(memory.totalBytes)} total (lowMemory=${memory.isLowMemory})\n` +
        `• Storage Path: ${storage.storagePath}`
      );
      refreshDiagnostics();
    } catch (err: any) {
      console.error('[NativeDiagnosticsCard] live test failed:', err);
      setTestResult(`FAILED: ${err?.message || String(err)}`);
      refreshDiagnostics();
    } finally {
      setTesting(false);
    }
  }, [refreshDiagnostics]);

  useEffect(() => {
    let active = true;
    checkMediaPermissions()
      .then((perm) => {
        if (active) setHasPermission(perm);
      })
      .catch(() => {
        if (active) setHasPermission(false);
      });

    const timer = setTimeout(() => {
      if (active) {
        runLiveTest();
      }
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [runLiveTest]);

  if (!diag) return null;

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[Typography.h3, { color: theme.text }]}>
            Native DeviceMetrics Diagnostics
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Phase 2 Android native module verification
          </Text>
        </View>
        <Badge
          label={diag.isAvailable ? 'Module Loaded' : 'Fallback Active'}
          variant={diag.isAvailable ? 'success' : 'warning'}
          size="sm"
        />
      </View>

      {/* Native Error Callouts if any */}
      {(diag.loadError || diag.runtimeError) && (
        <View style={[styles.errorBox, { backgroundColor: theme.errorContainer }]}>
          <Text style={[Typography.labelMedium, { color: theme.error, fontWeight: '700' }]}>
            Native DeviceMetrics Error:
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.error, marginTop: 2 }]}>
            {diag.loadError || diag.runtimeError}
          </Text>
        </View>
      )}

      {/* Fallback Reason Callout if active */}
      {!diag.isAvailable && diag.fallbackReason && (
        <View style={[styles.errorBox, { backgroundColor: theme.warningContainer, borderColor: theme.warning, borderWidth: 1 }]}>
          <Text style={[Typography.labelMedium, { color: theme.onWarningContainer, fontWeight: '700' }]}>
            Active Fallback Reason:
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.onWarningContainer, marginTop: 2 }]}>
            {diag.fallbackReason}
          </Text>
        </View>
      )}

      {/* Diagnostics Grid */}
      <View style={styles.grid}>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Target Module:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {diag.moduleName}
          </Text>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Data Integrity:
          </Text>
          <Badge
            label="Fallbacks Never Labeled Live"
            variant="info"
            size="sm"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            JSI Interop (globalThis.expo):
          </Text>
          <Badge
            label={diag.hasGlobalExpo ? 'Initialized' : 'Missing'}
            variant={diag.hasGlobalExpo ? 'success' : 'error'}
            size="sm"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Media Permissions:
          </Text>
          <Badge
            label={hasPermission ? 'Granted' : 'Not Granted'}
            variant={hasPermission ? 'success' : 'warning'}
            size="sm"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Registered Expo Modules ({diag.registeredExpoModules.length}):
          </Text>
        </View>

        <View style={[styles.moduleList, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {diag.registeredExpoModules.length > 0
              ? diag.registeredExpoModules.join(', ')
              : 'None detected yet'}
          </Text>
        </View>
      </View>

      {/* Live Test Result */}
      {testResult && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: testResult.startsWith('SUCCESS')
                ? theme.successContainer
                : theme.errorContainer,
            },
          ]}
        >
          <Text
            style={[
              Typography.bodySmall,
              {
                color: testResult.startsWith('SUCCESS')
                  ? theme.success
                  : theme.error,
              },
            ]}
          >
            {testResult}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={testing ? 'Testing Native API...' : 'Run Live Native Test'}
          size="sm"
          variant="filled"
          onPress={runLiveTest}
          disabled={testing}
          style={{ flex: 1 }}
        />
        <Button
          label="Refresh"
          size="sm"
          variant="outlined"
          onPress={refreshDiagnostics}
          disabled={testing}
          style={{ marginLeft: Spacing.two }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  errorBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
  },
  grid: {
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  moduleList: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.one,
  },
  resultBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
});
