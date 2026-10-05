import { getDatabase } from '../../db/client';

export type MetricEventName =
  | 'screenshot_analyzed'
  | 'translate_completed'
  | 'manga_mode_opened'
  | 'reminder_created'
  | 'search_used'
  | 'batch_used'
  | 'processing_failed'
  | 'processing_duration';

export interface MetricEvent {
  id: string;
  eventName: MetricEventName;
  payload?: Record<string, any>;
  createdAt: number;
}

export class MetricsService {
  private inMemoryQueue: MetricEvent[] = [];

  /**
   * Logs a lightweight, local-only metric event without any external network tracking.
   */
  async logEvent(eventName: MetricEventName, payload?: Record<string, any>): Promise<void> {
    const event: MetricEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      eventName,
      payload,
      createdAt: Date.now(),
    };

    this.inMemoryQueue.push(event);

    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO metrics_events (id, event_name, payload_json, created_at)
         VALUES (?, ?, ?, ?)`,
        [event.id, event.eventName, payload ? JSON.stringify(payload) : null, event.createdAt]
      );
    } catch (_) {
      // In-memory queue remains safe if DB not ready
    }
  }

  /**
   * Retrieves logged events count or entries for local diagnostics.
   */
  async getEventsCount(): Promise<number> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM metrics_events'
      );
      return row?.count ?? this.inMemoryQueue.length;
    } catch (_) {
      return this.inMemoryQueue.length;
    }
  }

  /**
   * Clears all logged metrics.
   */
  async clearMetrics(): Promise<void> {
    this.inMemoryQueue = [];
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM metrics_events');
    } catch (_) {}
  }
}

export const metricsService = new MetricsService();
