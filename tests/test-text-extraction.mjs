import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Full Text Copy & Active Text Resolution ===');

function resolveActiveText(rawText, correctedText) {
  if (correctedText !== null && correctedText !== undefined && correctedText.trim().length > 0) {
    return correctedText;
  }
  return rawText;
}

const rawText1 = 'Meeting with client on Friday at 15:00 PM';
let correctedText1 = null;

// Case A: No correction yet -> active text is raw OCR text
assert.strictEqual(resolveActiveText(rawText1, correctedText1), rawText1);
console.log('✔ Active text correctly resolves to raw OCR text when unedited');

// Case B: User edits OCR text -> active text becomes corrected text
correctedText1 = 'Meeting with client on Friday at 16:00 PM (Rescheduled)';
assert.strictEqual(resolveActiveText(rawText1, correctedText1), correctedText1);
console.log('✔ Active text correctly resolves to user-corrected text after edit');

console.log('\n=== TEST 2: Individual Region Selection & Block Extraction ===');

const mockBlocks = [
  {
    id: 'blk_1',
    text: 'Invoice #INV-2026-09',
    box: { x: 30, y: 50, width: 220, height: 35 },
  },
  {
    id: 'blk_2',
    text: 'Total Due: $450.00 USD',
    box: { x: 30, y: 100, width: 260, height: 40 },
  },
  {
    id: 'blk_3',
    text: 'Due Date: October 15, 2026',
    box: { x: 30, y: 155, width: 300, height: 38 },
  },
];

let selectedBlockId = null;

function selectBlock(id) {
  selectedBlockId = id;
}

// Select block 2
selectBlock('blk_2');
const selectedBlock = mockBlocks.find((b) => b.id === selectedBlockId);

assert.ok(selectedBlock, 'Selected block should exist');
assert.strictEqual(selectedBlock.text, 'Total Due: $450.00 USD');
assert.strictEqual(selectedBlock.box.width, 260);
console.log('✔ Block 2 selected successfully with isolated snippet:', selectedBlock.text);

// Deselect block
selectBlock(null);
assert.strictEqual(selectedBlockId, null);
console.log('✔ Block deselected successfully');

console.log('\n=== TEST 3: SQLite Storage of Corrected Text & Persistence Verification ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE IF NOT EXISTS ocr_results (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    text TEXT NOT NULL,
    corrected_text TEXT,
    language TEXT,
    confidence REAL NOT NULL DEFAULT 1.0,
    bounds_json TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ocr_results_screenshot ON ocr_results(screenshot_id);
`);

const insertOcr = db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, corrected_text, language, confidence, bounds_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const scId = 'sc_extract_test';
insertOcr.run(
  'ocr_init_1',
  scId,
  'Orignial OCR text with a typo in prodct name: MackBook Pro',
  null,
  'English',
  0.94,
  JSON.stringify(mockBlocks.map((b) => b.box)),
  Date.now()
);

// Verify initial state
const getStmt = db.prepare('SELECT * FROM ocr_results WHERE screenshot_id = ?');
let row = getStmt.get(scId);
assert.ok(row);
assert.strictEqual(row.corrected_text, null);
console.log('✔ Initial OCR record created with corrected_text = NULL');

// Update corrected text
const updateStmt = db.prepare('UPDATE ocr_results SET corrected_text = ? WHERE screenshot_id = ?');
const userCorrected = 'Original OCR text with a typo corrected: MacBook Pro 16-inch M3';
const updateRes = updateStmt.run(userCorrected, scId);
assert.strictEqual(updateRes.changes, 1);

row = getStmt.get(scId);
assert.strictEqual(row.corrected_text, userCorrected);
assert.strictEqual(row.text, 'Orignial OCR text with a typo in prodct name: MackBook Pro'); // original preserved
console.log('✔ Corrected text saved to SQLite without mutating raw OCR text:');
console.log('  Raw text:      ', row.text);
console.log('  Corrected text:', row.corrected_text);

console.log('\n=== TEST 4: Revert to Original OCR Text ===');

const revertStmt = db.prepare('UPDATE ocr_results SET corrected_text = NULL WHERE screenshot_id = ?');
const revertRes = revertStmt.run(scId);
assert.strictEqual(revertRes.changes, 1);

row = getStmt.get(scId);
assert.strictEqual(row.corrected_text, null);
assert.strictEqual(resolveActiveText(row.text, row.corrected_text), row.text);
console.log('✔ Successfully reverted corrected text to original OCR text in database');

db.close();

console.log('\n=== ALL TASK 09 TEXT EXTRACTION & COPY TESTS PASSED! ===');
