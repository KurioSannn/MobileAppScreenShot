import * as Notifications from 'expo-notifications';
import { reminderRepository } from '../../db';
import { ReminderRow, ReminderStatus } from '../../types';

// Configure notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (_) {
  // Safe fallback if running outside native Expo environment
}

export interface ScheduleReminderInput {
  screenshotId?: string | null;
  title: string;
  scheduledAt: number; // Unix timestamp in ms
  remindBeforeMinutes?: number; // 0, 15, 30, 60, etc.
}

export interface ParsedDateTime {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  timestamp: number;
}

/**
 * Parses date and time from OCR text snippets or defaults to next day 09:00 AM.
 */
export function parseDateTimeFromText(text: string): ParsedDateTime {
  const now = new Date();
  let targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
  targetDate.setHours(9, 0, 0, 0);

  const clean = text.trim();

  let hours = 9;
  let minutes = 0;
  let hasTime = false;

  // 1. Time pattern: HH:mm (e.g. 17:00, 09:30, 23:59)
  const timeMatch = /(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/i.exec(clean);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]!, 10);
    minutes = parseInt(timeMatch[2]!, 10);
    const meridiem = timeMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    hasTime = true;
  }

  // 2. Day-of-week pattern: Friday, Jumat, etc.
  const dayPatterns: Record<string, number> = {
    sunday: 0,
    minggu: 0,
    monday: 1,
    senin: 1,
    tuesday: 2,
    selasa: 2,
    wednesday: 3,
    rabu: 3,
    thursday: 4,
    kamis: 4,
    friday: 5,
    jumat: 5,
    saturday: 6,
    sabtu: 6,
  };

  const lower = clean.toLowerCase();
  for (const [dayName, dayIndex] of Object.entries(dayPatterns)) {
    if (lower.includes(dayName)) {
      const currentDay = now.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7; // next week's occurrence
      targetDate = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
      break;
    }
  }

  targetDate.setHours(hasTime ? hours : 9, hasTime ? minutes : 0, 0, 0);

  // 3. Explicit numeric date pattern: DD/MM/YYYY or YYYY-MM-DD
  const numericDateMatch = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(clean);
  if (numericDateMatch) {
    const day = parseInt(numericDateMatch[1]!, 10);
    const month = parseInt(numericDateMatch[2]!, 10) - 1;
    let year = parseInt(numericDateMatch[3]!, 10);
    if (year < 100) year += 2000;

    targetDate.setFullYear(year, month, day);
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const hh = String(targetDate.getHours()).padStart(2, '0');
  const min = String(targetDate.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`,
    timestamp: targetDate.getTime(),
  };
}

export const reminderService = {
  /**
   * Requests local notification permissions if not already granted.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return true;
      const request = await Notifications.requestPermissionsAsync();
      return request.status === 'granted';
    } catch (_) {
      return false;
    }
  },

  /**
   * Schedules a local notification and stores the reminder in SQLite.
   */
  async scheduleReminder(input: ScheduleReminderInput): Promise<ReminderRow> {
    const now = Date.now();
    const reminderId = `rem_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const remindBefore = input.remindBeforeMinutes ?? 15;
    const triggerTimestamp = input.scheduledAt - remindBefore * 60 * 1000;

    let notificationId: string | null = null;

    try {
      const hasPermission = await this.requestPermissions();
      if (hasPermission && triggerTimestamp > now) {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Snaply Reminder',
            body: input.title,
            data: { screenshotId: input.screenshotId, reminderId },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTimestamp,
          },
        });
      }
    } catch (err) {
      // In simulator or unlinked env, simulate notification ID
      notificationId = `notif_sim_${now}`;
    }

    // Persist reminder to SQLite database
    const row = await reminderRepository.createReminder({
      id: reminderId,
      screenshot_id: input.screenshotId ?? null,
      title: input.title,
      scheduled_at: input.scheduledAt,
      remind_before_minutes: remindBefore,
      status: 'pending',
      notification_id: notificationId,
      created_at: now,
    });

    return row;
  },

  /**
   * Retrieves all reminders linked to a screenshot.
   */
  async getRemindersForScreenshot(screenshotId: string): Promise<ReminderRow[]> {
    return reminderRepository.getRemindersByScreenshotId(screenshotId);
  },

  /**
   * Cancels a scheduled reminder notification and removes from SQLite.
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    const existing = await reminderRepository.getReminderById(reminderId);
    if (existing && existing.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.notification_id);
      } catch (_) {}
    }
    return reminderRepository.deleteReminder(reminderId);
  },

  /**
   * Updates reminder completion status in SQLite.
   */
  async updateStatus(reminderId: string, status: ReminderStatus): Promise<boolean> {
    return reminderRepository.updateReminderStatus(reminderId, status);
  },
};
