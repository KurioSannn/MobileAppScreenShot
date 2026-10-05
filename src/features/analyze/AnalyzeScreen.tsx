import React, { useState } from 'react';
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
import {
  Card,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { ScreenshotRow } from '../../types';
import { pickMultipleScreenshots, pickSingleScreenshot } from '../../utils';

interface AnalyzeScreenProps {
  onBack: () => void;
  onOpenMangaMode?: () => void;
  initialScreenshot?: ScreenshotRow | null;
  initialBatch?: ScreenshotRow[];
  onScreenshotSelected?: (screenshot: ScreenshotRow) => void;
}

export const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({
  onBack,
  onOpenMangaMode,
  initialScreenshot = null,
  initialBatch = [],
  onScreenshotSelected,
}) => {
  const [currentScreenshot, setCurrentScreenshot] = useState<ScreenshotRow | null>(
    initialScreenshot
  );
  const [batchScreenshots, setBatchScreenshots] = useState<ScreenshotRow[]>(
    initialBatch.length > 0 ? initialBatch : initialScreenshot ? [initialScreenshot] : []
  );
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [isPicking, setIsPicking] = useState(false);

  // Handle single screenshot import from gallery
  const handlePickSingle = async () => {
    setIsPicking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const result = await pickSingleScreenshot('Other');
    setIsPicking(false);

    if (!result.canceled && result.screenshot) {
      setCurrentScreenshot(result.screenshot);
      setBatchScreenshots([result.screenshot]);
      setActiveBatchIndex(0);
      onScreenshotSelected?.(result.screenshot);
    }
  };

  // Handle multiple (batch) screenshot import from gallery
  const handlePickMultiple = async () => {
    setIsPicking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const result = await pickMultipleScreenshots('Other');
    setIsPicking(false);

    if (!result.canceled && result.screenshots && result.screenshots.length > 0) {
      const first = result.screenshots[0];
      if (first) {
        setBatchScreenshots(result.screenshots);
        setCurrentScreenshot(first);
        setActiveBatchIndex(0);
        onScreenshotSelected?.(first);
      }
    }
  };

  // Switch between batch pages
  const handlePrevPage = () => {
    if (activeBatchIndex > 0) {
      const newIndex = activeBatchIndex - 1;
      const target = batchScreenshots[newIndex];
      if (target) {
        setActiveBatchIndex(newIndex);
        setCurrentScreenshot(target);
        try {
          Haptics.selectionAsync();
        } catch (_) {}
      }
    }
  };

  const handleNextPage = () => {
    if (activeBatchIndex < batchScreenshots.length - 1) {
      const newIndex = activeBatchIndex + 1;
      const target = batchScreenshots[newIndex];
      if (target) {
        setActiveBatchIndex(newIndex);
        setCurrentScreenshot(target);
        try {
          Haptics.selectionAsync();
        } catch (_) {}
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />}
          onPress={onBack}
          variant="surface"
          size={42}
        />
        <Text style={styles.headerTitle}>Analyze Screenshot</Text>
        <IconButton
          icon={<Ionicons name="images-outline" size={20} color={Colors.textPrimary} />}
          onPress={handlePickSingle}
          variant="surface"
          size={42}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screenshot Preview or Empty Import State */}
        {currentScreenshot ? (
          <View style={styles.previewContainer}>
            <View style={styles.imageCard}>
              <Image
                source={{ uri: currentScreenshot.image_uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>

            {/* Batch Navigation Controls if multiple screenshots */}
            {batchScreenshots.length > 1 && (
              <View style={styles.batchPaginationRow}>
                <TouchableOpacity
                  style={[styles.batchNavBtn, activeBatchIndex === 0 && styles.batchNavBtnDisabled]}
                  onPress={handlePrevPage}
                  disabled={activeBatchIndex === 0}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={activeBatchIndex === 0 ? Colors.textMuted : Colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.batchNavText,
                      activeBatchIndex === 0 && styles.batchNavTextDisabled,
                    ]}
                  >
                    Prev
                  </Text>
                </TouchableOpacity>

                <View style={styles.batchBadge}>
                  <Text style={styles.batchBadgeText}>
                    Page {activeBatchIndex + 1} of {batchScreenshots.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.batchNavBtn,
                    activeBatchIndex === batchScreenshots.length - 1 &&
                      styles.batchNavBtnDisabled,
                  ]}
                  onPress={handleNextPage}
                  disabled={activeBatchIndex === batchScreenshots.length - 1}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.batchNavText,
                      activeBatchIndex === batchScreenshots.length - 1 &&
                        styles.batchNavTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      activeBatchIndex === batchScreenshots.length - 1
                        ? Colors.textMuted
                        : Colors.textPrimary
                    }
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Metadata Chips Bar */}
            <Card variant="surface" padding={Spacing.md} style={styles.metadataCard}>
              <View style={styles.metadataRow}>
                <StatusBadge label={currentScreenshot.category} status="neutral" />
                {currentScreenshot.width > 0 && currentScreenshot.height > 0 && (
                  <View style={styles.metaChip}>
                    <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>
                      {currentScreenshot.width} × {currentScreenshot.height} px
                    </Text>
                  </View>
                )}
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {new Date(currentScreenshot.created_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Quick Action Buttons for Changing Image */}
            <View style={styles.actionButtonRow}>
              <SecondaryButton
                label="Change Image"
                onPress={handlePickSingle}
                icon={<Ionicons name="image-outline" size={18} color={Colors.textPrimary} />}
                size="sm"
                style={{ flex: 1 }}
              />
              <SecondaryButton
                label="Batch (Multi)"
                onPress={handlePickMultiple}
                icon={<Ionicons name="layers-outline" size={18} color={Colors.textPrimary} />}
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          /* Empty state: User has not selected a screenshot yet */
          <Card variant="surface" padding={Spacing.xl} style={styles.emptyImportCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="images-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Choose Screenshot to Analyze</Text>
            <Text style={styles.emptySubtitle}>
              Select a single screenshot from your gallery or choose multiple pages for batch processing.
            </Text>

            <View style={styles.importButtonsWrapper}>
              <PrimaryButton
                label="Choose Single Screenshot"
                onPress={handlePickSingle}
                loading={isPicking}
                icon={<Ionicons name="image" size={18} color={Colors.textPrimary} />}
              />
              <SecondaryButton
                label="Choose Multiple Screenshots (Batch)"
                onPress={handlePickMultiple}
                loading={isPicking}
                icon={<Ionicons name="albums-outline" size={18} color={Colors.textPrimary} />}
              />
            </View>
          </Card>
        )}

        {/* Progressive Processing Steps Pipeline */}
        <Card variant="surface" padding={Spacing.lg} style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Analysis Pipeline</Text>

          <View style={styles.stepRow}>
            <Ionicons
              name={currentScreenshot ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={currentScreenshot ? Colors.success : Colors.textMuted}
            />
            <Text
              style={[
                styles.stepText,
                currentScreenshot ? styles.stepDoneText : styles.stepPendingText,
              ]}
            >
              1. Reading image metadata & preview
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepActiveDot} />
            <Text style={styles.stepActiveText}>2. Detecting text regions & layout</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepPendingDot} />
            <Text style={styles.stepPendingText}>3. Identifying language & entities</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepPendingDot} />
            <Text style={styles.stepPendingText}>4. Suggesting relevant actions</Text>
          </View>
        </Card>

        {/* Suggested Actions Preview */}
        <Card variant="surface" padding={Spacing.lg} style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Suggested Actions</Text>
          <View style={styles.actionChipRow}>
            <TouchableOpacity style={styles.actionChip} activeOpacity={0.75}>
              <Ionicons name="language-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionChipText}>Translate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChip}
              onPress={onOpenMangaMode}
              activeOpacity={0.75}
            >
              <Ionicons name="book-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionChipText}>Manga Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionChip} activeOpacity={0.75}>
              <Ionicons name="copy-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionChipText}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionChip} activeOpacity={0.75}>
              <Ionicons name="alarm-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionChipText}>Reminder</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.lg,
  },
  previewContainer: {
    gap: Spacing.sm + 2,
  },
  imageCard: {
    height: 300,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  batchPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  batchNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchNavBtnDisabled: {
    opacity: 0.4,
  },
  batchNavText: {
    fontSize: Typography.size.xs + 1,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  batchNavTextDisabled: {
    color: Colors.textMuted,
  },
  batchBadge: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  batchBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
  },
  metadataCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  emptyImportCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing.xxl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.xl,
    lineHeight: 20,
    maxWidth: '90%',
  },
  importButtonsWrapper: {
    width: '100%',
    gap: Spacing.md,
  },
  stepsCard: {
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepsTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  stepText: {
    fontSize: Typography.size.sm,
  },
  stepDoneText: {
    color: Colors.success,
    fontWeight: Typography.weight.semibold,
  },
  stepActiveText: {
    fontSize: Typography.size.sm,
    color: '#B57B14',
    fontWeight: Typography.weight.bold,
  },
  stepPendingText: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  stepActiveDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    marginLeft: 3,
    marginRight: 3,
  },
  stepPendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5DFD5',
    marginLeft: 4,
    marginRight: 4,
  },
  actionsCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionsTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionChipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
});
