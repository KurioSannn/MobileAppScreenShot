import { getDatabase } from '../client';
import {
  ScreenshotRow,
  ScreenshotCategory,
  ScreenshotWithDetails,
  LibraryItem,
} from '../../types';

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
   * Retrieves screenshots formatted for the Library screen, joined with OCR language,
   * text preview, translation status, and reminder count.
   */
  async getLibraryScreenshots(
    category: ScreenshotCategory | 'All' = 'All',
    limit = 50,
    offset = 0
  ): Promise<LibraryItem[]> {
    const db = await getDatabase();
    const isAll = !category || category === 'All';

    const sql = `
      SELECT 
        s.id,
        s.image_uri,
        s.width,
        s.height,
        s.created_at,
        s.source_app,
        s.category,
        s.notes,
        (SELECT ocr.language FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS language,
        (SELECT ocr.text FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS ocr_text,
        (SELECT tr.translated_text FROM translations tr WHERE tr.screenshot_id = s.id LIMIT 1) AS translated_text,
        (SELECT COUNT(*) FROM reminders r WHERE r.screenshot_id = s.id) AS reminder_count
      FROM screenshots s
      ${isAll ? '' : 'WHERE s.category = ?'}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = isAll ? [limit, offset] : [category, limit, offset];
    const rows = await db.getAllAsync<any>(sql, params);

    return rows.map((row) => {
      let status: 'Translated' | 'Analyzed' | 'Pending' = 'Pending';
      if (row.translated_text && row.translated_text.trim().length > 0) {
        status = 'Translated';
      } else if (row.ocr_text && row.ocr_text.trim().length > 0) {
        status = 'Analyzed';
      }

      return {
        id: row.id,
        image_uri: row.image_uri,
        width: row.width,
        height: row.height,
        created_at: row.created_at,
        source_app: row.source_app,
        category: row.category,
        notes: row.notes,
        language: row.language ?? null,
        ocr_text: row.ocr_text ?? null,
        translated_text: row.translated_text ?? null,
        reminder_count: Number(row.reminder_count ?? 0),
        status,
      };
    });
  },

  /**
   * Performs full-text keyword search across OCR results, translations, notes, and tags.
   */
  async searchScreenshots(query: string, limit = 50): Promise<ScreenshotWithDetails[]> {
    const db = await getDatabase();
    const clean = query.trim();
    if (!clean) return [];

    const term = `%${clean}%`;

    const sql = `
      SELECT 
        s.id,
        s.image_uri,
        s.width,
        s.height,
        s.created_at,
        s.source_app,
        s.category,
        s.notes,
        (SELECT ocr.language FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS language,
        (SELECT ocr.text FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS ocr_text,
        (SELECT tr.translated_text FROM translations tr WHERE tr.screenshot_id = s.id LIMIT 1) AS translated_text,
        (SELECT GROUP_CONCAT(tg.name, ', ') FROM tags tg WHERE tg.screenshot_id = s.id) AS matched_tags,
        (SELECT COUNT(*) FROM reminders r WHERE r.screenshot_id = s.id) AS reminder_count
      FROM screenshots s
      WHERE (
        s.id IN (SELECT screenshot_id FROM ocr_results WHERE text LIKE ?)
        OR s.id IN (SELECT screenshot_id FROM translations WHERE translated_text LIKE ?)
        OR s.id IN (SELECT screenshot_id FROM tags WHERE name LIKE ?)
        OR s.category LIKE ?
        OR s.notes LIKE ?
      )
      ORDER BY s.created_at DESC
      LIMIT ?
    `;

    const rows = await db.getAllAsync<any>(sql, [
      term,
      term,
      term,
      term,
      term,
      limit,
    ]);

    return rows.map((row) => {
      const tags = row.matched_tags
        ? row.matched_tags.split(',').map((t: string) => t.trim())
        : [];

      return {
        id: row.id,
        image_uri: row.image_uri,
        width: row.width,
        height: row.height,
        created_at: row.created_at,
        source_app: row.source_app,
        category: row.category,
        notes: row.notes,
        language: row.language ?? null,
        ocr_text: row.ocr_text ?? null,
        translated_text: row.translated_text ?? null,
        tags,
        reminder_count: Number(row.reminder_count ?? 0),
      };
    });
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
    await db.runAsync('DELETE FROM ocr_results WHERE screenshot_id = ?', [id]);
    await db.runAsync('DELETE FROM translations WHERE screenshot_id = ?', [id]);
    await db.runAsync('DELETE FROM entities WHERE screenshot_id = ?', [id]);
    await db.runAsync('DELETE FROM tags WHERE screenshot_id = ?', [id]);
    await db.runAsync('DELETE FROM manga_regions WHERE screenshot_id = ?', [id]);
    await db.runAsync('DELETE FROM manga_pages WHERE screenshot_id = ?', [id]);
    await db.runAsync('UPDATE reminders SET screenshot_id = NULL WHERE screenshot_id = ?', [id]);
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
