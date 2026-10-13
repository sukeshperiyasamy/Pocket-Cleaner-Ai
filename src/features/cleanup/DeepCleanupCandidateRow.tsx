import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageCandidate } from '@/types/storageAnalysis';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Badge } from '@/components/Badge';

interface DeepCleanupCandidateRowProps {
  candidate: StorageCandidate;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const DeepCleanupCandidateRowComponent: React.FC<DeepCleanupCandidateRowProps> = ({
  candidate,
  isSelected,
  onToggleSelect,
}) => {
  const theme = useTheme();

  const getCategoryIcon = () => {
    switch (candidate.category) {
      case 'screenshots':
        return 'camera';
      case 'screen_recordings':
        return 'videocam';
      case 'large_media':
        return 'film';
      case 'old_downloads_docs':
        return 'document-text';
      case 'apk_installers':
        return 'cube';
      case 'temp_cache_files':
        return 'trash-bin';
      default:
        return 'folder';
    }
  };

  const getApkBadge = () => {
    if (!candidate.apkAnalysis || candidate.category !== 'apk_installers') {
      return null;
    }

    const { matchStatus, installedVersionName, apkVersionName } = candidate.apkAnalysis;

    switch (matchStatus) {
      case 'matches_installed_same':
        return (
          <Badge
            label={`Installed app matches (v${installedVersionName || '1.0'})`}
            variant="success"
            size="sm"
          />
        );
      case 'matches_installed_newer':
        return (
          <Badge
            label={`Newer installed (v${installedVersionName} vs APK v${apkVersionName})`}
            variant="info"
            size="sm"
          />
        );
      case 'matches_installed_older':
        return (
          <Badge
            label={`Older installed (v${installedVersionName} vs APK v${apkVersionName})`}
            variant="warning"
            size="sm"
          />
        );
      case 'not_installed_or_unverified':
      default:
        return (
          <Badge
            label="Standalone APK (Not installed)"
            variant="neutral"
            size="sm"
          />
        );
    }
  };

  const getRiskVariant = (risk: 'low' | 'medium' | 'high'): 'success' | 'warning' | 'error' => {
    switch (risk) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
    }
  };

  return (
    <Pressable
      onPress={onToggleSelect}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isSelected ? `${theme.primary}12` : theme.card,
          borderColor: isSelected ? theme.primary : theme.border,
        },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${candidate.name}, ${formatBytes(candidate.sizeBytes)}, ${candidate.ageLabel}`}
    >
      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? theme.primary : theme.textMuted}
        />
      </View>

      {/* File Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
        <Ionicons name={getCategoryIcon() as any} size={20} color={theme.primary} />
      </View>

      {/* Content */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={[Typography.labelLarge, { color: theme.text, flex: 1 }]} numberOfLines={1}>
            {candidate.name}
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '700', marginLeft: Spacing.two }]}>
            {formatBytes(candidate.sizeBytes)}
          </Text>
        </View>

        <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {candidate.path}
        </Text>

        {/* Reason and Metadata row */}
        <View style={styles.badgeRow}>
          <View style={styles.ageBadge}>
            <Ionicons name="time-outline" size={12} color={theme.textMuted} style={{ marginRight: 3 }} />
            <Text style={[Typography.labelSmall, { color: theme.textSecondary }]}>
              {candidate.ageLabel}
            </Text>
          </View>

          <Badge
            label={candidate.riskLevel.toUpperCase()}
            variant={getRiskVariant(candidate.riskLevel)}
            size="sm"
          />
        </View>

        {/* APK Comparison Badge */}
        {getApkBadge() && (
          <View style={{ marginTop: 4 }}>
            {getApkBadge()}
          </View>
        )}

        {/* Transparent Reason Badge */}
        <View style={[styles.reasonBadge, { backgroundColor: theme.surfaceSubtle }]}>
          <Ionicons name="information-circle-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[Typography.labelSmall, { color: theme.textSecondary }]} numberOfLines={2}>
            {candidate.recommendationReason}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  checkboxContainer: {
    marginRight: Spacing.two,
    marginTop: 2,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  infoContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginTop: Spacing.one,
  },
});

export const DeepCleanupCandidateRow = React.memo<DeepCleanupCandidateRowProps>(
  DeepCleanupCandidateRowComponent,
  (prev, next) =>
    prev.candidate.id === next.candidate.id &&
    prev.isSelected === next.isSelected &&
    prev.candidate.sizeBytes === next.candidate.sizeBytes
);
