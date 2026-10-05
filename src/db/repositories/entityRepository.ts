import { getDatabase } from '../client';
import { EntityRow, EntityType } from '../../types';

export interface SaveEntityInput {
  id: string;
  screenshot_id: string;
  entity_type: EntityType;
  value: string;
  confidence?: number;
  suggested_action?: string | null;
  action_data_json?: string | null;
  created_at?: number;
}

export const entityRepository = {
  /**
   * Saves detected entities for a screenshot.
   */
  async saveEntities(entities: SaveEntityInput[]): Promise<void> {
    if (entities.length === 0) return;
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      for (const item of entities) {
        const created_at = item.created_at ?? Date.now();
        const confidence = item.confidence ?? 1.0;
        const suggested_action = item.suggested_action ?? null;
        const action_data_json = item.action_data_json ?? null;

        await db.runAsync(
          `INSERT INTO entities (id, screenshot_id, entity_type, value, confidence, suggested_action, action_data_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.screenshot_id,
            item.entity_type,
            item.value,
            confidence,
            suggested_action,
            action_data_json,
            created_at,
          ]
        );
      }
    });
  },

  /**
   * Retrieves all detected entities for a screenshot.
   */
  async getEntitiesByScreenshotId(screenshotId: string): Promise<EntityRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EntityRow>(
      'SELECT * FROM entities WHERE screenshot_id = ? ORDER BY created_at ASC',
      [screenshotId]
    );
    return rows;
  },

  /**
   * Deletes all entities for a screenshot.
   */
  async deleteEntitiesByScreenshotId(screenshotId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM entities WHERE screenshot_id = ?',
      [screenshotId]
    );
    return result.changes > 0;
  },
};
