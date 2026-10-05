// Snaply Core Domain & Database Types

export type AppRoute = 'home' | 'analyze' | 'manga' | 'library' | 'search' | 'settings';

export type BottomTabType = 'home' | 'library' | 'search' | 'settings';

export type ScreenshotCategory =
  | 'All'
  | 'Manga'
  | 'Assignment'
  | 'Receipt'
  | 'Chat'
  | 'Product'
  | 'Ticket'
  | 'Other';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotRow {
  id: string;
  image_uri: string;
  width: number;
  height: number;
  created_at: number;
  source_app: string | null;
  category: ScreenshotCategory;
  notes: string | null;
}

export interface OcrBlock {
  id: string;
  text: string;
  box: BoundingBox;
}

export interface OcrResultRow {
  id: string;
  screenshot_id: string;
  text: string;
  corrected_text: string | null;
  language: string | null;
  confidence: number;
  bounds_json: string | null;
  created_at: number;
}

export interface TranslationRow {
  id: string;
  screenshot_id: string;
  source_language: string;
  target_language: string;
  original_text: string;
  translated_text: string;
  created_at: number;
}

export type EntityType =
  | 'date'
  | 'time'
  | 'url'
  | 'price'
  | 'tracking_number'
  | 'phone'
  | 'manga_pattern'
  | 'other';

export interface EntityRow {
  id: string;
  screenshot_id: string;
  entity_type: EntityType;
  value: string;
  confidence: number;
  suggested_action: string | null;
  action_data_json: string | null;
  created_at: number;
}

export type ReminderStatus = 'pending' | 'completed' | 'dismissed';

export interface ReminderRow {
  id: string;
  screenshot_id: string | null;
  title: string;
  scheduled_at: number;
  remind_before_minutes: number;
  status: ReminderStatus;
  notification_id: string | null;
  created_at: number;
}

export interface TagRow {
  id: string;
  screenshot_id: string;
  name: string;
  created_at: number;
}

export type MangaPageStatus = 'ready' | 'processing' | 'done' | 'failed';
export type ReadingDirection = 'rtl' | 'ltr' | 'ttb';

export interface MangaPageRow {
  id: string;
  screenshot_id: string;
  batch_id: string | null;
  page_order: number;
  reading_direction: ReadingDirection;
  status: MangaPageStatus;
  created_at: number;
}

export type MangaRegionType = 'bubble' | 'narration' | 'text';
export type MangaRenderMode = 'replace' | 'glass' | 'floating';

export interface MangaRegionRow {
  id: string;
  screenshot_id: string;
  region_type: MangaRegionType;
  polygon_json: string;
  original_text: string | null;
  translated_text: string | null;
  reading_order: number;
  confidence: number;
  render_mode: MangaRenderMode;
  created_at: number;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: number;
}

// Joined representation for UI display in Library / Search
export interface ScreenshotWithDetails extends ScreenshotRow {
  ocr_text?: string | null;
  language?: string | null;
  translated_text?: string | null;
  tags?: string[];
  reminder_count?: number;
}
