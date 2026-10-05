// Snaply SQLite Schema & Migrations

export interface Migration {
  name: string;
  sql: string;
}

export const INITIAL_MIGRATION_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at INTEGER NOT NULL
);

-- 1. screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY NOT NULL,
  image_uri TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  source_app TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_screenshots_created_at ON screenshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_category ON screenshots(category);

-- 2. ocr_results table
CREATE TABLE IF NOT EXISTS ocr_results (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  text TEXT NOT NULL,
  corrected_text TEXT,
  language TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  bounds_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_screenshot ON ocr_results(screenshot_id);

-- 3. translations table
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_translations_screenshot ON translations(screenshot_id);

-- 4. entities table
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  suggested_action TEXT,
  action_data_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entities_screenshot ON entities(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

-- 5. reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT,
  title TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  remind_before_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'pending',
  notification_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

-- 6. tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_screenshot ON tags(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 7. manga_pages table
CREATE TABLE IF NOT EXISTS manga_pages (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  batch_id TEXT,
  page_order INTEGER NOT NULL DEFAULT 0,
  reading_direction TEXT NOT NULL DEFAULT 'rtl',
  status TEXT NOT NULL DEFAULT 'ready',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_manga_pages_batch ON manga_pages(batch_id);

-- 8. manga_regions table
CREATE TABLE IF NOT EXISTS manga_regions (
  id TEXT PRIMARY KEY NOT NULL,
  screenshot_id TEXT NOT NULL,
  region_type TEXT NOT NULL DEFAULT 'bubble',
  polygon_json TEXT NOT NULL,
  original_text TEXT,
  translated_text TEXT,
  reading_order INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 1.0,
  render_mode TEXT NOT NULL DEFAULT 'replace',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_manga_regions_screenshot ON manga_regions(screenshot_id);

-- 9. settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const MIGRATIONS: Migration[] = [
  {
    name: '001_initial_schema',
    sql: INITIAL_MIGRATION_SQL,
  },
];
