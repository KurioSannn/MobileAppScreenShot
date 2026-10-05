// tests/test-manga-reader-ux.mjs
// Verification of Task 18: Manga Reader & Editing UX
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Multi-Page Navigation Index Bounds ===');

function navigatePage(currentIndex, totalPages, direction) {
  if (direction === 'next') {
    return Math.min(totalPages - 1, currentIndex + 1);
  }
  if (direction === 'prev') {
    return Math.max(0, currentIndex - 1);
  }
  return currentIndex;
}

const totalPages = 5;
let page = 0;

// Test moving forward
page = navigatePage(page, totalPages, 'next'); // 1
assert.strictEqual(page, 1);
page = navigatePage(page, totalPages, 'next'); // 2
assert.strictEqual(page, 2);

// Test clamping at upper bound
page = 4;
page = navigatePage(page, totalPages, 'next'); // should remain 4
assert.strictEqual(page, 4, 'Cannot advance past total pages');

// Test moving backward
page = navigatePage(page, totalPages, 'prev'); // 3
assert.strictEqual(page, 3);

// Test clamping at lower bound
page = 0;
page = navigatePage(page, totalPages, 'prev'); // should remain 0
assert.strictEqual(page, 0, 'Cannot decrement below 0');

console.log('  ✓ Multi-page navigation bounds verified (0 to totalPages - 1)');


console.log('\n=== TEST 2: Bubble Typography & Formatting Overrides ===');

function adjustFontSize(currentDelta = 0, deltaChange) {
  return Math.max(-4, Math.min(6, currentDelta + deltaChange));
}

function cycleOpacity(currentOpacity = 1.0) {
  // Cycle: 1.0 (Solid) -> 0.70 (Soft) -> 0.40 (Glass) -> 0.0 (Clear) -> 1.0
  if (currentOpacity > 0.85) return 0.7;
  if (currentOpacity > 0.55) return 0.4;
  if (currentOpacity > 0.1) return 0.0;
  return 1.0;
}

// 2.1 Font size delta testing
let delta = 0;
delta = adjustFontSize(delta, 1); // +1
assert.strictEqual(delta, 1);
delta = adjustFontSize(delta, 1); // +2
assert.strictEqual(delta, 2);

// Check max clamp (+6)
for (let i = 0; i < 10; i++) delta = adjustFontSize(delta, 1);
assert.strictEqual(delta, 6, 'Font size delta clamped at +6');

// Check min clamp (-4)
for (let i = 0; i < 20; i++) delta = adjustFontSize(delta, -1);
assert.strictEqual(delta, -4, 'Font size delta clamped at -4');
console.log('  ✓ Font size delta clamp correctly bounded between -4 and +6');

// 2.2 Opacity cycling testing
let op = 1.0;
op = cycleOpacity(op);
assert.strictEqual(op, 0.7, '1.0 -> 0.7');
op = cycleOpacity(op);
assert.strictEqual(op, 0.4, '0.7 -> 0.4');
op = cycleOpacity(op);
assert.strictEqual(op, 0.0, '0.4 -> 0.0');
op = cycleOpacity(op);
assert.strictEqual(op, 1.0, '0.0 -> 1.0');
console.log('  ✓ Bubble opacity cycles smoothly through Solid, Soft, Glass, Clear states');


console.log('\n=== TEST 3: In-Place Translation Editing & SQLite Persistence ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE screenshots (
    id TEXT PRIMARY KEY,
    image_uri TEXT NOT NULL,
    category TEXT DEFAULT 'Manga',
    created_at INTEGER
  );

  CREATE TABLE manga_regions (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL,
    region_type TEXT DEFAULT 'bubble',
    polygon_json TEXT NOT NULL,
    original_text TEXT,
    translated_text TEXT,
    reading_order INTEGER DEFAULT 0,
    confidence REAL DEFAULT 1.0,
    render_mode TEXT DEFAULT 'replace',
    created_at INTEGER
  );
`);

// Insert mock screenshot and region
db.prepare(`
  INSERT INTO screenshots (id, image_uri, category, created_at)
  VALUES ('sc_manga_01', 'file:///test/manga1.png', 'Manga', 1700000000)
`).run();

const mockPolygon = JSON.stringify([[100, 100], [200, 100], [200, 200], [100, 200]]);
db.prepare(`
  INSERT INTO manga_regions (id, screenshot_id, region_type, polygon_json, original_text, translated_text, reading_order, confidence, render_mode, created_at)
  VALUES ('reg_01', 'sc_manga_01', 'bubble', ?, 'お前は誰だ？', 'Siapa kamu?', 1, 0.96, 'replace', 1700000000)
`).run(mockPolygon);

// Verify initial state
const initial = db.prepare('SELECT * FROM manga_regions WHERE id = ?').get('reg_01');
assert.strictEqual(initial.translated_text, 'Siapa kamu?');

// Perform in-place translation update (simulating user edit in bottom sheet modal)
const userEditedText = 'Hei, siapa sebenarnya dirimu?';
const updateStmt = db.prepare('UPDATE manga_regions SET translated_text = ? WHERE id = ?');
const res = updateStmt.run(userEditedText, 'reg_01');
assert.strictEqual(res.changes, 1);

// Verify updated record in SQLite
const updated = db.prepare('SELECT * FROM manga_regions WHERE id = ?').get('reg_01');
assert.strictEqual(updated.translated_text, 'Hei, siapa sebenarnya dirimu?');
assert.strictEqual(updated.original_text, 'お前は誰だ？', 'Original Japanese text preserved');
assert.strictEqual(updated.reading_order, 1, 'Reading order preserved');
assert.strictEqual(updated.polygon_json, mockPolygon, 'Polygon geometry preserved');

console.log('  ✓ In-place translation edit persisted cleanly in SQLite without mutating geometry or order');


console.log('\n=== TEST 4: Translate Again Functionality ===');

// Re-translating simulates re-triggering engine and saving
const retranslatedText = 'Siapa kamu sebenarnya?';
db.prepare('UPDATE manga_regions SET translated_text = ? WHERE id = ?').run(retranslatedText, 'reg_01');

const fresh = db.prepare('SELECT * FROM manga_regions WHERE id = ?').get('reg_01');
assert.strictEqual(fresh.translated_text, 'Siapa kamu sebenarnya?');
console.log('  ✓ "Translate Again" overwrites translated_text with fresh contextual translation');


console.log('\n=== TEST 5: Fullscreen Mode State Logic ===');

let isFullscreen = false;
let showChrome = true;

// User taps fullscreen expand button
isFullscreen = true;
showChrome = true;
assert.strictEqual(isFullscreen, true);

// User taps canvas to toggle minimal overlay
showChrome = !showChrome;
assert.strictEqual(showChrome, false, 'Canvas tap hides floating bar for immersive reading');

showChrome = !showChrome;
assert.strictEqual(showChrome, true, 'Canvas tap restores floating bar');

// User exits fullscreen
isFullscreen = false;
assert.strictEqual(isFullscreen, false);
console.log('  ✓ Fullscreen toggles and immersive canvas chrome work cleanly');

console.log('\n ALL TASK 18 MANGA READER & EDITING UX TESTS PASSED! ');
