import { getDatabase } from '../client';
import { TranslationRow } from '../../types';

export interface SaveTranslationInput {
  id: string;
  screenshot_id: string;
  source_language: string;
  target_language: string;
  original_text: string;
  translated_text: string;
  created_at?: number;
}

export const translationRepository = {
  /**
   * Saves a translation record.
   */
  async saveTranslation(input: SaveTranslationInput): Promise<TranslationRow> {
    const db = await getDatabase();
    const created_at = input.created_at ?? Date.now();

    await db.runAsync(
      `INSERT INTO translations (id, screenshot_id, source_language, target_language, original_text, translated_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.screenshot_id,
        input.source_language,
        input.target_language,
        input.original_text,
        input.translated_text,
        created_at,
      ]
    );

    return {
      id: input.id,
      screenshot_id: input.screenshot_id,
      source_language: input.source_language,
      target_language: input.target_language,
      original_text: input.original_text,
      translated_text: input.translated_text,
      created_at,
    };
  },

  /**
   * Retrieves all translations for a given screenshot.
   */
  async getTranslationsByScreenshotId(screenshotId: string): Promise<TranslationRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TranslationRow>(
      'SELECT * FROM translations WHERE screenshot_id = ? ORDER BY created_at DESC',
      [screenshotId]
    );
    return rows;
  },

  /**
   * Retrieves the latest translation for a given screenshot, optionally filtered by targetLanguage.
   */
  async getLatestTranslation(
    screenshotId: string,
    targetLanguage?: string
  ): Promise<TranslationRow | null> {
    const db = await getDatabase();
    if (targetLanguage) {
      const row = await db.getFirstAsync<TranslationRow>(
        'SELECT * FROM translations WHERE screenshot_id = ? AND target_language = ? ORDER BY created_at DESC LIMIT 1',
        [screenshotId, targetLanguage]
      );
      return row ?? null;
    }
    const row = await db.getFirstAsync<TranslationRow>(
      'SELECT * FROM translations WHERE screenshot_id = ? ORDER BY created_at DESC LIMIT 1',
      [screenshotId]
    );
    return row ?? null;
  },

  /**
   * Deletes translations associated with a screenshot.
   */
  async deleteTranslationsByScreenshotId(screenshotId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM translations WHERE screenshot_id = ?',
      [screenshotId]
    );
    return result.changes > 0;
  },
};
