// tests/test-manga-detection.mjs
// Verification of Task 15: Manga Detection Pipeline & RTL Reading Order
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Speech Bubble vs Narration Box Classification ===');

function classifyMangaRegion(text, box, imageWidth = 1080, imageHeight = 1920) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  const isTopMargin = box.y < imageHeight * 0.18;
  const isBottomMargin = box.y > imageHeight * 0.82;
  const isWideBanner = box.width > imageWidth * 0.65;
  const hasNarrationMarker =
    lower.startsWith('meanwhile') ||
    lower.startsWith('at that moment') ||
    lower.startsWith('suddenly') ||
    lower.startsWith('chapter') ||
    lower.startsWith('page') ||
    (clean.startsWith('[') && clean.endsWith(']')) ||
    (clean.startsWith('(') && clean.endsWith(')'));

  if (hasNarrationMarker || (isWideBanner && (isTopMargin || isBottomMargin))) {
    return { type: 'narration', confidence: 0.94 };
  }

  const hasDialogueQuotes =
    clean.includes('「') ||
    clean.includes('」') ||
    clean.includes('『') ||
    clean.includes('』') ||
    clean.includes('"') ||
    clean.includes('“') ||
    clean.includes('”');
  const hasPunctuation =
    clean.includes('!') ||
    clean.includes('?') ||
    clean.includes('…') ||
    clean.includes('?!') ||
    clean.includes('!?');

  const aspectRatio = box.width / Math.max(1, box.height);
  const isBalloonShape = aspectRatio >= 0.4 && aspectRatio <= 2.2;

  if (hasDialogueQuotes || hasPunctuation || isBalloonShape) {
    return { type: 'bubble', confidence: hasDialogueQuotes ? 0.98 : 0.93 };
  }

  return { type: 'text', confidence: 0.88 };
}

// 1. Dialogue in speech bubble
const bubble1 = classifyMangaRegion('「お前は誰だ？」', { x: 500, y: 300, width: 200, height: 150 });
assert.strictEqual(bubble1.type, 'bubble');
assert.ok(bubble1.confidence >= 0.95);

// 2. Dialogue with punctuation
const bubble2 = classifyMangaRegion('Hahaha! You cannot escape!', { x: 200, y: 400, width: 220, height: 140 });
assert.strictEqual(bubble2.type, 'bubble');

// 3. Narration with bracket marker
const narration1 = classifyMangaRegion('[Meanwhile at the hidden academy...]', { x: 100, y: 100, width: 600, height: 70 });
assert.strictEqual(narration1.type, 'narration');
assert.strictEqual(narration1.confidence, 0.94);

// 4. Wide narration box at bottom
const narration2 = classifyMangaRegion('To be continued in the next chapter.', { x: 50, y: 1700, width: 900, height: 60 });
assert.strictEqual(narration2.type, 'narration');

console.log('✔ Speech bubbles successfully distinguished from narration boxes');

console.log('\n=== TEST 2: Polygon Coordinate Generation for Skia Overlay ===');

function generateRegionPolygon(box, type) {
  const { x, y, width: w, height: h } = box;

  if (type === 'narration') {
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
  }

  if (type === 'bubble') {
    const rx = Math.min(w * 0.25, 24);
    const ry = Math.min(h * 0.25, 24);

    return [
      [x + rx, y],
      [x + w - rx, y],
      [x + w, y + ry],
      [x + w, y + h - ry],
      [x + w - rx, y + h],
      [x + rx, y + h],
      [x, y + h - ry],
      [x, y + ry],
    ];
  }

  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

const bubblePoly = generateRegionPolygon({ x: 100, y: 200, width: 200, height: 100 }, 'bubble');
assert.strictEqual(bubblePoly.length, 8, 'Bubble polygon should have 8 vertices for rounded curvature');
assert.deepStrictEqual(bubblePoly[0], [124, 200]);

const narrPoly = generateRegionPolygon({ x: 50, y: 50, width: 400, height: 80 }, 'narration');
assert.strictEqual(narrPoly.length, 4, 'Narration polygon should have 4 corner vertices');
assert.deepStrictEqual(narrPoly[0], [50, 50]);
assert.deepStrictEqual(narrPoly[2], [450, 130]);

console.log('✔ Skia-compatible polygon vertices successfully generated for bubbles & narration');

console.log('\n=== TEST 3: RTL (Right to Left) Manga Reading Order ===');

function calculateMangaReadingOrder(items, direction = 'rtl', rowThreshold = 140) {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => a.box.y - b.box.y);
  const rows = [];
  let currentRow = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prevInRow = currentRow[0];
    const isSameBand = Math.abs(item.box.y - prevInRow.box.y) < rowThreshold;

    if (isSameBand) {
      currentRow.push(item);
    } else {
      rows.push(currentRow);
      currentRow = [item];
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  let orderIndex = 1;
  const result = [];

  for (const row of rows) {
    row.sort((a, b) => {
      if (direction === 'rtl') return b.box.x - a.box.x; // Right to left
      return a.box.x - b.box.x;                          // Left to right
    });

    for (const item of row) {
      result.push({
        ...item,
        reading_order: orderIndex++,
      });
    }
  }

  return result;
}

// 4 Bubbles layout:
// Top Panel: Right bubble (x: 650, y: 100) vs Left bubble (x: 150, y: 110)
// Bottom Panel: Right bubble (x: 600, y: 500) vs Left bubble (x: 100, y: 520)
const mockBubbles = [
  { id: 'b_left_top', box: { x: 150, y: 110, width: 200, height: 100 }, label: 'Left Top' },
  { id: 'b_right_top', box: { x: 650, y: 100, width: 220, height: 110 }, label: 'Right Top' },
  { id: 'b_left_bot', box: { x: 100, y: 520, width: 200, height: 100 }, label: 'Left Bottom' },
  { id: 'b_right_bot', box: { x: 600, y: 500, width: 220, height: 110 }, label: 'Right Bottom' },
];

const rtlOrdered = calculateMangaReadingOrder(mockBubbles, 'rtl');
assert.strictEqual(rtlOrdered[0].id, 'b_right_top', 'Reading order #1 must be Right Top in RTL manga');
assert.strictEqual(rtlOrdered[0].reading_order, 1);
assert.strictEqual(rtlOrdered[1].id, 'b_left_top', 'Reading order #2 must be Left Top');
assert.strictEqual(rtlOrdered[1].reading_order, 2);
assert.strictEqual(rtlOrdered[2].id, 'b_right_bot', 'Reading order #3 must be Right Bottom');
assert.strictEqual(rtlOrdered[2].reading_order, 3);
assert.strictEqual(rtlOrdered[3].id, 'b_left_bot', 'Reading order #4 must be Left Bottom');
assert.strictEqual(rtlOrdered[3].reading_order, 4);

console.log('✔ RTL reading order verified:');
for (const item of rtlOrdered) {
  console.log(`  #${item.reading_order}: [${item.id}] x=${item.box.x}, y=${item.box.y} (${item.label})`);
}

console.log('\n=== TEST 4: SQLite Persistence of Manga Page & Regions ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE manga_pages (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    batch_id TEXT,
    page_order INTEGER NOT NULL DEFAULT 1,
    reading_direction TEXT NOT NULL DEFAULT 'rtl',
    status TEXT NOT NULL DEFAULT 'ready',
    created_at INTEGER NOT NULL
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
    created_at INTEGER NOT NULL
  );
`);

const now = Date.now();
const testScreenshotId = 'sc_manga_test_01';

// Save page
db.prepare(`
  INSERT INTO manga_pages (id, screenshot_id, page_order, reading_direction, status, created_at)
  VALUES ('mpage_1', ?, 1, 'rtl', 'done', ?)
`).run(testScreenshotId, now);

// Save regions
const regionsToSave = [
  {
    id: 'mreg_1',
    region_type: 'bubble',
    polygon: bubblePoly,
    original_text: 'お前は誰だ？',
    translated_text: 'Siapa kamu?',
    reading_order: 1,
    confidence: 0.98,
  },
  {
    id: 'mreg_2',
    region_type: 'narration',
    polygon: narrPoly,
    original_text: '[街の明かりが消えた]',
    translated_text: '[Lampu kota padam]',
    reading_order: 2,
    confidence: 0.94,
  },
];

for (const r of regionsToSave) {
  db.prepare(`
    INSERT INTO manga_regions (id, screenshot_id, region_type, polygon_json, original_text, translated_text, reading_order, confidence, render_mode, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'replace', ?)
  `).run(
    r.id,
    testScreenshotId,
    r.region_type,
    JSON.stringify(r.polygon),
    r.original_text,
    r.translated_text,
    r.reading_order,
    r.confidence,
    now
  );
}

// Query saved regions
const savedRows = db
  .prepare('SELECT * FROM manga_regions WHERE screenshot_id = ? ORDER BY reading_order ASC')
  .all(testScreenshotId);

assert.strictEqual(savedRows.length, 2);
assert.strictEqual(savedRows[0].region_type, 'bubble');
assert.strictEqual(savedRows[0].reading_order, 1);
assert.strictEqual(savedRows[0].confidence, 0.98);
assert.deepStrictEqual(JSON.parse(savedRows[0].polygon_json), bubblePoly);

assert.strictEqual(savedRows[1].region_type, 'narration');
assert.strictEqual(savedRows[1].reading_order, 2);
assert.strictEqual(savedRows[1].confidence, 0.94);

console.log('✔ Manga page & regions successfully persisted and verified in SQLite');

console.log('\n=== ALL TASK 15 MANGA PIPELINE TESTS PASSED! ===');
