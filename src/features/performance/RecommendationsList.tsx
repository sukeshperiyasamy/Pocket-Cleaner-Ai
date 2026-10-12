import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MemoryRecommendation } from '@/types';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography } from '@/constants/theme';

interface RecommendationsListProps {
  recommendations: MemoryRecommendation[];
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[Typography.h3, { color: theme.text, marginBottom: Spacing.three }]}>
        Evidence-Based Recommendations
      </Text>

      {recommendations.map((rec) => {
        const getBadgeVariant = () => {
          switch (rec.type) {
            case 'warning':
              return 'warning' as const;
            case 'practical':
              return 'success' as const;
            default:
              return 'info' as const;
          }
        };

        const getIcon = (): keyof typeof Ionicons.glyphMap => {
          switch (rec.type) {
            case 'warning':
              return 'alert-circle-outline';
            case 'practical':
              return 'build-outline';
            default:
              return 'book-outline';
          }
        };

        return (
          <Card key={rec.id} style={styles.card} variant="subtle">
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Ionicons name={getIcon()} size={18} color={theme.primary} />
                <Text style={[Typography.labelLarge, { color: theme.text, flex: 1 }]}>
                  {rec.title}
                </Text>
              </View>
              <Badge
                label={rec.badge}
                variant={getBadgeVariant()}
                size="sm"
              />
            </View>

            <Text
              style={[
                Typography.bodySmall,
                { color: theme.textSecondary, marginTop: Spacing.two, lineHeight: 20 },
              ]}
            >
              {rec.description}
            </Text>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.five,
  },
  card: {
    marginBottom: Spacing.three,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
});
