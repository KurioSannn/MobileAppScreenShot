import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBadge } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { ScreenshotRow } from '../../types';
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
  const [regions, setRegions] = useState<MangaRegionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<MangaRegionData | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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
        readingDirection: 'rtl',
      })
      .then((res) => {
        if (isCurrent) {
          setRegions(res.regions);
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
          <View style={styles.readingDirPill}>
            <Text style={styles.readingDirText}>RTL (Right to Left) 📖</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handlePickManga} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Detection Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statsLeft}>
          <Ionicons name="scan-outline" size={16} color={Colors.info} />
          <Text style={styles.statsText}>
            {regions.length} regions detected ({bubbleCount} bubbles, {narrationCount} narration)
          </Text>
        </View>
        <StatusBadge label="RTL Order" status="info" />
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
              <Text style={styles.loadingText}>Detecting speech bubbles & reading order...</Text>
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
              <Text style={styles.textBlockLabel}>Translated (ID)</Text>
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
    paddingVertical: Spacing.sm,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
  },
  readingDirPill: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
  readingDirText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.info,
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
});
