// tests/test-library-screen.mjs
// Verification of Task 13: Screenshot Library & Safe Deletion in SQLite
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: SQLite Schema & Seed for Library Testing ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE screenshots (
    id TEXT PRIMARY KEY NOT NULL,
    image_uri TEXT NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    source_app TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    notes TEXT
  );

  CREATE TABLE ocr_results (
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

  CREATE TABLE translations (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
  );

  CREATE TABLE entities (
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

  CREATE TABLE reminders (
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

  CREATE TABLE tags (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
  );

  CREATE TABLE manga_pages (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    batch_id TEXT,
    page_order INTEGER NOT NULL DEFAULT 1,
    reading_direction TEXT NOT NULL DEFAULT 'rtl',
    status TEXT NOT NULL DEFAULT 'ready',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
  );

  CREATE TABLE manga_regions (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    region_type TEXT NOT NULL DEFAULT 'bubble',
    polygon_json TEXT NOT NULL,
    original_text TEXT,
    translated_text TEXT,
    reading_order INTEGER NOT NULL DEFAULT 1,
    confidence REAL NOT NULL DEFAULT 1.0,
    render_mode TEXT NOT NULL DEFAULT 'replace',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
  );
`);

const now = Date.now();

// Insert mock screenshots
const mockScreenshots = [
  { id: 'sc_manga_1', category: 'Manga', image_uri: 'file:///images/manga_1.jpg', created_at: now - 5000 },
  { id: 'sc_assign_1', category: 'Assignment', image_uri: 'file:///images/hw_1.jpg', created_at: now - 4000 },
  { id: 'sc_chat_1', category: 'Chat', image_uri: 'file:///images/chat_1.png', created_at: now - 3000 },
  { id: 'sc_product_1', category: 'Product', image_uri: 'file:///images/prod_1.webp', created_at: now - 2000 },
  { id: 'sc_receipt_1', category: 'Receipt', image_uri: 'file:///images/receipt_1.png', created_at: now - 1000 },
  { id: 'sc_raw_1', category: 'Other', image_uri: 'file:///images/raw_1.png', created_at: now },
];

for (const sc of mockScreenshots) {
  db.prepare(`
    INSERT INTO screenshots (id, image_uri, width, height, created_at, category)
    VALUES (?, ?, 1080, 2400, ?, ?)
  `).run(sc.id, sc.image_uri, sc.created_at, sc.category);
}

// Add OCR and translation details
db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_1', 'sc_manga_1', 'お前は誰だ？', 'ja', ?)
`).run(now);

db.prepare(`
  INSERT INTO translations (id, screenshot_id, source_language, target_language, original_text, translated_text, created_at)
  VALUES ('tr_1', 'sc_manga_1', 'ja', 'id', 'お前は誰だ？', 'Siapa kamu?', ?)
`).run(now);

db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_2', 'sc_assign_1', 'Calculus Assignment Due Friday 5 PM', 'en', ?)
`).run(now);

db.prepare(`
  INSERT INTO reminders (id, screenshot_id, title, scheduled_at, created_at)
  VALUES ('rem_1', 'sc_assign_1', 'Calculus Deadline', ?, ?)
`).run(now + 86400000, now);

db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_3', 'sc_receipt_1', 'Total Pembayaran: Rp 150.000', 'id', ?)
`).run(now);

console.log('✔ Seeded test database with 6 screenshots and related OCR/Translation/Reminder records');

console.log('\n=== TEST 2: History Query & Details Mapping (getLibraryScreenshots) ===');

function getLibraryScreenshots(category = 'All') {
  const isAll = !category || category === 'All';
  const sql = `
    SELECT 
      s.id,
      s.image_uri,
      s.width,
      s.height,
      s.created_at,
      s.source_app,
      s.category,
      s.notes,
      (SELECT ocr.language FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS language,
      (SELECT ocr.text FROM ocr_results ocr WHERE ocr.screenshot_id = s.id LIMIT 1) AS ocr_text,
      (SELECT tr.translated_text FROM translations tr WHERE tr.screenshot_id = s.id LIMIT 1) AS translated_text,
      (SELECT COUNT(*) FROM reminders r WHERE r.screenshot_id = s.id) AS reminder_count
    FROM screenshots s
    ${isAll ? '' : 'WHERE s.category = ?'}
    ORDER BY s.created_at DESC
  `;

  const rows = isAll ? db.prepare(sql).all() : db.prepare(sql).all(category);

  return rows.map((row) => {
    let status = 'Pending';
    if (row.translated_text && row.translated_text.trim().length > 0) {
      status = 'Translated';
    } else if (row.ocr_text && row.ocr_text.trim().length > 0) {
      status = 'Analyzed';
    }

    return {
      ...row,
      status,
      reminder_count: Number(row.reminder_count ?? 0),
    };
  });
}

const allItems = getLibraryScreenshots('All');
assert.strictEqual(allItems.length, 6, 'Should retrieve all 6 screenshots');

// Check manga item
const mangaItem = allItems.find((i) => i.id === 'sc_manga_1');
assert.ok(mangaItem, 'Manga item found');
assert.strictEqual(mangaItem.category, 'Manga');
assert.strictEqual(mangaItem.language, 'ja');
assert.strictEqual(mangaItem.status, 'Translated');
assert.strictEqual(mangaItem.translated_text, 'Siapa kamu?');
assert.ok(mangaItem.image_uri.includes('manga_1.jpg'));

// Check assignment item
const assignItem = allItems.find((i) => i.id === 'sc_assign_1');
assert.ok(assignItem, 'Assignment item found');
assert.strictEqual(assignItem.language, 'en');
assert.strictEqual(assignItem.status, 'Analyzed');
assert.strictEqual(assignItem.reminder_count, 1);

// Check raw item
const rawItem = allItems.find((i) => i.id === 'sc_raw_1');
assert.ok(rawItem, 'Raw item found');
assert.strictEqual(rawItem.status, 'Pending');
assert.strictEqual(rawItem.language, null);

console.log('✔ All library fields (thumbnail, category, language, status, date) correctly mapped');

console.log('\n=== TEST 3: Category Filtering (All, Manga, Assignment, Chat, Product, Receipt) ===');

const mangaList = getLibraryScreenshots('Manga');
assert.strictEqual(mangaList.length, 1);
assert.strictEqual(mangaList[0].category, 'Manga');

const assignList = getLibraryScreenshots('Assignment');
assert.strictEqual(assignList.length, 1);
assert.strictEqual(assignList[0].category, 'Assignment');

const chatList = getLibraryScreenshots('Chat');
assert.strictEqual(chatList.length, 1);
assert.strictEqual(chatList[0].category, 'Chat');

const productList = getLibraryScreenshots('Product');
assert.strictEqual(productList.length, 1);
assert.strictEqual(productList[0].category, 'Product');

const receiptList = getLibraryScreenshots('Receipt');
assert.strictEqual(receiptList.length, 1);
assert.strictEqual(receiptList[0].category, 'Receipt');

const emptyList = getLibraryScreenshots('Ticket');
assert.strictEqual(emptyList.length, 0);

console.log('✔ Category filtering verified across all supported categories');

console.log('\n=== TEST 4: Screenshot Reopening Payload Integrity ===');

const selectedScreenshot = allItems[0];
assert.ok(selectedScreenshot.id);
assert.ok(selectedScreenshot.image_uri);
assert.ok(selectedScreenshot.created_at);
console.log(`✔ Reopening payload valid for screenshot ID: ${selectedScreenshot.id}`);

console.log('\n=== TEST 5: Cascading Safe Deletion Verification ===');

function deleteScreenshot(id) {
  db.prepare('DELETE FROM ocr_results WHERE screenshot_id = ?').run(id);
  db.prepare('DELETE FROM translations WHERE screenshot_id = ?').run(id);
  db.prepare('DELETE FROM entities WHERE screenshot_id = ?').run(id);
  db.prepare('DELETE FROM tags WHERE screenshot_id = ?').run(id);
  db.prepare('DELETE FROM manga_regions WHERE screenshot_id = ?').run(id);
  db.prepare('DELETE FROM manga_pages WHERE screenshot_id = ?').run(id);
  db.prepare('UPDATE reminders SET screenshot_id = NULL WHERE screenshot_id = ?').run(id);
  const result = db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
  return result.changes > 0;
}

// Delete sc_manga_1
const deletedManga = deleteScreenshot('sc_manga_1');
assert.strictEqual(deletedManga, true);

// Verify screenshot is gone
const checkSc = db.prepare('SELECT * FROM screenshots WHERE id = ?').get('sc_manga_1');
assert.strictEqual(checkSc, undefined);

// Verify OCR and translation cascade deleted
const checkOcr = db.prepare('SELECT * FROM ocr_results WHERE screenshot_id = ?').get('sc_manga_1');
assert.strictEqual(checkOcr, undefined);

const checkTr = db.prepare('SELECT * FROM translations WHERE screenshot_id = ?').get('sc_manga_1');
assert.strictEqual(checkTr, undefined);

// Delete sc_assign_1 (has reminder)
const deletedAssign = deleteScreenshot('sc_assign_1');
assert.strictEqual(deletedAssign, true);

// Verify reminder is preserved but safely unlinked (screenshot_id is null)
const checkRem = db.prepare('SELECT * FROM reminders WHERE id = ?').get('rem_1');
assert.ok(checkRem);
assert.strictEqual(checkRem.screenshot_id, null, 'Reminder screenshot_id set to NULL safely');

// Total count check
const remaining = getLibraryScreenshots('All');
assert.strictEqual(remaining.length, 4, 'Remaining count is 4 after deleting 2');

console.log('✔ Cascading safe deletion verified (child records cleaned up, reminders preserved safely)');

console.log('\n=== ALL TASK 13 LIBRARY TESTS PASSED! ===');
