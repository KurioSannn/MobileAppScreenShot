import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { MangaRegionData } from '../../services/manga';
import { MangaRenderMode } from '../../types';
import { Colors, Radius, Typography } from '../../theme/tokens';

export interface MangaSkiaOverlayProps {
  regions: MangaRegionData[];
  containerWidth: number;
  containerHeight: number;
  imageWidth?: number;
  imageHeight?: number;
  mode: 'original' | 'translated';
  renderMode?: MangaRenderMode;
  selectedRegionId?: string | null;
  onSelectRegion?: (region: MangaRegionData) => void;
}

/**
 * Calculates readable adaptive font size so translated text fits neatly inside bubble
 * without harsh clipping, while never dropping below minSize (9pt).
 */
export function calculateAdaptiveFontSize(
  text: string,
  boxWidth: number,
  boxHeight: number,
  minSize = 9,
  maxSize = 16
): number {
  if (!text || boxWidth <= 0 || boxHeight <= 0) return 11;

  const charCount = text.length;
  for (let size = maxSize; size >= minSize; size--) {
    const charWidth = size * 0.58;
    const lineHeight = size * 1.25;
    const charsPerLine = Math.max(1, Math.floor((boxWidth - 12) / charWidth));
    const linesNeeded = Math.ceil(charCount / charsPerLine);
    const totalHeightNeeded = linesNeeded * lineHeight;

    if (totalHeightNeeded <= boxHeight - 6) {
      return size;
    }
  }

  return minSize;
}

export const MangaSkiaOverlay: React.FC<MangaSkiaOverlayProps> = ({
  regions,
  containerWidth,
  containerHeight,
  imageWidth = 1080,
  imageHeight = 1920,
  mode,
  renderMode = 'replace',
  selectedRegionId,
  onSelectRegion,
}) => {
  if (regions.length === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  // Calculate scaling ratio from raw image coordinates to current container
  const scaleX = containerWidth / Math.max(1, imageWidth);
  const scaleY = containerHeight / Math.max(1, imageHeight);

  // Build Skia vector path from polygon vertices
  const buildSkiaPath = (polygon: Array<[number, number]>) => {
    if (!polygon || polygon.length === 0) return null;
    try {
      const path = Skia.Path.Make();
      const first = polygon[0];
      if (!first) return null;

      path.moveTo(first[0] * scaleX, first[1] * scaleY);
      for (let i = 1; i < polygon.length; i++) {
        const pt = polygon[i];
        if (pt) {
          path.lineTo(pt[0] * scaleX, pt[1] * scaleY);
        }
      }
      path.close();
      return path;
    } catch (_) {
      return null;
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { width: containerWidth, height: containerHeight }]}>
      {/* Skia Canvas Rendering Layer for Polygons, Inpainting & Borders */}
      <Canvas style={StyleSheet.absoluteFill}>
        {regions.map((region) => {
          const path = buildSkiaPath(region.polygon);
          if (!path) return null;

          const isSelected = selectedRegionId === region.id;
          const isNarration = region.region_type === 'narration';

          // Effective render mode: low-confidence fallback uses 'floating' so artwork is never covered
          const effectiveRenderMode: MangaRenderMode =
            region.confidence < 0.9 && renderMode === 'replace' ? 'floating' : renderMode;

          // 1. Text Replace Mode: Solid clean inpainting fill
          if (effectiveRenderMode === 'replace') {
            const fillColor = isNarration
              ? 'rgba(255, 252, 235, 0.98)' // Warm parchment for narration
              : 'rgba(255, 255, 255, 0.98)'; // Clean white inpainting for dialogue
            const strokeColor = isSelected ? '#F5B031' : isNarration ? '#8C7A58' : '#2C2B29';

            return (
              <React.Fragment key={region.id}>
                <Path path={path} color={fillColor} style="fill" />
                <Path
                  path={path}
                  color={strokeColor}
                  style="stroke"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              </React.Fragment>
            );
          }

          // 2. Frosted Glass Mode: Semi-transparent blur overlay
          if (effectiveRenderMode === 'glass') {
            const glassFill = 'rgba(255, 255, 255, 0.52)';
            const glassStroke = isSelected ? '#F5B031' : 'rgba(255, 255, 255, 0.85)';

            return (
              <React.Fragment key={region.id}>
                <Path path={path} color={glassFill} style="fill" />
                <Path
                  path={path}
                  color={glassStroke}
                  style="stroke"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              </React.Fragment>
            );
          }

          // 3. Floating Subtitle Mode: Transparent path with subtle active border if selected
          if (isSelected) {
            return (
              <Path
                key={region.id}
                path={path}
                color="#F5B031"
                style="stroke"
                strokeWidth={2}
              />
            );
          }

          return null;
        })}
      </Canvas>

      {/* Interactive Text & Reading Order Overlays */}
      {regions.map((region) => {
        const isSelected = selectedRegionId === region.id;
        const boxX = region.box.x * scaleX;
        const boxY = region.box.y * scaleY;
        const boxW = Math.max(44, region.box.width * scaleX);
        const boxH = Math.max(32, region.box.height * scaleY);

        const displayedText =
          mode === 'translated'
            ? region.translated_text || region.original_text || ''
            : region.original_text || '';

        // Dynamic auto-scaling font size
        const fontSize = calculateAdaptiveFontSize(displayedText, boxW, boxH, 9, 15);
        const lineHeight = Math.round(fontSize * 1.25);

        // Effective render mode (low confidence defaults to floating)
        const effectiveRenderMode: MangaRenderMode =
          region.confidence < 0.9 && renderMode === 'replace' ? 'floating' : renderMode;

        return (
          <TouchableOpacity
            key={`touch_${region.id}`}
            activeOpacity={0.8}
            onPress={() => onSelectRegion?.(region)}
            style={[
              styles.touchBubble,
              {
                left: boxX,
                top: boxY,
                width: boxW,
                height: boxH,
              },
            ]}
          >
            {/* Reading Order Badge (Top-Right corner of each bubble) */}
            <View
              style={[
                styles.orderBadge,
                isSelected && styles.orderBadgeSelected,
                region.region_type === 'narration' && styles.orderBadgeNarration,
              ]}
            >
              <Text style={styles.orderNumber}>{region.reading_order}</Text>
            </View>

            {/* Bubble Typeset Text with Adaptive Font Sizing */}
            <View style={styles.textContainer}>
              {effectiveRenderMode === 'floating' ? (
                <View style={styles.floatingSubtitlePill}>
                  <Text
                    style={[
                      styles.floatingSubtitleText,
                      { fontSize, lineHeight },
                      mode === 'original' && styles.originalJapaneseText,
                    ]}
                    numberOfLines={4}
                  >
                    {displayedText}
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.bubbleText,
                    { fontSize, lineHeight },
                    region.region_type === 'narration' && styles.narrationText,
                    mode === 'original' && styles.originalJapaneseText,
                    effectiveRenderMode === 'glass' && styles.glassText,
                  ]}
                  numberOfLines={5}
                >
                  {displayedText}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  touchBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  orderBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    backgroundColor: '#6847B8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  orderBadgeSelected: {
    backgroundColor: '#F5B031',
  },
  orderBadgeNarration: {
    backgroundColor: '#4A5568',
  },
  orderNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  bubbleText: {
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
  },
  narrationText: {
    fontStyle: 'italic',
    color: '#2A2926',
  },
  glassText: {
    color: '#111111',
    fontWeight: '800',
  },
  originalJapaneseText: {
    fontFamily: 'System',
    fontWeight: '600',
    color: '#111111',
  },
  floatingSubtitlePill: {
    backgroundColor: 'rgba(28, 28, 30, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  floatingSubtitleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
