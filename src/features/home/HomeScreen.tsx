import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, IconButton, StatusBadge } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { screenshotRepository } from '../../db';
import { ScreenshotRow } from '../../types';
import { pickSingleScreenshot } from '../../utils';

interface HomeScreenProps {
  onNavigateToAnalyze: (screenshot?: ScreenshotRow, batch?: ScreenshotRow[]) => void;
  onNavigateToManga: () => void;
  onNavigateToSearch: () => void;
  onNavigateToLibrary: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToAnalyze,
  onNavigateToManga,
  onNavigateToSearch,
  onNavigateToLibrary,
}) => {
  const [recents, setRecents] = useState<ScreenshotRow[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  useEffect(() => {
    let isMounted = true;
    screenshotRepository
      .getRecentScreenshots(5)
      .then((items) => {
        if (isMounted) {
          setRecents(items);
          setLoadingRecents(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load recent screenshots:', err);
        if (isMounted) setLoadingRecents(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleHeroPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    onNavigateToAnalyze();
  };

  const handleChooseScreenshot = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const result = await pickSingleScreenshot('Other');
    if (!result.canceled && result.screenshot) {
      screenshotRepository.getRecentScreenshots(5).then(setRecents);
      onNavigateToAnalyze(result.screenshot, [result.screenshot]);
    }
  };

  const handleQuickAction = (action: 'translate' | 'manga' | 'extract' | 'reminder') => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    if (action === 'manga') {
      onNavigateToManga();
    } else {
      // Analyze is the unified pipeline entry point for OCR, translation & entity extraction
      onNavigateToAnalyze();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>Snaply</Text>
            <Text style={styles.brandTagline}>Your screenshots, made useful.</Text>
          </View>
          <IconButton
            icon={<Ionicons name="search-outline" size={20} color={Colors.textPrimary} />}
            onPress={onNavigateToSearch}
            variant="surface"
            size={44}
          />
        </View>

        {/* Hero Card: Analyze Screenshot */}
        <Card
          variant="primary"
          onPress={handleHeroPress}
          style={styles.heroCard}
          padding={Spacing.xl}
        >
          <View style={styles.heroTextContainer}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Fast & Local-first</Text>
            </View>
            <Text style={styles.heroTitle}>Analyze Screenshot</Text>
            <Text style={styles.heroSubtitle}>
              Translate, extract text, or detect deadlines from any screenshot.
            </Text>
          </View>
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.heroButton}
              activeOpacity={0.8}
              onPress={handleChooseScreenshot}
            >
              <Ionicons name="add" size={18} color={Colors.textPrimary} />
              <Text style={styles.heroButtonText}>Choose Screenshot</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {/* Quick Action 1: Translate */}
            <Card
              variant="peach"
              onPress={() => handleQuickAction('translate')}
              style={styles.quickCard}
              padding={Spacing.md + 4}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#F9D1C2' }]}>
                <Ionicons name="language-outline" size={20} color={Colors.pastelPeachIcon} />
              </View>
              <Text style={styles.quickTitle}>Translate</Text>
              <Text style={styles.quickSub}>Auto detect & convert</Text>
            </Card>

            {/* Quick Action 2: Manga Mode */}
            <Card
              variant="lavender"
              onPress={() => handleQuickAction('manga')}
              style={styles.quickCard}
              padding={Spacing.md + 4}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#D8CEF3' }]}>
                <Ionicons name="book-outline" size={20} color={Colors.pastelLavenderIcon} />
              </View>
              <Text style={styles.quickTitle}>Manga Mode</Text>
              <Text style={styles.quickSub}>Speech bubble translation</Text>
            </Card>

            {/* Quick Action 3: Extract Text */}
            <Card
              variant="mint"
              onPress={() => handleQuickAction('extract')}
              style={styles.quickCard}
              padding={Spacing.md + 4}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#C8E8D4' }]}>
                <Ionicons name="document-text-outline" size={20} color={Colors.pastelMintIcon} />
              </View>
              <Text style={styles.quickTitle}>Extract Text</Text>
              <Text style={styles.quickSub}>OCR & copy instantly</Text>
            </Card>

            {/* Quick Action 4: Reminder */}
            <Card
              variant="honey"
              onPress={() => handleQuickAction('reminder')}
              style={styles.quickCard}
              padding={Spacing.md + 4}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#FFE6AC' }]}>
                <Ionicons name="alarm-outline" size={20} color={Colors.pastelHoneyIcon} />
              </View>
              <Text style={styles.quickTitle}>Reminder</Text>
              <Text style={styles.quickSub}>Detect deadline dates</Text>
            </Card>
          </View>
        </View>

        {/* Recent Screenshots Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Screenshots</Text>
            <TouchableOpacity onPress={onNavigateToLibrary} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Conditional rendering based on SQLite items */}
          {recents.length > 0 ? (
            <View style={styles.recentList}>
              {recents.map((item) => (
                <Card
                  key={item.id}
                  variant="surface"
                  onPress={() => onNavigateToAnalyze(item, [item])}
                  style={styles.recentItemCard}
                  padding={Spacing.md}
                >
                  <View style={styles.recentItemRow}>
                    <View style={styles.recentThumb}>
                      {item.image_uri ? (
                        <Image
                          source={{ uri: item.image_uri }}
                          style={styles.thumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.recentItemInfo}>
                      <View style={styles.recentBadgeRow}>
                        <StatusBadge
                          label={item.category}
                          status={item.category === 'Manga' ? 'info' : 'neutral'}
                        />
                        <Text style={styles.recentDate}>
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Text style={styles.recentItemTitle} numberOfLines={1}>
                        {item.notes || `Screenshot #${item.id.slice(0, 6)}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            /* Empty state placeholder when DB is empty */
            <View style={styles.emptyCard}>
              <Ionicons name="images-outline" size={38} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No screenshots analyzed yet</Text>
              <Text style={styles.emptySubtitle}>
                Share a screenshot to Snaply or tap Analyze Screenshot above to begin.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.md,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  brandContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: Typography.weight.medium,
  },
  heroCard: {
    marginVertical: Spacing.sm,
    borderColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTextContainer: {
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: '#3B2900',
  },
  heroTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs + 2,
  },
  heroSubtitle: {
    fontSize: Typography.size.sm,
    color: '#47360A',
    lineHeight: 19,
  },
  heroActionRow: {
    alignItems: 'flex-start',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    minHeight: 44,
  },
  heroButtonText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickCard: {
    width: '48%',
    borderRadius: Radius.card - 4,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
  },
  quickTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  quickSub: {
    fontSize: Typography.size.xs,
    color: '#55524D',
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.xl + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: '#4A4844',
    marginTop: Spacing.sm + 2,
  },
  emptySubtitle: {
    fontSize: Typography.size.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  recentList: {
    gap: Spacing.sm + 2,
  },
  recentItemCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recentThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  recentItemInfo: {
    flex: 1,
    gap: 4,
  },
  recentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recentDate: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  recentItemTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
});
