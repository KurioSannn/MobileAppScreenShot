import React, { useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
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
import { PIPELINE_STEPS, useAnalyzePipeline } from '../../hooks';

interface AnalyzeScreenProps {
  onBack: () => void;
  onOpenMangaMode?: () => void;
  initialScreenshot?: ScreenshotRow | null;
  initialBatch?: ScreenshotRow[];
  intentError?: string | null;
  onClearError?: () => void;
  onScreenshotSelected?: (screenshot: ScreenshotRow) => void;
}

export const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({
  onBack,
  onOpenMangaMode,
  initialScreenshot = null,
  initialBatch = [],
  intentError = null,
  onClearError,
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
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Progressive analysis pipeline hook
  const pipeline = useAnalyzePipeline(currentScreenshot);

  // Sync with prop changes when an incoming intent opens
  React.useEffect(() => {
    if (initialScreenshot) {
      setCurrentScreenshot(initialScreenshot);
      setBatchScreenshots(initialBatch.length > 0 ? initialBatch : [initialScreenshot]);
      setActiveBatchIndex(0);
    }
  }, [initialScreenshot, initialBatch]);

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

  const handleCopyExtracted = (text: string) => {
    Clipboard.setString(text);
    setCopiedSnippet(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const isStepDone = (key: string): boolean => {
    if (pipeline.isCompleted) return true;
    if (pipeline.currentStep === 'finding_actions') {
      return key === 'reading_image' || key === 'detecting_text' || key === 'detecting_language';
    }
    if (pipeline.currentStep === 'detecting_language') {
      return key === 'reading_image' || key === 'detecting_text';
    }
    if (pipeline.currentStep === 'detecting_text') {
      return key === 'reading_image';
    }
    return false;
  };

  const isStepActive = (key: string): boolean => {
    return pipeline.currentStep === key;
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
        {/* Invalid File Error State (from Android share intent) */}
        {intentError && !currentScreenshot ? (
          <Card variant="surface" padding={Spacing.xl} style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="alert-circle-outline" size={44} color={Colors.danger} />
            </View>
            <Text style={styles.errorTitle}>Invalid Shared File</Text>
            <Text style={styles.errorSubtitle}>{intentError}</Text>

            <View style={styles.importButtonsWrapper}>
              <PrimaryButton
                label="Choose Screenshot from Gallery"
                onPress={() => {
                  onClearError?.();
                  handlePickSingle();
                }}
                loading={isPicking}
                icon={<Ionicons name="images" size={18} color={Colors.textPrimary} />}
              />
              <SecondaryButton
                label="Back to Home"
                onPress={() => {
                  onClearError?.();
                  onBack();
                }}
                icon={<Ionicons name="home-outline" size={18} color={Colors.textPrimary} />}
              />
            </View>
          </Card>
        ) : currentScreenshot ? (
          /* Preview state: Screenshot is displayed immediately! */
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

            {/* Metadata Bar */}
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

            {/* Quick Change / Batch Buttons */}
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

            {/* Progressive Processing Pipeline Status Card */}
            <Card variant="surface" padding={Spacing.lg} style={styles.pipelineCard}>
              <View style={styles.pipelineHeaderRow}>
                <View style={styles.pipelineTitleContainer}>
                  <Text style={styles.pipelineTitle}>Analysis Pipeline</Text>
                  <Text style={styles.pipelineSubtitle}>
                    {pipeline.isProcessing && `Processing (${pipeline.progress}%)`}
                    {pipeline.isCompleted && 'Analysis complete'}
                    {pipeline.isCancelled && 'Analysis paused'}
                  </Text>
                </View>

                {/* Cancel or Retry Controls */}
                {pipeline.isProcessing && (
                  <TouchableOpacity
                    style={styles.cancelChip}
                    onPress={pipeline.cancelPipeline}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                    <Text style={styles.cancelChipText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                {(pipeline.isCancelled || pipeline.isCompleted) && (
                  <TouchableOpacity
                    style={styles.retryChip}
                    onPress={pipeline.retryPipeline}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="reload-outline" size={15} color={Colors.textPrimary} />
                    <Text style={styles.retryChipText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress Track */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${pipeline.progress}%`,
                      backgroundColor: pipeline.isCancelled ? Colors.warning : Colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Step Rows */}
              <View style={styles.stepsList}>
                {PIPELINE_STEPS.map((step) => {
                  const done = isStepDone(step.key);
                  const active = isStepActive(step.key);
                  const cancelled = pipeline.isCancelled && active;

                  return (
                    <View key={step.key} style={styles.stepItemRow}>
                      <View style={styles.stepIconBox}>
                        {done ? (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                        ) : active && !cancelled ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : cancelled ? (
                          <Ionicons name="pause-circle" size={20} color={Colors.warning} />
                        ) : (
                          <View style={styles.stepPendingDot} />
                        )}
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text
                          style={[
                            styles.stepLabel,
                            done && styles.stepDoneLabel,
                            active && !cancelled && styles.stepActiveLabel,
                            cancelled && styles.stepCancelledLabel,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Progressive Result 1: Extracted OCR Text Preview */}
            {pipeline.extractedTextPreview && (
              <Card variant="surface" padding={Spacing.lg} style={styles.resultCard}>
                <View style={styles.resultHeaderRow}>
                  <View style={styles.resultHeaderLeft}>
                    <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                    <Text style={styles.resultTitle}>Detected Text Preview</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyExtracted(pipeline.extractedTextPreview!)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copiedSnippet ? 'checkmark-outline' : 'copy-outline'}
                      size={15}
                      color={Colors.textPrimary}
                    />
                    <Text style={styles.copySnippetText}>
                      {copiedSnippet ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.snippetBox}>
                  <Text style={styles.snippetText}>{pipeline.extractedTextPreview}</Text>
                </View>

                <View style={styles.ocrMetaRow}>
                  {pipeline.detectedLanguage && (
                    <View style={styles.langPillRow}>
                      <Text style={styles.langPillLabel}>Language:</Text>
                      <StatusBadge label={pipeline.detectedLanguage} status="info" />
                    </View>
                  )}
                  {pipeline.boundingBoxes.length > 0 && (
                    <View style={styles.langPillRow}>
                      <Text style={styles.langPillLabel}>Regions:</Text>
                      <StatusBadge
                        label={`${pipeline.boundingBoxes.length} blocks`}
                        status="neutral"
                      />
                    </View>
                  )}
                  <View style={styles.langPillRow}>
                    <Text style={styles.langPillLabel}>Confidence:</Text>
                    <StatusBadge
                      label={`${Math.round(pipeline.ocrConfidence * 100)}%`}
                      status="success"
                    />
                  </View>
                </View>
              </Card>
            )}

            {/* Progressive Result 2: Suggested Actions */}
            {pipeline.suggestedActions.length > 0 && (
              <Card variant="surface" padding={Spacing.lg} style={styles.actionsCard}>
                <Text style={styles.actionsTitle}>Suggested Actions</Text>
                <View style={styles.actionChipRow}>
                  {pipeline.suggestedActions.map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.actionChip,
                        action.type === 'manga' && styles.actionChipHighlighted,
                      ]}
                      onPress={() => {
                        try {
                          Haptics.selectionAsync();
                        } catch (_) {}
                        if (action.type === 'manga' && onOpenMangaMode) {
                          onOpenMangaMode();
                        } else if (action.type === 'copy' && pipeline.extractedTextPreview) {
                          handleCopyExtracted(pipeline.extractedTextPreview);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={action.iconName as any}
                        size={17}
                        color={action.type === 'manga' ? '#6847B8' : Colors.textPrimary}
                      />
                      <Text
                        style={[
                          styles.actionChipText,
                          action.type === 'manga' && { color: '#6847B8', fontWeight: '700' },
                        ]}
                      >
                        {action.label}
                      </Text>
                      {action.badge && (
                        <View style={styles.actionSmallBadge}>
                          <Text style={styles.actionSmallBadgeText}>{action.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}
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
    gap: Spacing.md,
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
  },
  pipelineCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  pipelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipelineTitleContainer: {
    gap: 2,
  },
  pipelineTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  pipelineSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  cancelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: '#FDEAE2',
  },
  cancelChipText: {
    fontSize: Typography.size.xs,
    color: Colors.danger,
    fontWeight: Typography.weight.bold,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryChipText: {
    fontSize: Typography.size.xs,
    color: Colors.textPrimary,
    fontWeight: Typography.weight.bold,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepsList: {
    gap: Spacing.sm + 2,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  stepIconBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5DFD5',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepLabel: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  stepDoneLabel: {
    color: Colors.success,
    fontWeight: Typography.weight.semibold,
  },
  stepActiveLabel: {
    color: '#B57B14',
    fontWeight: Typography.weight.bold,
  },
  stepCancelledLabel: {
    color: Colors.warning,
    fontWeight: Typography.weight.semibold,
  },
  stepDescription: {
    fontSize: Typography.size.xs - 1,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  resultCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm + 2,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  resultTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  copySnippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.pill,
  },
  copySnippetText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  snippetBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  snippetText: {
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  ocrMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  langPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  langPillLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
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
  actionChipHighlighted: {
    backgroundColor: '#EBE6F8',
    borderColor: '#D8CEF3',
  },
  actionChipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  actionSmallBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  actionSmallBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textPrimary,
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
  errorCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0CEC5',
    backgroundColor: '#FFF7F5',
    paddingVertical: Spacing.xl + 4,
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FDEAE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.xl,
    lineHeight: 20,
    maxWidth: '92%',
  },
});
