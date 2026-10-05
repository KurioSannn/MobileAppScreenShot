import { getDatabase } from '../client';
import { ReminderRow, ReminderStatus } from '../../types';

export interface CreateReminderInput {
  id: string;
  screenshot_id?: string | null;
  title: string;
  scheduled_at: number;
  remind_before_minutes?: number;
  status?: ReminderStatus;
  notification_id?: string | null;
  created_at?: number;
}

export const reminderRepository = {
  /**
   * Creates a new local reminder.
   */
  async createReminder(input: CreateReminderInput): Promise<ReminderRow> {
    const db = await getDatabase();
    const created_at = input.created_at ?? Date.now();
    const screenshot_id = input.screenshot_id ?? null;
    const remind_before_minutes = input.remind_before_minutes ?? 15;
    const status = input.status ?? 'pending';
    const notification_id = input.notification_id ?? null;

    await db.runAsync(
      `INSERT INTO reminders (id, screenshot_id, title, scheduled_at, remind_before_minutes, status, notification_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        screenshot_id,
        input.title,
        input.scheduled_at,
        remind_before_minutes,
        status,
        notification_id,
        created_at,
      ]
    );

    return {
      id: input.id,
      screenshot_id,
      title: input.title,
      scheduled_at: input.scheduled_at,
      remind_before_minutes,
      status,
      notification_id,
      created_at,
    };
  },

  /**
   * Retrieves reminders, optionally filtered by status.
   */
  async getReminders(status?: ReminderStatus): Promise<ReminderRow[]> {
    const db = await getDatabase();
    if (status) {
      const rows = await db.getAllAsync<ReminderRow>(
        'SELECT * FROM reminders WHERE status = ? ORDER BY scheduled_at ASC',
        [status]
      );
      return rows;
    }
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders ORDER BY scheduled_at ASC'
    );
    return rows;
  },

  /**
   * Retrieves a reminder by ID.
   */
  async getReminderById(id: string): Promise<ReminderRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE id = ?',
      [id]
    );
    return row ?? null;
  },

  /**
   * Retrieves reminders linked to a specific screenshot.
   */
  async getRemindersByScreenshotId(screenshotId: string): Promise<ReminderRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE screenshot_id = ? ORDER BY scheduled_at ASC',
      [screenshotId]
    );
    return rows;
  },

  /**
   * Updates reminder status ('pending' | 'completed' | 'dismissed').
   */
  async updateReminderStatus(id: string, status: ReminderStatus): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE reminders SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.changes > 0;
  },

  /**
   * Deletes a reminder.
   */
  async deleteReminder(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
    return result.changes > 0;
  },
};
