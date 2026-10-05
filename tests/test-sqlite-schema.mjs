import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Extract INITIAL_MIGRATION_SQL from src/db/schema.ts
const schemaFile = fs.readFileSync(
  path.resolve('./src/db/schema.ts'),
  'utf-8'
);

const match = schemaFile.match(/export const INITIAL_MIGRATION_SQL = `([\s\S]*?)`;/);
if (!match) {
  console.error('Failed to extract INITIAL_MIGRATION_SQL from src/db/schema.ts');
  process.exit(1);
}

const sql = match[1];

console.log('=== TEST 1: Initial Migration & Idempotency ===');
const db = new DatabaseSync(':memory:');

// Execute migration first time
db.exec(sql);
console.log('✔ Migration executed successfully');

// Execute migration second time (must be idempotent - no error on IF NOT EXISTS)
db.exec(sql);
console.log('✔ Migration is idempotent (second run succeeded without errors)');

console.log('\n=== TEST 2: Verify All 9 Required Tables Exist ===');
const expectedTables = [
  '_migrations',
  'screenshots',
  'ocr_results',
  'translations',
  'entities',
  'reminders',
  'tags',
  'manga_pages',
  'manga_regions',
  'settings',
];

const tablesQuery = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
const existingTables = new Set(tablesQuery.all().map((r) => r.name));

for (const t of expectedTables) {
  if (!existingTables.has(t)) {
    console.error(`✖ Missing required table: ${t}`);
    process.exit(1);
  }
  console.log(`✔ Table "${t}" exists`);
}

console.log('\n=== TEST 3: Screenshot CRUD & Foreign Key Cascades ===');
const insertScreenshot = db.prepare(`
  INSERT INTO screenshots (id, image_uri, width, height, created_at, source_app, category, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = Date.now();
insertScreenshot.run('sc_1', 'file:///data/screenshots/1.jpg', 1080, 2400, now, 'Instagram', 'Manga', 'Test screenshot');
console.log('✔ Inserted screenshot sc_1');

const getScreenshot = db.prepare('SELECT * FROM screenshots WHERE id = ?');
const sc1 = getScreenshot.get('sc_1');
if (!sc1 || sc1.id !== 'sc_1' || sc1.category !== 'Manga') {
  console.error('✖ Failed to retrieve screenshot sc_1');
  process.exit(1);
}
console.log('✔ Retrieved screenshot sc_1:', sc1.id, sc1.category);

// Insert related OCR, translation, tag, and entity
db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, confidence, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('ocr_1', 'sc_1', 'This is deadline text', 'en', 0.98, now);

db.prepare(`
  INSERT INTO translations (id, screenshot_id, source_language, target_language, original_text, translated_text, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('tr_1', 'sc_1', 'en', 'id', 'This is deadline text', 'Ini adalah teks tenggat waktu', now);

db.prepare(`
  INSERT INTO entities (id, screenshot_id, entity_type, value, confidence, suggested_action, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('ent_1', 'sc_1', 'date', '2026-10-12', 0.95, 'reminder', now);

db.prepare(`
  INSERT INTO tags (id, screenshot_id, name, created_at)
  VALUES (?, ?, ?, ?)
`).run('tag_1', 'sc_1', 'school', now);

console.log('✔ Inserted related ocr_results, translations, entities, and tags');

// Test Full-Text Search Query
const searchStmt = db.prepare(`
  SELECT DISTINCT s.id, s.category, ocr.text AS ocr_text, tr.translated_text
  FROM screenshots s
  LEFT JOIN ocr_results ocr ON s.id = ocr.screenshot_id
  LEFT JOIN translations tr ON s.id = tr.screenshot_id
  WHERE ocr.text LIKE ? OR tr.translated_text LIKE ?
`);

const searchResults = searchStmt.all('%deadline%', '%deadline%');
if (searchResults.length !== 1 || searchResults[0].id !== 'sc_1') {
  console.error('✖ Full-text search failed');
  process.exit(1);
}
console.log('✔ Full-text search found matching screenshot by keyword "deadline"');

// Test Foreign Key Cascade Delete
db.prepare('DELETE FROM screenshots WHERE id = ?').run('sc_1');
console.log('✔ Deleted screenshot sc_1');

const remainingOcr = db.prepare('SELECT * FROM ocr_results WHERE screenshot_id = ?').all('sc_1');
const remainingTr = db.prepare('SELECT * FROM translations WHERE screenshot_id = ?').all('sc_1');
const remainingEnt = db.prepare('SELECT * FROM entities WHERE screenshot_id = ?').all('sc_1');
const remainingTag = db.prepare('SELECT * FROM tags WHERE screenshot_id = ?').all('sc_1');

if (remainingOcr.length > 0 || remainingTr.length > 0 || remainingEnt.length > 0 || remainingTag.length > 0) {
  console.error('✖ Cascade delete failed: orphaned records found!');
  process.exit(1);
}
console.log('✔ Foreign key cascade successfully removed all related child records on delete');

console.log('\n=== TEST 4: Settings Key-Value Storage ===');
const setSetting = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

setSetting.run('fast_mode', 'true', now);
setSetting.run('local_ocr_only', 'true', now);

const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const fastModeVal = getSetting.get('fast_mode');
if (fastModeVal.value !== 'true') {
  console.error('✖ Settings get failed');
  process.exit(1);
}
console.log('✔ Setting saved and retrieved: fast_mode =', fastModeVal.value);

// Update setting
setSetting.run('fast_mode', 'false', now + 1000);
const fastModeUpdated = getSetting.get('fast_mode');
if (fastModeUpdated.value !== 'false') {
  console.error('✖ Settings update failed');
  process.exit(1);
}
console.log('✔ Setting updated: fast_mode =', fastModeUpdated.value);

console.log('\n=== ALL TASK 04 DATABASE TESTS PASSED! ===');
