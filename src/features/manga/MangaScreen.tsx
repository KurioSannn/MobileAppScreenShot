import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBadge, PrimaryButton } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { MangaRenderMode, ReadingDirection, ScreenshotRow } from '../../types';
import { mangaDetectionService, MangaRegionData } from '../../services/manga';
import { pickSingleScreenshot } from '../../utils';
import { MangaSkiaOverlay } from './MangaSkiaOverlay';

export interface MangaScreenProps {
  onBack: () => void;
  initialScreenshot?: ScreenshotRow | null;
}

export const MangaScreen: React.FC<MangaScreenProps> = ({ onBack, initialScreenshot = null }) => {
  const [screenshot, setScreenshot] = useState<ScreenshotRow | null>(initialScreenshot);
  const [mode, setMode] = useState<'translated' | 'original'>('translated');
  const [readingDir, setReadingDir] = useState<ReadingDirection>('rtl');
  const [renderMode, setRenderMode] = useState<MangaRenderMode>('replace');
  const [regions, setRegions] = useState<MangaRegionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<MangaRegionData | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isReordering, setIsReordering] = useState(false);

  // Run manga detection pipeline whenever active screenshot changes
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    const targetId = screenshot?.id ?? 'demo_manga_page';
    const targetW = screenshot?.width && screenshot.width > 0 ? screenshot.width : 1080;
    const targetH = screenshot?.height && screenshot.height > 0 ? screenshot.height : 1920;

    mangaDetectionService
      .detectMangaLayout({
        screenshotId: targetId,
        imageWidth: targetW,
        imageHeight: targetH,
        rawText: screenshot?.notes ?? undefined,
        readingDirection: readingDir,
      })
      .then((res) => {
        if (isCurrent) {
          setRegions(res.regions);
          setReadingDir(res.readingDirection);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Manga detection failed:', err);
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [screenshot]);

  const handlePickManga = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const result = await pickSingleScreenshot('Manga');
    if (!result.canceled && result.screenshot) {
      setScreenshot(result.screenshot);
      setSelectedRegion(null);
    }
  };

  const handleModeSwitch = (newMode: 'original' | 'translated') => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setMode(newMode);
  };

  // Change reading direction (RTL -> LTR -> TTB)
  const handleChangeDirection = async (newDir: ReadingDirection) => {
    if (newDir === readingDir) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    setReadingDir(newDir);
    setLoading(true);

    const targetId = screenshot?.id ?? 'demo_manga_page';
    try {
      const updated = await mangaDetectionService.changeReadingDirection(targetId, newDir);
      setRegions(updated);
    } catch (err) {
      console.warn('Failed to change reading direction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual Reorder: Move bubble up in reading sequence
  const handleMoveBubble = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= regions.length) return;

    try {
      Haptics.selectionAsync();
    } catch (_) {}

    const newRegions = [...regions];
    const temp = newRegions[index]!;
    newRegions[index] = newRegions[targetIndex]!;
    newRegions[targetIndex] = temp;

    // Re-assign reading orders 1-based
    const orderedIds = newRegions.map((r) => r.id);
    setRegions(
      newRegions.map((r, idx) => ({
        ...r,
        reading_order: idx + 1,
      }))
    );

    const targetId = screenshot?.id ?? 'demo_manga_page';
    try {
      const reordered = await mangaDetectionService.reorderMangaRegions(targetId, orderedIds);
      setRegions(reordered);
    } catch (err) {
      console.warn('Failed to save manual reorder:', err);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const bubbleCount = regions.filter((r) => r.region_type === 'bubble').length;
  const narrationCount = regions.filter((r) => r.region_type === 'narration').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Manga Mode</Text>
          <Text style={styles.headerSub}>Contextual Dialogue Translation</Text>
        </View>
        <TouchableOpacity onPress={handlePickManga} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Reading Direction Selector Bar */}
      <View style={styles.directionBar}>
        <View style={styles.dirSegmentContainer}>
          <TouchableOpacity
            style={[styles.dirBtn, readingDir === 'rtl' && styles.dirBtnActive]}
            onPress={() => handleChangeDirection('rtl')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dirBtnText, readingDir === 'rtl' && styles.dirBtnTextActive]}>
              RTL (Manga 🇯🇵)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dirBtn, readingDir === 'ltr' && styles.dirBtnActive]}
            onPress={() => handleChangeDirection('ltr')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dirBtnText, readingDir === 'ltr' && styles.dirBtnTextActive]}>
              LTR (Comic 🇺🇸)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dirBtn, readingDir === 'ttb' && styles.dirBtnActive]}
            onPress={() => handleChangeDirection('ttb')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dirBtnText, readingDir === 'ttb' && styles.dirBtnTextActive]}>
              TTB (Webtoon 🇰🇷)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detection Stats & Reorder Button */}
      <View style={styles.statsBanner}>
        <View style={styles.statsLeft}>
          <Ionicons name="scan-outline" size={16} color={Colors.info} />
          <Text style={styles.statsText}>
            {regions.length} regions ({bubbleCount} bubbles, {narrationCount} narration)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.reorderTriggerBtn}
          onPress={() => setIsReordering(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.info} />
          <Text style={styles.reorderTriggerText}>Reorder</Text>
        </TouchableOpacity>
      </View>

      {/* 3 Render Modes Selector: Replace | Glass | Floating */}
      <View style={styles.renderModeBar}>
        <View style={styles.renderModeContainer}>
          {(['replace', 'glass', 'floating'] as const).map((rMode) => {
            const isActive = renderMode === rMode;
            const label =
              rMode === 'replace'
                ? 'Replace 🪄'
                : rMode === 'glass'
                ? 'Glass 🪟'
                : 'Floating 💬';
            return (
              <TouchableOpacity
                key={rMode}
                style={[styles.renderModeBtn, isActive && styles.renderModeBtnActive]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (_) {}
                  setRenderMode(rMode);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.renderModeBtnText,
                    isActive && styles.renderModeBtnTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Manga Canvas Viewer Container */}
      <View style={styles.canvasContainer} onLayout={handleLayout}>
        <View style={styles.canvasFrame}>
          {screenshot?.image_uri ? (
            <Image
              source={{ uri: screenshot.image_uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            // Standalone Demo Canvas Background
            <View style={styles.demoPageBg}>
              <View style={styles.demoPanelTop}>
                <Text style={styles.demoWatermark}>PANEL 1</Text>
              </View>
              <View style={styles.demoPanelBottom}>
                <Text style={styles.demoWatermark}>PANEL 2</Text>
              </View>
            </View>
          )}

          {/* Skia Vector & Inpainting Overlay */}
          {containerSize.width > 0 && containerSize.height > 0 && (
            <MangaSkiaOverlay
              regions={regions}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              imageWidth={screenshot?.width || 1080}
              imageHeight={screenshot?.height || 1920}
              mode={mode}
              renderMode={renderMode}
              selectedRegionId={selectedRegion?.id}
              onSelectRegion={(reg) => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (_) {}
                setSelectedRegion(reg);
              }}
            />
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing reading order & context...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Selected Bubble Details Inspector */}
      {selectedRegion && (
        <View style={styles.inspectorCard}>
          <View style={styles.inspectorHeader}>
            <View style={styles.inspectorBadgeRow}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>#{selectedRegion.reading_order}</Text>
              </View>
              <Text style={styles.inspectorTitle}>
                {selectedRegion.region_type === 'bubble' ? 'Speech Bubble' : 'Narration Box'}
              </Text>
              <Text style={styles.confidenceText}>
                {Math.round(selectedRegion.confidence * 100)}% match
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedRegion(null)}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.textCompareRow}>
            <View style={styles.textBlock}>
              <Text style={styles.textBlockLabel}>Original</Text>
              <Text style={styles.originalSnippet}>{selectedRegion.original_text || '—'}</Text>
            </View>
            <View style={styles.textBlockDivider} />
            <View style={styles.textBlock}>
              <Text style={styles.textBlockLabel}>Contextual Translation</Text>
              <Text style={styles.translatedSnippet}>{selectedRegion.translated_text || '—'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Mode Switcher Controls */}
      <View style={styles.controlsBar}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'original' && styles.toggleBtnActive]}
            onPress={() => handleModeSwitch('original')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={16}
              color={mode === 'original' ? Colors.textPrimary : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.toggleText, mode === 'original' && styles.toggleTextActive]}
            >
              Original (JP)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'translated' && styles.toggleBtnActive]}
            onPress={() => handleModeSwitch('translated')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={mode === 'translated' ? Colors.textPrimary : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.toggleText, mode === 'translated' && styles.toggleTextActive]}
            >
              Translated (ID)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Reorder Modal */}
      <Modal
        visible={isReordering}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReordering(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Reading Order</Text>
                <Text style={styles.modalSub}>
                  Adjust dialogue sequence for contextual translation
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsReordering(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {regions.map((item, idx) => (
                <View key={item.id} style={styles.reorderRow}>
                  <View style={styles.reorderBadge}>
                    <Text style={styles.reorderBadgeText}>#{item.reading_order}</Text>
                  </View>
                  <View style={styles.reorderInfo}>
                    <Text style={styles.reorderOriginal} numberOfLines={1}>
                      {item.original_text}
                    </Text>
                    <Text style={styles.reorderTranslated} numberOfLines={1}>
                      {item.translated_text}
                    </Text>
                  </View>
                  <View style={styles.reorderActionCol}>
                    <TouchableOpacity
                      disabled={idx === 0}
                      onPress={() => handleMoveBubble(idx, 'up')}
                      style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={idx === 0 ? Colors.borderStrong : Colors.textPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={idx === regions.length - 1}
                      onPress={() => handleMoveBubble(idx, 'down')}
                      style={[
                        styles.arrowBtn,
                        idx === regions.length - 1 && styles.arrowBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={idx === regions.length - 1 ? Colors.borderStrong : Colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <PrimaryButton
              label="Done Reordering"
              onPress={() => setIsReordering(false)}
              style={styles.modalDoneBtn}
            />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  directionBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  dirSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirBtnActive: {
    backgroundColor: Colors.info,
  },
  dirBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dirBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  renderModeBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  renderModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  renderModeBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renderModeBtnActive: {
    backgroundColor: Colors.primary,
  },
  renderModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  renderModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  statsText: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reorderTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  reorderTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.info,
  },
  canvasContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  canvasFrame: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoPageBg: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  demoPanelTop: {
    flex: 1.2,
    borderWidth: 1.5,
    borderColor: '#2C2B29',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  demoPanelBottom: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2C2B29',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  demoWatermark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D5CEC5',
    letterSpacing: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  inspectorCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs + 2,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  orderBadge: {
    backgroundColor: Colors.info,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  orderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  inspectorTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  confidenceText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  textCompareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  textBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  originalSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  translatedSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.info,
    fontWeight: '700',
  },
  textBlockDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  controlsBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.xl,
    maxHeight: '80%',
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalList: {
    maxHeight: 320,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  reorderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  reorderInfo: {
    flex: 1,
    gap: 2,
  },
  reorderOriginal: {
    fontSize: Typography.size.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reorderTranslated: {
    fontSize: Typography.size.xs,
    color: Colors.info,
    fontStyle: 'italic',
  },
  reorderActionCol: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  modalDoneBtn: {
    marginTop: Spacing.sm,
  },
});
