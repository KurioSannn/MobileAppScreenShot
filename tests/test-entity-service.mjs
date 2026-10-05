import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Entity Extraction & Classification ===');

function extractEntities(screenshotId, text, category = 'Other', boundingBoxes = []) {
  const entities = [];
  const clean = text.trim();
  if (!clean) return entities;

  let counter = 0;
  const makeId = () => `ent_${++counter}`;

  // 1. URL
  const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*|\b(?:www\.)[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\/[^\s]*)?|\b[a-zA-Z0-9-]+\.(?:com|org|net|id|co\.id|io|app|dev|edu|gov)(?:\/[^\s]*)?)/gi;
  const urlMatches = clean.match(urlRegex);
  if (urlMatches) {
    for (const url of new Set(urlMatches)) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'url',
        value: url,
        suggestedAction: 'open_url',
        actionData: { url: url.startsWith('http') ? url : `https://${url}` },
      });
    }
  }

  // 2. Tracking Number
  const trackingRegex = /\b(?:No\.?\s*Resi|AWB|Tracking|Resi)[:\s#]*([A-Z0-9]{8,24})\b|\b(SPXID[A-Z0-9]{8,16}|JP[0-9]{10,14}|TKP[0-9]{10,14}|SOC[A-Z0-9]{8,14}|JX[0-9]{10,14})\b/gi;
  let trackMatch;
  while ((trackMatch = trackingRegex.exec(clean)) !== null) {
    const code = (trackMatch[1] || trackMatch[2] || trackMatch[0]).trim();
    if (code.length >= 8 && !entities.some((e) => e.value === code)) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'tracking_number',
        value: code,
        suggestedAction: 'copy_tracking',
        actionData: { trackingNumber: code },
      });
    }
  }

  // 3. Price
  const priceRegex = /(?:Rp\.?|IDR|\$|USD|€|EUR|¥|JPY|£|GBP)\s*[\d.,]+(?:\s*(?:k|ribu|million|juta))?|\bTotal\s*(?:Due|Bayar)?[:\s]*(?:Rp\.?|IDR|\$)?\s*[\d.,]+/gi;
  const priceMatches = clean.match(priceRegex);
  if (priceMatches) {
    for (const price of new Set(priceMatches)) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'price',
        value: price.trim(),
        suggestedAction: 'copy_price',
        actionData: { price: price.trim() },
      });
    }
  }

  // 4. Phone
  const phoneRegex = /\b(?:\+?62|08)[1-9][0-9]{7,11}\b|\b\+?[1-9]\d{1,2}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  const phoneMatches = clean.match(phoneRegex);
  if (phoneMatches) {
    for (const phone of new Set(phoneMatches)) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'phone',
        value: phone.trim(),
        suggestedAction: 'copy_phone',
        actionData: { phoneNumber: phone.trim() },
      });
    }
  }

  // 5. Date / Deadline
  const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}?\b|\b\d{1,2}\s+(?:Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember))\s*\d{4}?\b|\b(?:Deadline|Meeting|Jadwal|Tenggat)[:\s]*[A-Za-z0-9\s:.,-]+\b|\b(?:Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday|Jumat|Senin|Selasa|Rabu|Kamis|Sabtu|Minggu|Tomorrow|Besok)\b/gi;
  const dateMatches = clean.match(dateRegex);
  if (dateMatches) {
    for (const d of new Set(dateMatches.slice(0, 2))) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'date',
        value: d.trim(),
        suggestedAction: 'create_reminder',
        actionData: { title: `Reminder: ${d.trim()}`, textSnippet: clean.slice(0, 100) },
      });
    }
  }

  // 6. Manga Pattern
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(clean);
  if (hasJapanese || category === 'Manga') {
    entities.push({
      id: makeId(),
      screenshotId,
      entityType: 'manga_pattern',
      value: hasJapanese ? 'Japanese Speech Bubble Content' : 'Manga Panel Layout',
      suggestedAction: 'open_manga',
      actionData: { bubbleCount: boundingBoxes.length },
    });
  }

  return entities;
}

// Test sample invoice & tracking text
const sampleText = `
  Invoice #INV-9921
  Website: https://snaply.app/invoice/9921
  Tracking: SPXID04829104812
  Total Due: Rp 350.000 (Subtotal: $24.99)
  Contact Support: 081234567890
  Deadline: Friday 17:00 PM
`;

const entities = extractEntities('sc_test_1', sampleText, 'Other');

// 1. URL test
const urlEnt = entities.find((e) => e.entityType === 'url');
assert.ok(urlEnt, 'URL entity should be found');
assert.strictEqual(urlEnt.value, 'https://snaply.app/invoice/9921');
assert.strictEqual(urlEnt.suggestedAction, 'open_url');
console.log('✔ URL entity detected:', urlEnt.value, '-> Action:', urlEnt.suggestedAction);

// 2. Tracking number test
const trackEnt = entities.find((e) => e.entityType === 'tracking_number');
assert.ok(trackEnt, 'Tracking number should be found');
assert.strictEqual(trackEnt.value, 'SPXID04829104812');
assert.strictEqual(trackEnt.suggestedAction, 'copy_tracking');
console.log('✔ Tracking number detected:', trackEnt.value, '-> Action:', trackEnt.suggestedAction);

// 3. Price test
const priceEnt = entities.find((e) => e.entityType === 'price');
assert.ok(priceEnt, 'Price should be found');
assert.ok(priceEnt.value.includes('Rp 350.000') || priceEnt.value.includes('$24.99'));
assert.strictEqual(priceEnt.suggestedAction, 'copy_price');
console.log('✔ Price detected:', priceEnt.value, '-> Action:', priceEnt.suggestedAction);

// 4. Phone test
const phoneEnt = entities.find((e) => e.entityType === 'phone');
assert.ok(phoneEnt, 'Phone number should be found');
assert.strictEqual(phoneEnt.value, '081234567890');
assert.strictEqual(phoneEnt.suggestedAction, 'copy_phone');
console.log('✔ Phone number detected:', phoneEnt.value, '-> Action:', phoneEnt.suggestedAction);

// 5. Date / Deadline test
const dateEnt = entities.find((e) => e.entityType === 'date');
assert.ok(dateEnt, 'Date/Deadline should be found');
assert.ok(dateEnt.value.toLowerCase().includes('deadline') || dateEnt.value.toLowerCase().includes('friday'));
assert.strictEqual(dateEnt.suggestedAction, 'create_reminder');
console.log('✔ Date / Deadline detected:', dateEnt.value, '-> Action:', dateEnt.suggestedAction);

// 6. Manga Pattern test
const mangaEntities = extractEntities('sc_manga', 'お前は誰だ？…友達だ。', 'Manga', [{ x: 0, y: 0, width: 100, height: 100 }]);
const mangaEnt = mangaEntities.find((e) => e.entityType === 'manga_pattern');
assert.ok(mangaEnt, 'Manga pattern should be detected');
assert.strictEqual(mangaEnt.suggestedAction, 'open_manga');
console.log('✔ Manga pattern detected:', mangaEnt.value, '-> Action:', mangaEnt.suggestedAction);

console.log('\n=== TEST 2: SQLite Persistence of Entities ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    suggested_action TEXT,
    action_data_json TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_entities_screenshot ON entities(screenshot_id);
`);

const insertEntity = db.prepare(`
  INSERT INTO entities (id, screenshot_id, entity_type, value, confidence, suggested_action, action_data_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const ent of entities) {
  insertEntity.run(
    ent.id,
    ent.screenshotId,
    ent.entityType,
    ent.value,
    0.95,
    ent.suggestedAction,
    JSON.stringify(ent.actionData),
    Date.now()
  );
}

const selectEntities = db.prepare('SELECT * FROM entities WHERE screenshot_id = ? ORDER BY created_at ASC');
const rows = selectEntities.all('sc_test_1');

assert.strictEqual(rows.length, entities.length);
console.log(`✔ All ${rows.length} entities successfully saved and retrieved from SQLite:`);
for (const r of rows) {
  console.log(`  - [${r.entity_type}] ${r.value} -> Action: ${r.suggested_action}`);
}

db.close();

console.log('\n=== ALL TASK 11 ENTITY DETECTION TESTS PASSED! ===');
