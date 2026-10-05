import { getDatabase } from '../client';
import { ScreenshotRow, ScreenshotCategory, ScreenshotWithDetails } from '../../types';

export interface CreateScreenshotInput {
  id: string;
  image_uri: string;
  width?: number;
  height?: number;
  created_at?: number;
  source_app?: string | null;
  category?: ScreenshotCategory;
  notes?: string | null;
}

export const screenshotRepository = {
  /**
   * Inserts a new screenshot record into the database.
   */
  async createScreenshot(input: CreateScreenshotInput): Promise<ScreenshotRow> {
    const db = await getDatabase();
    const created_at = input.created_at ?? Date.now();
    const width = input.width ?? 0;
    const height = input.height ?? 0;
    const source_app = input.source_app ?? null;
    const category = input.category ?? 'Other';
    const notes = input.notes ?? null;

    await db.runAsync(
      `INSERT INTO screenshots (id, image_uri, width, height, created_at, source_app, category, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.image_uri, width, height, created_at, source_app, category, notes]
    );

    return {
      id: input.id,
      image_uri: input.image_uri,
      width,
      height,
      created_at,
      source_app,
      category,
      notes,
    };
  },

  /**
   * Retrieves a screenshot by ID.
   */
  async getScreenshotById(id: string): Promise<ScreenshotRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ScreenshotRow>(
      'SELECT * FROM screenshots WHERE id = ?',
      [id]
    );
    return row ?? null;
  },

  /**
   * Retrieves recent screenshots ordered by created_at DESC.
   */
  async getRecentScreenshots(limit = 20, offset = 0): Promise<ScreenshotRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ScreenshotRow>(
      'SELECT * FROM screenshots ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  },

  /**
   * Retrieves screenshots filtered by category.
   */
  async getScreenshotsByCategory(
    category: ScreenshotCategory,
    limit = 20,
    offset = 0
  ): Promise<ScreenshotRow[]> {
    const db = await getDatabase();
    if (category === 'All') {
      return this.getRecentScreenshots(limit, offset);
    }
    const rows = await db.getAllAsync<ScreenshotRow>(
      'SELECT * FROM screenshots WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [category, limit, offset]
    );
    return rows;
  },

  /**
   * Performs full-text keyword search across OCR results, translations, notes, and tags.
   */
  async searchScreenshots(query: string, limit = 50): Promise<ScreenshotWithDetails[]> {
    const db = await getDatabase();
    const term = `%${query.trim()}%`;

    const sql = `
      SELECT DISTINCT
        s.id,
        s.image_uri,
        s.width,
        s.height,
        s.created_at,
        s.source_app,
        s.category,
        s.notes,
        ocr.text AS ocr_text,
        ocr.language AS language,
        tr.translated_text AS translated_text
      FROM screenshots s
      LEFT JOIN ocr_results ocr ON s.id = ocr.screenshot_id
      LEFT JOIN translations tr ON s.id = tr.screenshot_id
      LEFT JOIN tags tg ON s.id = tg.screenshot_id
      WHERE ocr.text LIKE ?
         OR tr.translated_text LIKE ?
         OR s.notes LIKE ?
         OR s.category LIKE ?
         OR tg.name LIKE ?
      ORDER BY s.created_at DESC
      LIMIT ?
    `;

    const rows = await db.getAllAsync<ScreenshotWithDetails>(sql, [
      term,
      term,
      term,
      term,
      term,
      limit,
    ]);

    return rows;
  },

  /**
   * Updates screenshot category.
   */
  async updateCategory(id: string, category: ScreenshotCategory): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE screenshots SET category = ? WHERE id = ?',
      [category, id]
    );
    return result.changes > 0;
  },

  /**
   * Deletes a screenshot and cascades deletions of associated OCR, translations, entities, and tags.
   */
  async deleteScreenshot(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM screenshots WHERE id = ?', [id]);
    return result.changes > 0;
  },

  /**
   * Returns the total count of saved screenshots.
   */
  async countScreenshots(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM screenshots'
    );
    return row?.count ?? 0;
  },

  /**
   * Deletes all screenshots from storage.
   */
  async clearAllScreenshots(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM screenshots');
  },
};
