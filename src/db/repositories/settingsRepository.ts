import { getDatabase } from '../client';
import { SettingRow } from '../../types';

export const settingsRepository = {
  /**
   * Retrieves a setting by key.
   */
  async getSetting(key: string, defaultValue: string | null = null): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT * FROM settings WHERE key = ?',
      [key]
    );
    return row ? row.value : defaultValue;
  },

  /**
   * Retrieves a boolean setting by key.
   */
  async getBooleanSetting(key: string, defaultValue = false): Promise<boolean> {
    const val = await this.getSetting(key);
    if (val === null) return defaultValue;
    return val === 'true' || val === '1';
  },

  /**
   * Sets or updates a setting key-value pair.
   */
  async setSetting(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    const updated_at = Date.now();

    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, updated_at]
    );
  },

  /**
   * Sets a boolean setting.
   */
  async setBooleanSetting(key: string, value: boolean): Promise<void> {
    await this.setSetting(key, value ? 'true' : 'false');
  },

  /**
   * Retrieves all settings as a key-value record.
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  },
};
