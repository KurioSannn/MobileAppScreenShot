import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, StatusBadge, PrimaryButton, SecondaryButton } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { screenshotRepository } from '../../db';
import { LibraryItem, ScreenshotCategory, ScreenshotRow } from '../../types';

export const CATEGORIES: (ScreenshotCategory | 'All')[] = [
  'All',
  'Manga',
  'Assignment',
  'Chat',
  'Product',
  'Receipt',
];

export interface LibraryScreenProps {
  onSelectScreenshot?: (screenshot: ScreenshotRow) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectScreenshot }) => {
  const [selectedCat, setSelectedCat] = useState<ScreenshotCategory | 'All'>('All');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LibraryItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await screenshotRepository.getLibraryScreenshots(selectedCat);
      setItems(data);
    } catch (err) {
      console.warn('Failed to load library items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCat]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCategoryPress = (cat: ScreenshotCategory | 'All') => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setSelectedCat(cat);
  };

  const handleItemPress = (item: LibraryItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    onSelectScreenshot?.(item);
  };

  const promptDelete = (item: LibraryItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    try {
      await screenshotRepository.deleteScreenshot(targetId);
      setItems((prev) => prev.filter((item) => item.id !== targetId));
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
    } finally {
      setItemToDelete(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} • ${timeStr}`;
  };

  const renderItem = ({ item }: { item: LibraryItem }) => {
    const statusType =
      item.status === 'Translated'
        ? 'info'
        : item.status === 'Analyzed'
        ? 'success'
        : 'neutral';

    const previewText = item.translated_text || item.ocr_text;

    return (
      <Card
        variant="surface"
        style={styles.itemCard}
        padding={Spacing.md}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardRow}>
          {/* Thumbnail preview */}
          <View style={styles.thumbWrapper}>
            {item.image_uri ? (
              <Image
                source={{ uri: item.image_uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
              </View>
            )}
          </View>

          {/* Details Column */}
          <View style={styles.detailsCol}>
            {/* Badges Row */}
            <View style={styles.badgeRow}>
              <StatusBadge
                label={item.category}
                status={item.category === 'Manga' ? 'info' : 'neutral'}
              />
              <StatusBadge label={item.status} status={statusType} />
              {item.language && (
                <View style={styles.langPill}>
                  <Ionicons name="globe-outline" size={11} color={Colors.textSecondary} />
                  <Text style={styles.langText}>{item.language.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Date and reminders */}
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              {item.reminder_count > 0 && (
                <View style={styles.reminderBadge}>
                  <Ionicons name="alarm-outline" size={12} color={Colors.pastelHoneyIcon} />
                  <Text style={styles.reminderCount}>{item.reminder_count}</Text>
                </View>
              )}
            </View>

            {/* Text snippet */}
            {previewText ? (
              <Text style={styles.previewSnippet} numberOfLines={2}>
                {previewText}
              </Text>
            ) : (
              <Text style={styles.noTextSnippet}>No extracted text yet</Text>
            )}
          </View>

          {/* Delete Action Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              promptDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>
            {items.length} {items.length === 1 ? 'screenshot' : 'screenshots'} saved
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="sync-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading library...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="albums-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCat === 'All'
                  ? 'No screenshots yet'
                  : `No screenshots in "${selectedCat}"`}
              </Text>
              <Text style={styles.emptySub}>
                Import or share screenshots to have them organized and indexed here.
              </Text>
            </View>
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!itemToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="trash" size={24} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete Screenshot</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this screenshot and all associated analysis data? This action cannot be undone.
            </Text>

            <View style={styles.modalButtonRow}>
              <SecondaryButton
                label="Cancel"
                onPress={() => setItemToDelete(null)}
                style={styles.modalBtn}
              />
              <PrimaryButton
                label="Delete"
                onPress={confirmDelete}
                style={styles.modalDeleteBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterContainer: {
    paddingVertical: Spacing.sm,
  },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  catTextActive: {
    color: Colors.surface,
    fontWeight: Typography.weight.bold,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 100, // Space for bottom tab bar
    gap: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  thumbWrapper: {
    width: 68,
    height: 92,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  dateText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  reminderCount: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.pastelHoneyIcon,
  },
  previewSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 2,
  },
  noTextSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
  },
});
