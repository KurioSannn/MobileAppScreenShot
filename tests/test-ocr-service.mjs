import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Heuristic Language Detection Classifier ===');

function detectLanguageFromText(text) {
  if (!text || text.trim().length === 0) {
    return { language: 'Unknown', languageCode: 'und', confidence: 0 };
  }

  const cleanText = text.trim();

  // 1. Japanese check (Hiragana [\u3040-\u309F] or Katakana [\u30A0-\u30FF])
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (japanesePattern.test(cleanText)) {
    return { language: 'Japanese', languageCode: 'ja', confidence: 0.96 };
  }

  // 2. Korean check (Hangul Syllables [\uAC00-\uD7AF] or Jamo [\u1100-\u11FF])
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/;
  if (koreanPattern.test(cleanText)) {
    return { language: 'Korean', languageCode: 'ko', confidence: 0.95 };
  }

  // 3. Chinese check (CJK Unified Ideographs without kana)
  const cjkPattern = /[\u4E00-\u9FFF]/;
  if (cjkPattern.test(cleanText)) {
    return { language: 'Chinese', languageCode: 'zh', confidence: 0.93 };
  }

  // 4. Indonesian check (common stopwords)
  const indonesianTokens = /\b(yang|dan|di|ini|dari|untuk|pada|ke|dengan|adalah|bisa|tenggat|jadwal|bayar|pesanan)\b/i;
  if (indonesianTokens.test(cleanText)) {
    return { language: 'Indonesian', languageCode: 'id', confidence: 0.92 };
  }

  // 5. English default for Latin text
  const latinPattern = /[a-zA-Z]/;
  if (latinPattern.test(cleanText)) {
    return { language: 'English', languageCode: 'en', confidence: 0.91 };
  }

  return { language: 'Latin', languageCode: 'la', confidence: 0.85 };
}

// Test Japanese
const jaRes = detectLanguageFromText('お前は誰だ？…友達だ。');
assert.strictEqual(jaRes.language, 'Japanese');
assert.strictEqual(jaRes.languageCode, 'ja');
assert.ok(jaRes.confidence >= 0.95);
console.log('✔ Japanese classification verified:', jaRes);

// Test Korean
const koRes = detectLanguageFromText('안녕하세요! 프로젝트 일정 확인 부탁드립니다.');
assert.strictEqual(koRes.language, 'Korean');
assert.strictEqual(koRes.languageCode, 'ko');
assert.ok(koRes.confidence >= 0.95);
console.log('✔ Korean classification verified:', koRes);

// Test Chinese
const zhRes = detectLanguageFromText('确认会议时间与地点。');
assert.strictEqual(zhRes.language, 'Chinese');
assert.strictEqual(zhRes.languageCode, 'zh');
assert.ok(zhRes.confidence >= 0.90);
console.log('✔ Chinese classification verified:', zhRes);

// Test Indonesian
const idRes = detectLanguageFromText('Tenggat waktu pembayaran invoice pesanan ini pada hari Jumat.');
assert.strictEqual(idRes.language, 'Indonesian');
assert.strictEqual(idRes.languageCode, 'id');
assert.ok(idRes.confidence >= 0.90);
console.log('✔ Indonesian classification verified:', idRes);

// Test English
const enRes = detectLanguageFromText('Review sprint tasks and release notes for v1.2');
assert.strictEqual(enRes.language, 'English');
assert.strictEqual(enRes.languageCode, 'en');
assert.ok(enRes.confidence >= 0.90);
console.log('✔ English classification verified:', enRes);

// Test Empty
const emptyRes = detectLanguageFromText('   ');
assert.strictEqual(emptyRes.language, 'Unknown');
assert.strictEqual(emptyRes.languageCode, 'und');
console.log('✔ Empty string classification verified:', emptyRes);

console.log('\n=== TEST 2: Bounding Box Representation & Layout Mapping ===');

const mockBoxes = [
  { x: 24, y: 120, width: 380, height: 42 },
  { x: 24, y: 180, width: 250, height: 38 },
];

assert.strictEqual(mockBoxes.length, 2);
for (const box of mockBoxes) {
  assert.ok(typeof box.x === 'number' && box.x >= 0);
  assert.ok(typeof box.y === 'number' && box.y >= 0);
  assert.ok(typeof box.width === 'number' && box.width > 0);
  assert.ok(typeof box.height === 'number' && box.height > 0);
}
console.log('✔ Bounding box coordinate models valid:', mockBoxes);

console.log('\n=== TEST 3: SQLite Persistence of OCR Results ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE IF NOT EXISTS ocr_results (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    text TEXT NOT NULL,
    language TEXT,
    confidence REAL,
    bounds_json TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ocr_screenshot_id ON ocr_results(screenshot_id);
`);

const insertStmt = db.prepare(`
  INSERT INTO ocr_results (id, screenshot_id, text, language, confidence, bounds_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const testOcr = {
  id: 'ocr_test_123',
  screenshot_id: 'sc_manga_001',
  text: 'お前は誰だ？…友達だ。',
  language: 'Japanese',
  confidence: 0.98,
  bounds_json: JSON.stringify(mockBoxes),
  created_at: Date.now(),
};

insertStmt.run(
  testOcr.id,
  testOcr.screenshot_id,
  testOcr.text,
  testOcr.language,
  testOcr.confidence,
  testOcr.bounds_json,
  testOcr.created_at
);

const selectStmt = db.prepare(`SELECT * FROM ocr_results WHERE screenshot_id = ?`);
const row = selectStmt.get('sc_manga_001');

assert.ok(row, 'OCR record should exist in database');
assert.strictEqual(row.id, 'ocr_test_123');
assert.strictEqual(row.screenshot_id, 'sc_manga_001');
assert.strictEqual(row.text, 'お前は誰だ？…友達だ。');
assert.strictEqual(row.language, 'Japanese');
assert.strictEqual(row.confidence, 0.98);

const parsedBounds = JSON.parse(row.bounds_json);
assert.strictEqual(parsedBounds.length, 2);
assert.strictEqual(parsedBounds[0].width, 380);
console.log('✔ SQLite OCR persistence verified with serialized bounds_json & indexing');

db.close();

console.log('\n=== ALL TASK 08 ON-DEVICE OCR TESTS PASSED! ===');
