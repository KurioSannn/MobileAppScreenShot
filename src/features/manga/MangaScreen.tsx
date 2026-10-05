import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  LayoutChangeEvent,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PrimaryButton, SecondaryButton } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { MangaRenderMode, ReadingDirection, ScreenshotRow } from '../../types';
import { mangaDetectionService, MangaRegionData } from '../../services/manga';
import { translationService } from '../../services/translation';
import { screenshotRepository } from '../../db';
import { pickSingleScreenshot } from '../../utils';
import { BubbleStyleOverride, MangaSkiaOverlay } from './MangaSkiaOverlay';
import { MangaBatchModal } from './MangaBatchModal';

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

  // Task 18: Reader & Editing UX States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenChrome, setShowFullscreenChrome] = useState(true);
  const [bubbleOverrides, setBubbleOverrides] = useState<Record<string, BubbleStyleOverride>>({});
  const [pageScreenshots, setPageScreenshots] = useState<ScreenshotRow[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Task 19: Batch Manga Processing
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);

  // Edit Translation & Translate Again States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [isTranslatingAgain, setIsTranslatingAgain] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Load surrounding manga screenshots for multi-page reading
  useEffect(() => {
    let isCurrent = true;
    screenshotRepository
      .getScreenshotsByCategory('Manga')
      .then((items) => {
        if (!isCurrent) return;
        if (items.length > 0) {
          setPageScreenshots(items);
          const currentIdx = screenshot ? items.findIndex((s) => s.id === screenshot.id) : 0;
          setCurrentPageIndex(currentIdx >= 0 ? currentIdx : 0);
          if (!screenshot && items[0]) {
            setScreenshot(items[0]);
          }
        } else if (screenshot) {
          setPageScreenshots([screenshot]);
          setCurrentPageIndex(0);
        }
      })
      .catch((err) => {
        console.warn('Failed to load manga pages:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [initialScreenshot]);

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
      setPageScreenshots((prev) => [result.screenshot!, ...prev]);
      setCurrentPageIndex(0);
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

  // Multi-page navigation (Previous / Next)
  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      try {
        Haptics.selectionAsync();
      } catch (_) {}
      const newIdx = currentPageIndex - 1;
      setCurrentPageIndex(newIdx);
      const target = pageScreenshots[newIdx];
      if (target) {
        setScreenshot(target);
        setSelectedRegion(null);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pageScreenshots.length - 1) {
      try {
        Haptics.selectionAsync();
      } catch (_) {}
      const newIdx = currentPageIndex + 1;
      setCurrentPageIndex(newIdx);
      const target = pageScreenshots[newIdx];
      if (target) {
        setScreenshot(target);
        setSelectedRegion(null);
      }
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

  // Floating Editor Toolbar Controls
  const currentOverride = selectedRegion ? bubbleOverrides[selectedRegion.id] ?? {} : {};
  const currentDelta = currentOverride.fontSizeDelta ?? 0;
  const currentAlign = currentOverride.textAlign ?? 'center';
  const currentOpacity = currentOverride.opacity ?? 1.0;

  const handleAdjustFontSize = (deltaChange: number) => {
    if (!selectedRegion) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setBubbleOverrides((prev) => {
      const existing = prev[selectedRegion.id] ?? {};
      const updatedDelta = Math.max(-4, Math.min(6, (existing.fontSizeDelta ?? 0) + deltaChange));
      return {
        ...prev,
        [selectedRegion.id]: {
          ...existing,
          fontSizeDelta: updatedDelta,
        },
      };
    });
  };

  const handleSetAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedRegion) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setBubbleOverrides((prev) => ({
      ...prev,
      [selectedRegion.id]: {
        ...(prev[selectedRegion.id] ?? {}),
        textAlign: alignment,
      },
    }));
  };

  const handleCycleOpacity = () => {
    if (!selectedRegion) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setBubbleOverrides((prev) => {
      const existing = prev[selectedRegion.id] ?? {};
      const curOp = existing.opacity ?? 1.0;
      // Cycle: 1.0 (Solid) -> 0.70 (Soft) -> 0.40 (Glass) -> 0.0 (Clear) -> 1.0
      const nextOp = curOp > 0.85 ? 0.7 : curOp > 0.55 ? 0.4 : curOp > 0.1 ? 0.0 : 1.0;
      return {
        ...prev,
        [selectedRegion.id]: {
          ...existing,
          opacity: nextOp,
        },
      };
    });
  };

  // Translation Editing & Copy Handlers
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    Clipboard.setString(text);
    showToast(`${label} copied!`);
  };

  const handleOpenEditModal = () => {
    if (!selectedRegion) return;
    setEditingText(selectedRegion.translated_text || selectedRegion.original_text || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEditedTranslation = async () => {
    if (!selectedRegion) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    const newText = editingText.trim();
    const regionId = selectedRegion.id;
    await mangaDetectionService.updateRegionTranslation(regionId, newText);

    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, translated_text: newText } : r))
    );
    setSelectedRegion((prev) =>
      prev?.id === regionId ? { ...prev, translated_text: newText } : prev
    );
    setIsEditModalVisible(false);
    showToast('Translation updated');
  };

  const handleTranslateAgain = async () => {
    if (!selectedRegion) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsTranslatingAgain(true);
      const source = selectedRegion.original_text || '';
      const res = await translationService.translateText(
        selectedRegion.screenshot_id || screenshot?.id || 'demo_manga_page',
        source,
        'Indonesian',
        true
      );
      await mangaDetectionService.updateRegionTranslation(selectedRegion.id, res.translatedText);
      setRegions((prev) =>
        prev.map((r) =>
          r.id === selectedRegion.id ? { ...r, translated_text: res.translatedText } : r
        )
      );
      setSelectedRegion((prev) =>
        prev?.id === selectedRegion.id ? { ...prev, translated_text: res.translatedText } : prev
      );
      showToast('Re-translated with context');
    } catch (err) {
      console.warn('Translate again error:', err);
    } finally {
      setIsTranslatingAgain(false);
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
  const totalPages = Math.max(1, pageScreenshots.length);

  return (
    <SafeAreaView style={[styles.safeArea, isFullscreen && styles.safeAreaFullscreen]}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Top Header - Hidden in Fullscreen Mode */}
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Manga Reader</Text>
            <Text style={styles.headerSub}>
              Page {currentPageIndex + 1} of {totalPages} • Contextual Mode
            </Text>
          </View>
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (_) {}
                setIsFullscreen(true);
              }}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="expand-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (_) {}
                setIsBatchModalVisible(true);
              }}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="layers-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickManga} style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Top Controls Bars - Hidden in Fullscreen Mode */}
      {!isFullscreen && (
        <>
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

          {/* Multi-page Navigator Header Bar */}
          <View style={styles.pageBar}>
            <TouchableOpacity
              onPress={handlePrevPage}
              disabled={currentPageIndex === 0}
              style={[styles.pageNavBtn, currentPageIndex === 0 && styles.pageNavBtnDisabled]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={currentPageIndex === 0 ? Colors.borderStrong : Colors.textPrimary}
              />
              <Text
                style={[
                  styles.pageNavBtnText,
                  currentPageIndex === 0 && styles.pageNavBtnTextDisabled,
                ]}
              >
                Prev Page
              </Text>
            </TouchableOpacity>

            <View style={styles.pageIndicatorPill}>
              <Text style={styles.pageIndicatorText}>
                Page {currentPageIndex + 1} / {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              style={[
                styles.pageNavBtn,
                currentPageIndex >= totalPages - 1 && styles.pageNavBtnDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pageNavBtnText,
                  currentPageIndex >= totalPages - 1 && styles.pageNavBtnTextDisabled,
                ]}
              >
                Next Page
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={currentPageIndex >= totalPages - 1 ? Colors.borderStrong : Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Manga Canvas Viewer Container */}
      <View
        style={[styles.canvasContainer, isFullscreen && styles.canvasContainerFullscreen]}
        onLayout={handleLayout}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (isFullscreen) {
              setShowFullscreenChrome((prev) => !prev);
            }
          }}
          style={styles.canvasFrame}
        >
          {screenshot?.image_uri ? (
            <Image
              source={{ uri: screenshot.image_uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
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

          {/* Skia Vector & Inpainting Overlay with Bubble Custom Overrides */}
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
              bubbleStyleOverrides={bubbleOverrides}
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
        </TouchableOpacity>
      </View>

      {/* Selected Bubble Floating Editor Toolbar & Bottom Sheet */}
      {selectedRegion && (
        <View style={styles.inspectorCard}>
          {/* Floating Editor Controls Toolbar */}
          <View style={styles.floatingEditorBar}>
            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupLabel}>Size</Text>
              <TouchableOpacity
                onPress={() => handleAdjustFontSize(-1)}
                style={styles.editorMiniBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.editorMiniBtnText}>A-</Text>
              </TouchableOpacity>
              <View style={styles.editorDeltaBadge}>
                <Text style={styles.editorDeltaText}>
                  {currentDelta >= 0 ? `+${currentDelta}` : currentDelta}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleAdjustFontSize(1)}
                style={styles.editorMiniBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.editorMiniBtnText}>A+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editorDivider} />

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupLabel}>Align</Text>
              {(['left', 'center', 'right'] as const).map((aln) => {
                const isCurrent = currentAlign === aln;
                const iconName =
                  aln === 'left'
                    ? 'reorder-two-outline'
                    : aln === 'center'
                    ? 'reorder-three-outline'
                    : 'reorder-four-outline';
                return (
                  <TouchableOpacity
                    key={aln}
                    onPress={() => handleSetAlignment(aln)}
                    style={[styles.editorMiniBtn, isCurrent && styles.editorMiniBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={iconName}
                      size={15}
                      color={isCurrent ? '#FFFFFF' : Colors.textPrimary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.editorDivider} />

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupLabel}>Opacity</Text>
              <TouchableOpacity
                onPress={handleCycleOpacity}
                style={styles.editorOpacityBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="contrast-outline" size={14} color={Colors.primary} />
                <Text style={styles.editorOpacityText}>
                  {Math.round(currentOpacity * 100)}%
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editorDivider} />

            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={styles.editorEditPencilBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bubble Detail Header */}
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
              <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Text Compare & Copy Block */}
          <View style={styles.textCompareRow}>
            <View style={styles.textBlock}>
              <View style={styles.textBlockHeader}>
                <Text style={styles.textBlockLabel}>Original (JP)</Text>
                <TouchableOpacity
                  onPress={() => handleCopy(selectedRegion.original_text || '', 'Original')}
                  style={styles.copySmallBtn}
                >
                  <Ionicons name="copy-outline" size={13} color={Colors.info} />
                  <Text style={styles.copySmallText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.originalSnippet}>{selectedRegion.original_text || '—'}</Text>
            </View>

            <View style={styles.textBlockDivider} />

            <View style={styles.textBlock}>
              <View style={styles.textBlockHeader}>
                <Text style={styles.textBlockLabel}>Translation (ID)</Text>
                <TouchableOpacity
                  onPress={() => handleCopy(selectedRegion.translated_text || '', 'Translation')}
                  style={styles.copySmallBtn}
                >
                  <Ionicons name="copy-outline" size={13} color={Colors.info} />
                  <Text style={styles.copySmallText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.translatedSnippet}>{selectedRegion.translated_text || '—'}</Text>
            </View>
          </View>

          {/* Bottom Action Footer: Edit & Translate Again */}
          <View style={styles.inspectorActionFooter}>
            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={styles.editActionBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
              <Text style={styles.editActionText}>Edit Translation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTranslateAgain}
              disabled={isTranslatingAgain}
              style={styles.retranslateActionBtn}
              activeOpacity={0.8}
            >
              {isTranslatingAgain ? (
                <ActivityIndicator size="small" color={Colors.info} />
              ) : (
                <Ionicons name="refresh-outline" size={16} color={Colors.info} />
              )}
              <Text style={styles.retranslateActionText}>Translate Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Standard Bottom Mode Switcher Controls - When no bubble is inspected */}
      {!selectedRegion && !isFullscreen && (
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
      )}

      {/* Floating Reader Controls Overlay - In Fullscreen Mode */}
      {isFullscreen && showFullscreenChrome && (
        <View style={styles.fullscreenFloatingBar}>
          <TouchableOpacity
            onPress={() => setIsFullscreen(false)}
            style={styles.fsIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="contract-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.fsPageNav}>
            <TouchableOpacity
              onPress={handlePrevPage}
              disabled={currentPageIndex === 0}
              style={[styles.fsArrowBtn, currentPageIndex === 0 && styles.fsArrowBtnDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={currentPageIndex === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text style={styles.fsPageText}>
              {currentPageIndex + 1} / {totalPages}
            </Text>
            <TouchableOpacity
              onPress={handleNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              style={[
                styles.fsArrowBtn,
                currentPageIndex >= totalPages - 1 && styles.fsArrowBtnDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  currentPageIndex >= totalPages - 1 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'
                }
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => handleModeSwitch(mode === 'translated' ? 'original' : 'translated')}
            style={styles.fsModeToggleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.fsModeToggleText}>
              {mode === 'translated' ? 'ID 🪄' : 'JP 🇯🇵'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Translation Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>Edit Dialogue Translation</Text>
                <Text style={styles.editModalSub}>
                  Bubble #{selectedRegion?.reading_order} • Typeset modification
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.originalReferenceBox}>
              <Text style={styles.refLabel}>Original (JP):</Text>
              <Text style={styles.refText}>{selectedRegion?.original_text || '—'}</Text>
            </View>

            <Text style={styles.inputLabel}>Translated Text (Indonesian):</Text>
            <TextInput
              style={styles.editTextInput}
              value={editingText}
              onChangeText={setEditingText}
              multiline
              numberOfLines={4}
              placeholder="Enter edited dialogue translation..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <View style={styles.editModalBtnRow}>
              <SecondaryButton
                label="Cancel"
                onPress={() => setIsEditModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label="Save & Typeset"
                onPress={handleSaveEditedTranslation}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Batch Manga Processing Modal */}
      <MangaBatchModal
        visible={isBatchModalVisible}
        onClose={() => setIsBatchModalVisible(false)}
        initialScreenshots={pageScreenshots}
        onStartReading={(batchPages) => {
          if (batchPages.length > 0) {
            setPageScreenshots(batchPages);
            setCurrentPageIndex(0);
            setScreenshot(batchPages[0] ?? null);
            setSelectedRegion(null);
            showToast(`Loaded ${batchPages.length} manga pages!`);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeAreaFullscreen: {
    backgroundColor: '#121212',
  },
  toastBanner: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 32, 0.94)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontWeight: '600',
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
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
    paddingVertical: 5,
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
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
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
    paddingVertical: 4,
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
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pageNavBtnTextDisabled: {
    color: Colors.textMuted,
  },
  pageIndicatorPill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  pageIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  canvasContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  canvasContainerFullscreen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
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
    fontSize: 11,
    fontWeight: '800',
    color: Colors.borderStrong,
    letterSpacing: 1.2,
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
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inspectorCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    gap: Spacing.xs + 2,
  },
  floatingEditorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  editorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editorGroupLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginRight: 2,
  },
  editorMiniBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editorMiniBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editorMiniBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  editorDeltaBadge: {
    minWidth: 20,
    alignItems: 'center',
  },
  editorDeltaText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  editorDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  editorOpacityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editorOpacityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  editorEditPencilBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  textCompareRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textBlock: {
    flex: 1,
  },
  textBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  textBlockLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  copySmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.info,
  },
  textBlockDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  originalSnippet: {
    fontSize: 11,
    color: Colors.textPrimary,
    lineHeight: 15,
  },
  translatedSnippet: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.info,
    lineHeight: 15,
  },
  inspectorActionFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  editActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  editActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  retranslateActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.infoLight,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  retranslateActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.info,
  },
  controlsBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  fullscreenFloatingBar: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  fsIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsPageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fsArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsArrowBtnDisabled: {
    opacity: 0.3,
  },
  fsPageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fsModeToggleBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  fsModeToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  editModalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editModalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  editModalSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  originalReferenceBox: {
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  refLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  refText: {
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  editTextInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  editModalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
