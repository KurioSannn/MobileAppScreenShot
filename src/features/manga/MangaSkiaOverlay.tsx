import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Canvas, Path, Paint, Skia } from '@shopify/react-native-skia';
import { MangaRegionData } from '../../services/manga';
import { Colors, Radius, Typography } from '../../theme/tokens';

export interface MangaSkiaOverlayProps {
  regions: MangaRegionData[];
  containerWidth: number;
  containerHeight: number;
  imageWidth?: number;
  imageHeight?: number;
  mode: 'original' | 'translated';
  selectedRegionId?: string | null;
  onSelectRegion?: (region: MangaRegionData) => void;
}

export const MangaSkiaOverlay: React.FC<MangaSkiaOverlayProps> = ({
  regions,
  containerWidth,
  containerHeight,
  imageWidth = 1080,
  imageHeight = 1920,
  mode,
  selectedRegionId,
  onSelectRegion,
}) => {
  if (regions.length === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  // Calculate scale factor from original image dimensions to container
  const scaleX = containerWidth / Math.max(1, imageWidth);
  const scaleY = containerHeight / Math.max(1, imageHeight);

  // Helper to build Skia path from polygon points
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
      {/* Skia Canvas Rendering Layer for Polygons, Fills & Borders */}
      <Canvas style={StyleSheet.absoluteFill}>
        {regions.map((region) => {
          const path = buildSkiaPath(region.polygon);
          if (!path) return null;

          const isSelected = selectedRegionId === region.id;
          const isNarration = region.region_type === 'narration';

          // Bubble background fill color
          const fillColor = isNarration
            ? 'rgba(255, 252, 235, 0.95)' // Warm parchment for narration
            : 'rgba(255, 255, 255, 0.96)'; // Clean white inpainting for dialogue bubble

          // Border stroke color
          const strokeColor = isSelected
            ? '#F5B031' // Amber selection highlight
            : isNarration
            ? '#8C7A58'
            : '#2C2B29'; // Clean comic line ink

          return (
            <React.Fragment key={region.id}>
              {/* Fill / Inpainting Path */}
              <Path path={path} color={fillColor} style="fill" />

              {/* Stroke Border Path */}
              <Path
                path={path}
                color={strokeColor}
                style="stroke"
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
            </React.Fragment>
          );
        })}
      </Canvas>

      {/* Interactive Text & Reading Order Overlays */}
      {regions.map((region) => {
        const isSelected = selectedRegionId === region.id;
        const boxX = region.box.x * scaleX;
        const boxY = region.box.y * scaleY;
        const boxW = Math.max(40, region.box.width * scaleX);
        const boxH = Math.max(30, region.box.height * scaleY);

        const displayedText =
          mode === 'translated'
            ? region.translated_text || region.original_text || ''
            : region.original_text || '';

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

            {/* Bubble Typeset Text */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.bubbleText,
                  region.region_type === 'narration' && styles.narrationText,
                  mode === 'original' && styles.originalJapaneseText,
                ]}
                numberOfLines={4}
              >
                {displayedText}
              </Text>
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
    padding: 4,
  },
  orderBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    backgroundColor: '#6847B8', // Soft Iris purple
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
    backgroundColor: '#F5B031', // Amber when selected
  },
  orderBadgeNarration: {
    backgroundColor: '#4A5568', // Slate for narration
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
    fontSize: 11,
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 14,
  },
  narrationText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#333333',
  },
  originalJapaneseText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
});
