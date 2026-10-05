import { getDatabase } from '../client';
import { OcrResultRow } from '../../types';

export interface SaveOcrInput {
  id: string;
  screenshot_id: string;
  text: string;
  language?: string | null;
  confidence?: number;
  bounds_json?: string | null;
  created_at?: number;
}

export const ocrRepository = {
  /**
   * Saves or replaces an OCR result for a given screenshot.
   */
  async saveOcrResult(input: SaveOcrInput): Promise<OcrResultRow> {
    const db = await getDatabase();
    const created_at = input.created_at ?? Date.now();
    const language = input.language ?? null;
    const confidence = input.confidence ?? 1.0;
    const bounds_json = input.bounds_json ?? null;

    // Remove existing OCR result for this screenshot if exists
    await db.runAsync('DELETE FROM ocr_results WHERE screenshot_id = ?', [input.screenshot_id]);

    await db.runAsync(
      `INSERT INTO ocr_results (id, screenshot_id, text, language, confidence, bounds_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.screenshot_id, input.text, language, confidence, bounds_json, created_at]
    );

    return {
      id: input.id,
      screenshot_id: input.screenshot_id,
      text: input.text,
      language,
      confidence,
      bounds_json,
      created_at,
    };
  },

  /**
   * Retrieves the OCR result for a screenshot.
   */
  async getOcrResultByScreenshotId(screenshotId: string): Promise<OcrResultRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<OcrResultRow>(
      'SELECT * FROM ocr_results WHERE screenshot_id = ?',
      [screenshotId]
    );
    return row ?? null;
  },

  /**
   * Deletes OCR result for a screenshot.
   */
  async deleteOcrResult(screenshotId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM ocr_results WHERE screenshot_id = ?',
      [screenshotId]
    );
    return result.changes > 0;
  },
};
