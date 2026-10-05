// tests/test-search-screen.mjs
// Verification of Task 14: Full-Text Screenshot Search in SQLite
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: SQLite Schema & Seed for Full-Text Search ===');

const db = new DatabaseSync(':memory:');

db.exec(`
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
    created_at INTEGER NOT NULL
  );

  CREATE TABLE translations (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE tags (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE reminders (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT,
    title TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

const now = Date.now();

// 1. Screenshot: Manga speech bubble
db.prepare(`
  INSERT INTO screenshots (id, image_uri, created_at, category, notes)
  VALUES ('sc_1', 'file:///images/manga_chap1.jpg', ?, 'Manga', 'Chainsaw Man Chapter 1')
`).run(now - 10000);

db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_1', 'sc_1', '悪魔の力を見せてやろう', 'ja', ?)
`).run(now);

db.prepare(`
  INSERT INTO translations (id, screenshot_id, source_language, target_language, original_text, translated_text, created_at)
  VALUES ('tr_1', 'sc_1', 'ja', 'id', '悪魔の力を見せてやろう', 'Biar kutunjukkan kekuatan iblis ini', ?)
`).run(now);

db.prepare(`
  INSERT INTO tags (id, screenshot_id, name, created_at)
  VALUES ('tag_1', 'sc_1', 'anime', ?), ('tag_2', 'sc_1', 'action', ?)
`).run(now, now);

// 2. Screenshot: Receipt payment
db.prepare(`
  INSERT INTO screenshots (id, image_uri, created_at, category, notes)
  VALUES ('sc_2', 'file:///images/shopee_receipt.png', ?, 'Receipt', 'Monthly groceries')
`).run(now - 5000);

db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_2', 'sc_2', 'Total Pembayaran: Rp 450.000 via BCA Virtual Account 8274192841', 'id', ?)
`).run(now);

db.prepare(`
  INSERT INTO tags (id, screenshot_id, name, created_at)
  VALUES ('tag_3', 'sc_2', 'belanja', ?)
`).run(now);

// 3. Screenshot: Assignment / Deadline
db.prepare(`
  INSERT INTO screenshots (id, image_uri, created_at, category, notes)
  VALUES ('sc_3', 'file:///images/math_hw.jpg', ?, 'Assignment', 'Linear Algebra homework')
`).run(now);

db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, created_at)
  VALUES ('ocr_3', 'sc_3', 'Final Project Submission Deadline: October 15, 2026 23:59 PM', 'en', ?)
`).run(now);

db.prepare(`
  INSERT INTO reminders (id, screenshot_id, title, scheduled_at, created_at)
  VALUES ('rem_3', 'sc_3', 'Math HW Due', ?, ?)
`).run(now + 86400000, now);

console.log('✔ Test database seeded with Manga, Receipt, and Assignment screenshots');

console.log('\n=== TEST 2: Full-Text Offline Search Execution ===');

function searchScreenshots(query, limit = 50) {
  const clean = query.trim();
  if (!clean) return [];

  const term = `%${clean}%`;

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
      (SELECT GROUP_CONCAT(tg.name, ', ') FROM tags tg WHERE tg.screenshot_id = s.id) AS matched_tags,
      (SELECT COUNT(*) FROM reminders r WHERE r.screenshot_id = s.id) AS reminder_count
    FROM screenshots s
    WHERE (
      s.id IN (SELECT screenshot_id FROM ocr_results WHERE text LIKE ?)
      OR s.id IN (SELECT screenshot_id FROM translations WHERE translated_text LIKE ?)
      OR s.id IN (SELECT screenshot_id FROM tags WHERE name LIKE ?)
      OR s.category LIKE ?
      OR s.notes LIKE ?
    )
    ORDER BY s.created_at DESC
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(term, term, term, term, term, limit);

  return rows.map((row) => ({
    ...row,
    tags: row.matched_tags ? row.matched_tags.split(',').map((t) => t.trim()) : [],
    reminder_count: Number(row.reminder_count ?? 0),
  }));
}

// 1. Search OCR text: "BCA Virtual Account"
const ocrResults = searchScreenshots('BCA Virtual Account');
assert.strictEqual(ocrResults.length, 1);
assert.strictEqual(ocrResults[0].id, 'sc_2');
console.log('✔ Found screenshot via OCR text: "BCA Virtual Account" -> ID:', ocrResults[0].id);

// 2. Search Translation text: "kekuatan iblis"
const trResults = searchScreenshots('kekuatan iblis');
assert.strictEqual(trResults.length, 1);
assert.strictEqual(trResults[0].id, 'sc_1');
console.log('✔ Found screenshot via Translation text: "kekuatan iblis" -> ID:', trResults[0].id);

// 3. Search Category: "Manga"
const catResults = searchScreenshots('Manga');
assert.strictEqual(catResults.length, 1);
assert.strictEqual(catResults[0].id, 'sc_1');
console.log('✔ Found screenshot via Category: "Manga" -> ID:', catResults[0].id);

// 4. Search Tags: "anime"
const tagResults = searchScreenshots('anime');
assert.strictEqual(tagResults.length, 1);
assert.strictEqual(tagResults[0].id, 'sc_1');
console.log('✔ Found screenshot via Tag: "anime" -> ID:', tagResults[0].id);

// 5. Search Deadline / Notes: "Algebra"
const noteResults = searchScreenshots('Algebra');
assert.strictEqual(noteResults.length, 1);
assert.strictEqual(noteResults[0].id, 'sc_3');
assert.strictEqual(noteResults[0].reminder_count, 1);
console.log('✔ Found screenshot via Notes / Deadline: "Algebra" -> ID:', noteResults[0].id);

console.log('\n=== TEST 3: Contextual Match Info & Snippet Window Extraction ===');

function extractMatchSnippet(text, keyword, maxLength = 60) {
  if (!text) return '';
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  const lower = text.toLowerCase();
  const index = lower.indexOf(cleanKeyword);
  if (index === -1) return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  const marginBefore = Math.floor(maxLength * 0.35);
  const marginAfter = Math.floor(maxLength * 0.65);

  const start = Math.max(0, index - marginBefore);
  const end = Math.min(text.length, index + cleanKeyword.length + marginAfter);

  let snippet = text.slice(start, end).replace(/\s+/g, ' ');
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;
  return snippet;
}

const longText = 'Halo teman-teman sekalian, kami ingin memberitahukan bahwa total tagihan pembayaran adalah Rp 450.000 dan harus dibayar sebelum jam 5 sore.';
const snippet = extractMatchSnippet(longText, 'Rp 450.000', 50);
assert.ok(snippet.includes('Rp 450.000'), 'Snippet contains matching keyword');
assert.ok(snippet.startsWith('...'), 'Snippet has ellipsis prefix');
console.log('✔ Contextual snippet window extraction verified:');
console.log('  Original length:', longText.length);
console.log('  Extracted window:', snippet);

console.log('\n=== TEST 4: Keyword Highlighting Token Splitter ===');

function splitForHighlight(text, keyword) {
  const cleanKeyword = keyword?.trim();
  if (!cleanKeyword || !text) return [{ text, isMatch: false }];

  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    isMatch: part.toLowerCase() === cleanKeyword.toLowerCase(),
  }));
}

const tokens = splitForHighlight('Submission Deadline: October 15, 2026', 'Deadline');
assert.strictEqual(tokens.length, 3);
assert.strictEqual(tokens[0].text, 'Submission ');
assert.strictEqual(tokens[0].isMatch, false);
assert.strictEqual(tokens[1].text, 'Deadline');
assert.strictEqual(tokens[1].isMatch, true);
assert.strictEqual(tokens[2].text, ': October 15, 2026');
assert.strictEqual(tokens[2].isMatch, false);

console.log('✔ Keyword match highlighting parser correctly isolates tokens without mutation');

console.log('\n=== TEST 5: Debounced Performance & Zero Keystroke Lag ===');

let debounceTimer = null;
let executedQueries = [];

function triggerSearchInput(input) {
  // Clear any pending debounced search
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const results = searchScreenshots(input);
    executedQueries.push({ input, count: results.length });
  }, 10);
}

// Simulate fast user typing: "D", "De", "Dea", "Dead", "Deadline"
triggerSearchInput('D');
triggerSearchInput('De');
triggerSearchInput('Dea');
triggerSearchInput('Dead');
triggerSearchInput('Deadline');

// Wait for debounce timer
await new Promise((resolve) => setTimeout(resolve, 30));

assert.strictEqual(executedQueries.length, 1, 'Only one search executed after fast typing finished');
assert.strictEqual(executedQueries[0].input, 'Deadline');
assert.strictEqual(executedQueries[0].count, 1);
console.log('✔ Fast debounce prevents lag and throttles SQLite queries to 1 invocation');

console.log('\n=== ALL TASK 14 FULL-TEXT SEARCH TESTS PASSED! ===');
