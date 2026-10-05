import { getDatabase } from '../client';
import { MangaPageRow, MangaRegionRow, ReadingDirection, MangaPageStatus } from '../../types';

export interface SaveMangaPageInput {
  id: string;
  screenshot_id: string;
  batch_id?: string | null;
  page_order?: number;
  reading_direction?: ReadingDirection;
  status?: MangaPageStatus;
  created_at?: number;
}

export interface SaveMangaRegionInput {
  id: string;
  screenshot_id: string;
  region_type?: 'bubble' | 'narration' | 'text';
  polygon_json: string;
  original_text?: string | null;
  translated_text?: string | null;
  reading_order?: number;
  confidence?: number;
  render_mode?: 'replace' | 'glass' | 'floating';
  created_at?: number;
}

export const mangaRepository = {
  /**
   * Saves or updates a manga page record.
   */
  async saveMangaPage(input: SaveMangaPageInput): Promise<MangaPageRow> {
    const db = await getDatabase();
    const created_at = input.created_at ?? Date.now();
    const batch_id = input.batch_id ?? null;
    const page_order = input.page_order ?? 0;
    const reading_direction = input.reading_direction ?? 'rtl';
    const status = input.status ?? 'ready';

    await db.runAsync(
      `INSERT INTO manga_pages (id, screenshot_id, batch_id, page_order, reading_direction, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.screenshot_id, batch_id, page_order, reading_direction, status, created_at]
    );

    return {
      id: input.id,
      screenshot_id: input.screenshot_id,
      batch_id,
      page_order,
      reading_direction,
      status,
      created_at,
    };
  },

  /**
   * Retrieves manga pages by batch ID.
   */
  async getMangaPagesByBatch(batchId: string): Promise<MangaPageRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MangaPageRow>(
      'SELECT * FROM manga_pages WHERE batch_id = ? ORDER BY page_order ASC',
      [batchId]
    );
    return rows;
  },

  /**
   * Saves multiple detected manga regions (speech bubbles / text areas).
   */
  async saveMangaRegions(screenshotId: string, regions: SaveMangaRegionInput[]): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // Clear old regions for this screenshot first
      await db.runAsync('DELETE FROM manga_regions WHERE screenshot_id = ?', [screenshotId]);

      for (const r of regions) {
        const created_at = r.created_at ?? Date.now();
        const region_type = r.region_type ?? 'bubble';
        const original_text = r.original_text ?? null;
        const translated_text = r.translated_text ?? null;
        const reading_order = r.reading_order ?? 0;
        const confidence = r.confidence ?? 1.0;
        const render_mode = r.render_mode ?? 'replace';

        await db.runAsync(
          `INSERT INTO manga_regions (id, screenshot_id, region_type, polygon_json, original_text, translated_text, reading_order, confidence, render_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            screenshotId,
            region_type,
            r.polygon_json,
            original_text,
            translated_text,
            reading_order,
            confidence,
            render_mode,
            created_at,
          ]
        );
      }
    });
  },

  /**
   * Retrieves all manga regions for a screenshot, ordered by reading_order ASC.
   */
  async getMangaRegionsByScreenshotId(screenshotId: string): Promise<MangaRegionRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MangaRegionRow>(
      'SELECT * FROM manga_regions WHERE screenshot_id = ? ORDER BY reading_order ASC',
      [screenshotId]
    );
    return rows;
  },

  /**
   * Updates translation text for a specific bubble/region.
   */
  async updateRegionTranslation(id: string, translatedText: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE manga_regions SET translated_text = ? WHERE id = ?',
      [translatedText, id]
    );
    return result.changes > 0;
  },
};
