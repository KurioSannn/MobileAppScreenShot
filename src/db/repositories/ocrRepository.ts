import { getDatabase } from '../client';
import { OcrResultRow } from '../../types';

export interface SaveOcrInput {
  id: string;
  screenshot_id: string;
  text: string;
  corrected_text?: string | null;
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
    const corrected_text = input.corrected_text ?? null;

    // Check if an existing OCR record has corrected_text to preserve if not specified
    let finalCorrectedText = corrected_text;
    if (finalCorrectedText === null || finalCorrectedText === undefined) {
      const existing = await this.getOcrResultByScreenshotId(input.screenshot_id);
      if (existing && existing.corrected_text) {
        finalCorrectedText = existing.corrected_text;
      }
    }

    // Remove existing OCR result for this screenshot if exists
    await db.runAsync('DELETE FROM ocr_results WHERE screenshot_id = ?', [input.screenshot_id]);

    await db.runAsync(
      `INSERT INTO ocr_results (id, screenshot_id, text, corrected_text, language, confidence, bounds_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.screenshot_id,
        input.text,
        finalCorrectedText,
        language,
        confidence,
        bounds_json,
        created_at,
      ]
    );

    return {
      id: input.id,
      screenshot_id: input.screenshot_id,
      text: input.text,
      corrected_text: finalCorrectedText ?? null,
      language,
      confidence,
      bounds_json,
      created_at,
    };
  },

  /**
   * Updates corrected text for a screenshot OCR result.
   */
  async updateCorrectedText(screenshotId: string, correctedText: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE ocr_results SET corrected_text = ? WHERE screenshot_id = ?',
      [correctedText, screenshotId]
    );
    return result.changes > 0;
  },

  /**
   * Reverts corrected text back to original OCR text (sets corrected_text = NULL).
   */
  async revertCorrectedText(screenshotId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE ocr_results SET corrected_text = NULL WHERE screenshot_id = ?',
      [screenshotId]
    );
    return result.changes > 0;
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
