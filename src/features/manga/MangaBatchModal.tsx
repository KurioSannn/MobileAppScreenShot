import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PrimaryButton, SecondaryButton } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { ScreenshotRow } from '../../types';
import {
  BatchProcessingProgress,
  MangaBatchItem,
  mangaBatchProcessor,
} from '../../services/manga';
import { pickMultipleScreenshots } from '../../utils';

export interface MangaBatchModalProps {
  visible: boolean;
  onClose: () => void;
  onStartReading: (screenshots: ScreenshotRow[]) => void;
  initialScreenshots?: ScreenshotRow[];
}

export const MangaBatchModal: React.FC<MangaBatchModalProps> = ({
  visible,
  onClose,
  onStartReading,
  initialScreenshots = [],
}) => {
  const [items, setItems] = useState<MangaBatchItem[]>(() =>
    initialScreenshots.length > 0
      ? mangaBatchProcessor.createQueueFromScreenshots(initialScreenshots)
      : []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProcessingProgress>({
    total: initialScreenshots.length,
    completed: 0,
    failed: 0,
    processingIndex: 0,
    percentage: 0,
  });

  const handlePickPages = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const res = await pickMultipleScreenshots('Manga');
    if (!res.canceled && res.screenshots && res.screenshots.length > 0) {
      const queue = mangaBatchProcessor.createQueueFromScreenshots(res.screenshots);
      setItems(queue);
      setProgress({
        total: queue.length,
        completed: 0,
        failed: 0,
        processingIndex: 0,
        percentage: 0,
      });
    }
  };

  const handleStartProcessing = async () => {
    if (items.length === 0 || isProcessing) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    setIsProcessing(true);

    await mangaBatchProcessor.processQueue(
      (prog) => setProgress(prog),
      (updatedItem) => {
        setItems((prev) =>
          prev.map((it) => (it.id === updatedItem.id ? { ...updatedItem } : it))
        );
      }
    );

    setIsProcessing(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  const handleRetryItem = async (itemId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    await mangaBatchProcessor.retryItem(
      itemId,
      (prog) => setProgress(prog),
      (updatedItem) => {
        setItems((prev) =>
          prev.map((it) => (it.id === updatedItem.id ? { ...updatedItem } : it))
        );
      }
    );
  };

  const handleRetryAllFailed = async () => {
    const failedItems = items.filter((it) => it.status === 'failed');
    for (const fail of failedItems) {
      await handleRetryItem(fail.id);
    }
  };

  const handleStartReadingClick = () => {
    const doneItems = items.filter((it) => it.status === 'done');
    if (doneItems.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    const selectedScreenshots: ScreenshotRow[] = doneItems.map((item) => ({
      id: item.screenshotId,
      image_uri: item.imageUri,
      width: 1080,
      height: 1920,
      source_app: null,
      category: 'Manga',
      notes: null,
      created_at: Date.now(),
    }));

    onStartReading(selectedScreenshots);
    onClose();
  };

  const doneCount = items.filter((it) => it.status === 'done').length;
  const failedCount = items.filter((it) => it.status === 'failed').length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.modalTitle}>Batch Manga Translation</Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>100% Free</Text>
                </View>
              </View>
              <Text style={styles.modalSub}>
                Sequential offline processing (2–20 pages) with zero lag
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Add / Import Bar */}
          <View style={styles.importBar}>
            <TouchableOpacity
              onPress={handlePickPages}
              disabled={isProcessing}
              style={[styles.importBtn, isProcessing && styles.importBtnDisabled]}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.importBtnText}>Select 2–20 Manga Pages</Text>
            </TouchableOpacity>
            <Text style={styles.importCountText}>{items.length} pages in queue</Text>
          </View>

          {/* Progress Header */}
          {items.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {isProcessing
                    ? `Processing page ${progress.processingIndex + 1} of ${progress.total}...`
                    : doneCount === progress.total && progress.total > 0
                    ? 'All pages completed!'
                    : `Completed ${doneCount} of ${progress.total} pages`}
                </Text>
                <Text style={styles.progressPercent}>{progress.percentage}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, Math.max(0, progress.percentage))}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Queue List */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={44} color={Colors.borderStrong} />
                <Text style={styles.emptyTitle}>No Manga Pages in Queue</Text>
                <Text style={styles.emptySub}>
                  Select 2 to 20 screenshot pages from your gallery to translate all dialogues in order.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
                <View style={styles.itemInfo}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.pageTitle}>Page {item.pageNumber}</Text>
                    {item.isCached && (
                      <View style={styles.cachedPill}>
                        <Text style={styles.cachedText}>Cached</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.itemSub}>
                    {item.status === 'done'
                      ? `${item.bubbleCount} bubbles • ${item.narrationCount} narration`
                      : item.status === 'processing'
                      ? `Analyzing layout & context (${item.progress}%)...`
                      : item.status === 'failed'
                      ? item.errorMessage || 'Failed to process'
                      : 'Waiting in queue...'}
                  </Text>
                </View>

                {/* Status Indicator / Actions */}
                <View style={styles.statusCol}>
                  {item.status === 'ready' && (
                    <View style={styles.statusBadgeReady}>
                      <Text style={styles.statusTextReady}>Ready</Text>
                    </View>
                  )}
                  {item.status === 'processing' && (
                    <View style={styles.statusBadgeProcessing}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  )}
                  {item.status === 'done' && (
                    <View style={styles.statusBadgeDone}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    </View>
                  )}
                  {item.status === 'failed' && (
                    <TouchableOpacity
                      onPress={() => handleRetryItem(item.id)}
                      style={styles.retryBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh" size={14} color="#FFFFFF" />
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />

          {/* Footer Actions */}
          <View style={styles.footer}>
            {failedCount > 0 && !isProcessing && (
              <SecondaryButton
                label={`Retry Failed (${failedCount})`}
                onPress={handleRetryAllFailed}
                style={{ marginBottom: Spacing.xs }}
              />
            )}

            <View style={styles.footerBtnRow}>
              {isProcessing ? (
                <SecondaryButton
                  label="Cancel Batch"
                  onPress={() => mangaBatchProcessor.cancel()}
                  style={{ flex: 1 }}
                />
              ) : (
                <PrimaryButton
                  label="Process Queue"
                  disabled={items.length === 0 || doneCount === items.length}
                  onPress={handleStartProcessing}
                  style={{ flex: 1 }}
                />
              )}

              <PrimaryButton
                label="Start Reading 📖"
                disabled={doneCount === 0}
                onPress={handleStartReadingClick}
                style={{ flex: 1.2, backgroundColor: doneCount > 0 ? Colors.info : Colors.surfaceSubtle }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
    gap: Spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  freeBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.success,
  },
  modalSub: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  importBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  importCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressContainer: {
    gap: 4,
    marginVertical: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: Typography.size.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xs + 2,
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 44,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSubtle,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageTitle: {
    fontSize: Typography.size.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cachedPill: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  cachedText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.info,
  },
  itemSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statusCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeReady: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusTextReady: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statusBadgeProcessing: {
    padding: 4,
  },
  statusBadgeDone: {
    padding: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  retryBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
