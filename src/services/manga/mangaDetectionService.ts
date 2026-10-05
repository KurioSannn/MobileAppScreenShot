import { mangaRepository } from '../../db';
import {
  BoundingBox,
  MangaPageRow,
  MangaRegionRow,
  MangaRegionType,
  MangaRenderMode,
  OcrBlock,
  ReadingDirection,
} from '../../types';
import { translationService } from '../translation/translationService';

export interface MangaRegionData extends MangaRegionRow {
  polygon: Array<[number, number]>;
  box: BoundingBox;
}

export interface MangaDetectionInput {
  screenshotId: string;
  imageWidth?: number;
  imageHeight?: number;
  ocrBlocks?: OcrBlock[];
  rawText?: string;
  readingDirection?: ReadingDirection;
  batchId?: string | null;
}

export interface MangaDetectionResult {
  pageId: string;
  screenshotId: string;
  readingDirection: ReadingDirection;
  regions: MangaRegionData[];
  bubbleCount: number;
  narrationCount: number;
  textCount: number;
}

/**
 * Classifies a detected text region into 'bubble', 'narration', or 'text'.
 */
export function classifyMangaRegion(
  text: string,
  box: BoundingBox,
  imageWidth = 1080,
  imageHeight = 1920
): { type: MangaRegionType; confidence: number } {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Narration Box detection
  // Usually placed at margins/corners, has narrative tags, or wide banner shape
  const isTopMargin = box.y < imageHeight * 0.18;
  const isBottomMargin = box.y > imageHeight * 0.82;
  const isWideBanner = box.width > imageWidth * 0.65;
  const hasNarrationMarker =
    lower.startsWith('meanwhile') ||
    lower.startsWith('at that moment') ||
    lower.startsWith('suddenly') ||
    lower.startsWith('chapter') ||
    lower.startsWith('page') ||
    (clean.startsWith('[') && clean.endsWith(']')) ||
    (clean.startsWith('(') && clean.endsWith(')'));

  if (hasNarrationMarker || (isWideBanner && (isTopMargin || isBottomMargin))) {
    return {
      type: 'narration',
      confidence: 0.94,
    };
  }

  // 2. Speech Bubble detection
  // Speech dialogue characters, Japanese quotes, or rounder aspect ratio
  const hasDialogueQuotes =
    clean.includes('「') ||
    clean.includes('」') ||
    clean.includes('『') ||
    clean.includes('』') ||
    clean.includes('"') ||
    clean.includes('“') ||
    clean.includes('”');
  const hasPunctuation =
    clean.includes('!') ||
    clean.includes('?') ||
    clean.includes('…') ||
    clean.includes('?!') ||
    clean.includes('!?');

  const aspectRatio = box.width / Math.max(1, box.height);
  const isBalloonShape = aspectRatio >= 0.4 && aspectRatio <= 2.2;

  if (hasDialogueQuotes || hasPunctuation || isBalloonShape) {
    return {
      type: 'bubble',
      confidence: hasDialogueQuotes ? 0.98 : 0.93,
    };
  }

  // 3. Fallback to generic text region
  return {
    type: 'text',
    confidence: 0.88,
  };
}

/**
 * Generates polygon coordinates for Skia overlay.
 * Speech bubbles get an 8-point rounded oval balloon polygon.
 * Narration boxes get a sharp 4-point rectangle polygon.
 */
export function generateRegionPolygon(
  box: BoundingBox,
  type: MangaRegionType
): Array<[number, number]> {
  const { x, y, width: w, height: h } = box;

  if (type === 'narration') {
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
  }

  if (type === 'bubble') {
    // 8-point rounded balloon polygon
    const rx = Math.min(w * 0.25, 24);
    const ry = Math.min(h * 0.25, 24);

    return [
      [x + rx, y],
      [x + w - rx, y],
      [x + w, y + ry],
      [x + w, y + h - ry],
      [x + w - rx, y + h],
      [x + rx, y + h],
      [x, y + h - ry],
      [x, y + ry],
    ];
  }

  // Fallback 4-point rectangle for raw text
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/**
 * Calculates standard manga reading order: Top-to-Bottom, Right-to-Left (RTL).
 * Western comic mode supports Left-to-Right (LTR).
 */
export function calculateMangaReadingOrder<T extends { box: BoundingBox }>(
  items: T[],
  direction: ReadingDirection = 'rtl',
  rowThreshold = 140
): (T & { reading_order: number })[] {
  if (items.length === 0) return [];

  // 1. Sort primarily by vertical Y position
  const sorted = [...items].sort((a, b) => a.box.y - b.box.y);

  // 2. Group into vertical panel bands / rows
  const rows: T[][] = [];
  let currentRow: T[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]!;
    const prevInRow = currentRow[0]!;
    const isSameBand = Math.abs(item.box.y - prevInRow.box.y) < rowThreshold;

    if (isSameBand) {
      currentRow.push(item);
    } else {
      rows.push(currentRow);
      currentRow = [item];
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // 3. Inside each row, sort according to reading direction:
  // RTL: rightmost (largest x) first -> (b.box.x - a.box.x)
  // LTR: leftmost (smallest x) first -> (a.box.x - b.box.x)
  let orderIndex = 1;
  const result: (T & { reading_order: number })[] = [];

  for (const row of rows) {
    row.sort((a, b) => {
      if (direction === 'rtl') {
        return b.box.x - a.box.x; // Right to left
      }
      return a.box.x - b.box.x;   // Left to right
    });

    for (const item of row) {
      result.push({
        ...item,
        reading_order: orderIndex++,
      });
    }
  }

  return result;
}

export const mangaDetectionService = {
  /**
   * Main pipeline to detect speech bubbles, narration boxes, calculate RTL reading order,
   * translate bubble dialogues, and save everything into SQLite.
   */
  async detectMangaLayout(input: MangaDetectionInput): Promise<MangaDetectionResult> {
    const now = Date.now();
    const readingDir = input.readingDirection ?? 'rtl';
    const imgWidth = input.imageWidth ?? 1080;
    const imgHeight = input.imageHeight ?? 1920;

    // Check if regions already exist in SQLite
    const existing = await mangaRepository.getMangaRegionsByScreenshotId(input.screenshotId);
    if (existing.length > 0) {
      const parsed: MangaRegionData[] = existing.map((r) => {
        let polygon: Array<[number, number]> = [];
        let box: BoundingBox = { x: 0, y: 0, width: 0, height: 0 };
        try {
          polygon = JSON.parse(r.polygon_json);
          if (polygon.length > 0) {
            const xs = polygon.map((p) => p[0]);
            const ys = polygon.map((p) => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          }
        } catch (_) {}

        return {
          ...r,
          polygon,
          box,
        };
      });

      const bubbleCount = parsed.filter((r) => r.region_type === 'bubble').length;
      const narrationCount = parsed.filter((r) => r.region_type === 'narration').length;
      const textCount = parsed.filter((r) => r.region_type === 'text').length;

      return {
        pageId: `mpage_${input.screenshotId}`,
        screenshotId: input.screenshotId,
        readingDirection: readingDir,
        regions: parsed,
        bubbleCount,
        narrationCount,
        textCount,
      };
    }

    // Prepare candidate regions from OCR blocks or heuristics
    let candidates: Array<{
      id: string;
      box: BoundingBox;
      text: string;
      type: MangaRegionType;
      confidence: number;
    }> = [];

    if (input.ocrBlocks && input.ocrBlocks.length > 0) {
      candidates = input.ocrBlocks.map((block, idx) => {
        const { type, confidence } = classifyMangaRegion(block.text, block.box, imgWidth, imgHeight);
        return {
          id: `mreg_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          box: block.box,
          text: block.text,
          type,
          confidence,
        };
      });
    } else if (input.rawText && input.rawText.trim().length > 0) {
      // Split raw text lines into mock bubbles
      const lines = input.rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const count = Math.max(1, lines.length);
      const stepY = (imgHeight * 0.7) / count;

      candidates = lines.map((line, idx) => {
        const box: BoundingBox = {
          x: idx % 2 === 0 ? imgWidth * 0.55 : imgWidth * 0.15,
          y: imgHeight * 0.15 + idx * stepY,
          width: imgWidth * 0.35,
          height: 90,
        };
        const { type, confidence } = classifyMangaRegion(line, box, imgWidth, imgHeight);

        return {
          id: `mreg_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          box,
          text: line,
          type,
          confidence,
        };
      });
    } else {
      // Default heuristic Japanese manga layout for demo/testing
      const defaultBubbles = [
        {
          text: 'お前は誰だ？',
          box: { x: imgWidth * 0.58, y: imgHeight * 0.12, width: 280, height: 120 },
        },
        {
          text: '…友達だ。',
          box: { x: imgWidth * 0.12, y: imgHeight * 0.16, width: 260, height: 110 },
        },
        {
          text: '[その時、街の明かりが消えた]',
          box: { x: imgWidth * 0.15, y: imgHeight * 0.78, width: 720, height: 80 },
        },
      ];

      candidates = defaultBubbles.map((item, idx) => {
        const { type, confidence } = classifyMangaRegion(item.text, item.box, imgWidth, imgHeight);
        return {
          id: `mreg_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          box: item.box,
          text: item.text,
          type,
          confidence,
        };
      });
    }

    // Calculate RTL reading order
    const orderedCandidates = calculateMangaReadingOrder(candidates, readingDir);

    // Build final region models with polygon geometry and translated text
    const finalRegions: MangaRegionData[] = [];
    for (const item of orderedCandidates) {
      const polygon = generateRegionPolygon(item.box, item.type);

      // Translate bubble text
      let translatedText: string | null = null;
      try {
        const tr = await translationService.translateText(
          input.screenshotId,
          item.text,
          'Indonesian'
        );
        translatedText = tr.translatedText;
      } catch (_) {
        translatedText = item.text;
      }

      finalRegions.push({
        id: item.id,
        screenshot_id: input.screenshotId,
        region_type: item.type,
        polygon_json: JSON.stringify(polygon),
        original_text: item.text,
        translated_text: translatedText,
        reading_order: item.reading_order,
        confidence: item.confidence,
        render_mode: 'replace',
        created_at: now,
        polygon,
        box: item.box,
      });
    }

    // Persist Manga Page and Regions to SQLite
    const pageId = `mpage_${input.screenshotId}`;
    await mangaRepository.saveMangaPage({
      id: pageId,
      screenshot_id: input.screenshotId,
      batch_id: input.batchId ?? null,
      page_order: 1,
      reading_direction: readingDir,
      status: 'done',
      created_at: now,
    });

    await mangaRepository.saveMangaRegions(
      input.screenshotId,
      finalRegions.map((r) => ({
        id: r.id,
        screenshot_id: r.screenshot_id,
        region_type: r.region_type,
        polygon_json: r.polygon_json,
        original_text: r.original_text,
        translated_text: r.translated_text,
        reading_order: r.reading_order,
        confidence: r.confidence,
        render_mode: r.render_mode,
        created_at: r.created_at,
      }))
    );

    const bubbleCount = finalRegions.filter((r) => r.region_type === 'bubble').length;
    const narrationCount = finalRegions.filter((r) => r.region_type === 'narration').length;
    const textCount = finalRegions.filter((r) => r.region_type === 'text').length;

    return {
      pageId,
      screenshotId: input.screenshotId,
      readingDirection: readingDir,
      regions: finalRegions,
      bubbleCount,
      narrationCount,
      textCount,
    };
  },
};
