// src/features/search/searchUtils.ts
import { ScreenshotWithDetails } from '../../types';

export type MatchType = 'ocr' | 'translation' | 'category' | 'tag' | 'notes';

export interface MatchInfo {
  type: MatchType;
  label: string;
  snippet: string;
}

/**
 * Extracts a substring surrounding the matching keyword for readable search previews.
 */
export function extractMatchSnippet(
  text: string,
  keyword: string,
  maxLength = 110
): string {
  if (!text) return '';
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  const lower = text.toLowerCase();
  const index = lower.indexOf(cleanKeyword);

  if (index === -1) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  const marginBefore = Math.floor(maxLength * 0.35);
  const marginAfter = Math.floor(maxLength * 0.65);

  const start = Math.max(0, index - marginBefore);
  const end = Math.min(text.length, index + cleanKeyword.length + marginAfter);

  let snippet = text.slice(start, end).replace(/\s+/g, ' ');
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;

  return snippet;
}

/**
 * Determines where the query matched in the screenshot record.
 */
export function getMatchInfo(item: ScreenshotWithDetails, query: string): MatchInfo {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    const text = item.translated_text || item.ocr_text || item.notes || '';
    return {
      type: 'ocr',
      label: 'OCR',
      snippet: text.length > 100 ? `${text.slice(0, 100)}...` : text,
    };
  }

  // 1. Check Tags
  if (item.tags && item.tags.some((t) => t.toLowerCase().includes(clean))) {
    const matchingTag = item.tags.find((t) => t.toLowerCase().includes(clean));
    return {
      type: 'tag',
      label: 'Tag',
      snippet: `Tag: #${matchingTag}`,
    };
  }

  // 2. Check Category
  if (item.category && item.category.toLowerCase().includes(clean)) {
    return {
      type: 'category',
      label: 'Category',
      snippet: `Category: ${item.category}`,
    };
  }

  // 3. Check Translated text
  if (item.translated_text && item.translated_text.toLowerCase().includes(clean)) {
    return {
      type: 'translation',
      label: 'Translation',
      snippet: extractMatchSnippet(item.translated_text, clean),
    };
  }

  // 4. Check OCR text
  if (item.ocr_text && item.ocr_text.toLowerCase().includes(clean)) {
    return {
      type: 'ocr',
      label: 'OCR Text',
      snippet: extractMatchSnippet(item.ocr_text, clean),
    };
  }

  // 5. Check Notes
  if (item.notes && item.notes.toLowerCase().includes(clean)) {
    return {
      type: 'notes',
      label: 'Notes',
      snippet: extractMatchSnippet(item.notes, clean),
    };
  }

  // Fallback to text preview
  const fallback = item.translated_text || item.ocr_text || '';
  return {
    type: 'ocr',
    label: 'OCR Text',
    snippet: extractMatchSnippet(fallback, clean),
  };
}
