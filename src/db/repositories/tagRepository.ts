import { getDatabase } from '../client';
import { TagRow } from '../../types';

export const tagRepository = {
  /**
   * Adds a tag to a screenshot.
   */
  async addTag(id: string, screenshotId: string, name: string): Promise<TagRow> {
    const db = await getDatabase();
    const created_at = Date.now();
    const cleanName = name.trim().toLowerCase();

    // Check if tag already exists for this screenshot
    const existing = await db.getFirstAsync<TagRow>(
      'SELECT * FROM tags WHERE screenshot_id = ? AND name = ?',
      [screenshotId, cleanName]
    );

    if (existing) {
      return existing;
    }

    await db.runAsync(
      'INSERT INTO tags (id, screenshot_id, name, created_at) VALUES (?, ?, ?, ?)',
      [id, screenshotId, cleanName, created_at]
    );

    return {
      id,
      screenshot_id: screenshotId,
      name: cleanName,
      created_at,
    };
  },

  /**
   * Retrieves all tags for a screenshot.
   */
  async getTagsByScreenshotId(screenshotId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string }>(
      'SELECT name FROM tags WHERE screenshot_id = ? ORDER BY name ASC',
      [screenshotId]
    );
    return rows.map((r) => r.name);
  },

  /**
   * Removes a tag from a screenshot.
   */
  async removeTag(screenshotId: string, name: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM tags WHERE screenshot_id = ? AND name = ?',
      [screenshotId, name.trim().toLowerCase()]
    );
    return result.changes > 0;
  },

  /**
   * Retrieves all distinct tags across all screenshots.
   */
  async getAllDistinctTags(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string }>(
      'SELECT DISTINCT name FROM tags ORDER BY name ASC'
    );
    return rows.map((r) => r.name);
  },
};
