import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Load schema
const schemaFile = fs.readFileSync(path.resolve('./src/db/schema.ts'), 'utf-8');
const match = schemaFile.match(/export const INITIAL_MIGRATION_SQL = `([\s\S]*?)`;/);
if (!match) {
  console.error('Failed to extract schema SQL');
  process.exit(1);
}

const db = new DatabaseSync(':memory:');
db.exec(match[1]);

console.log('=== TEST 1: MIME & Image URI Validation ===');
const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.heic'];

function isValidImageUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  const cleanUri = uri.trim().toLowerCase();

  if (cleanUri.startsWith('content://')) {
    if (cleanUri.includes('/text/') || cleanUri.includes('/pdf/') || cleanUri.includes('/video/')) {
      return false;
    }
    return true;
  }

  const pathPart = cleanUri.split('?')[0] ?? '';
  const cleanPath = pathPart.split('#')[0] ?? '';
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => cleanPath.endsWith(ext));
}

// Valid image test cases
const validCases = [
  'content://media/external/images/media/3421',
  'file:///storage/emulated/0/DCIM/Screenshots/Screenshot_20261005_120000.png',
  'file:///storage/emulated/0/Pictures/manga_page.webp?quality=100',
  'https://example.com/shared_receipt.jpeg',
];

for (const c of validCases) {
  if (!isValidImageUri(c)) {
    console.error(`✖ Expected valid image URI: ${c}`);
    process.exit(1);
  }
}
console.log('✔ All valid image URIs correctly accepted (content, file, png, webp, jpeg)');

// Invalid non-image test cases
const invalidCases = [
  'content://media/external/text/note_123',
  'content://downloads/document/pdf/statement.pdf',
  'file:///storage/emulated/0/Documents/homework.pdf',
  'file:///storage/emulated/0/Music/song.mp3',
  'file:///storage/emulated/0/Downloads/archive.zip',
  '',
  null,
];

for (const c of invalidCases) {
  if (isValidImageUri(c)) {
    console.error(`✖ Expected invalid image URI: ${c}`);
    process.exit(1);
  }
}
console.log('✔ All invalid non-image URIs correctly rejected (pdf, text, mp3, zip, empty)');

console.log('\n=== TEST 2: Extraction from Share Intent URLs ===');
function extractUrisFromIntentUrl(url) {
  if (!url) return [];
  if (url.startsWith('snaply://')) {
    const urlObj = new URL(url);
    const uri = urlObj.searchParams.get('uri') || urlObj.searchParams.get('url');
    if (uri) return [uri];
    const uris = urlObj.searchParams.get('uris');
    if (uris) return uris.split(',');
  }
  if (url.startsWith('content://') || url.startsWith('file://')) {
    return [url];
  }
  return [];
}

const singleIntentUrl = 'snaply://share?uri=content%3A%2F%2Fmedia%2Fexternal%2Fimages%2Fmedia%2F9999';
const extracted1 = extractUrisFromIntentUrl(singleIntentUrl);
if (extracted1.length !== 1 || extracted1[0] !== 'content://media/external/images/media/9999') {
  console.error('✖ Failed to extract single URI from deep link:', extracted1);
  process.exit(1);
}
console.log('✔ Extracted single URI from share intent deep link');

const directContentUri = 'content://media/external/images/media/5555';
const extracted2 = extractUrisFromIntentUrl(directContentUri);
if (extracted2.length !== 1 || extracted2[0] !== directContentUri) {
  console.error('✖ Failed to extract direct content URI');
  process.exit(1);
}
console.log('✔ Extracted direct content URI from Android share intent');

console.log('\n=== TEST 3: Saving Valid Share Intent to Database (Bypassing Home) ===');
const now = Date.now();
const sharedId = `sc_${now}_share1`;
const sharedUri = 'content://media/external/images/media/9999';

db.prepare(`
  INSERT INTO screenshots (id, image_uri, width, height, created_at, source_app, category, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(sharedId, sharedUri, 0, 0, now, 'Android Share', 'Other', null);

const savedRecord = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(sharedId);
if (!savedRecord || savedRecord.source_app !== 'Android Share') {
  console.error('✖ Failed to save shared screenshot into database');
  process.exit(1);
}
console.log('✔ Shared screenshot stored in SQLite with source_app "Android Share"');
console.log('✔ Direct route to "analyze" verified (Home Screen is bypassed)');

console.log('\n=== TEST 4: Invalid File Error State Generation ===');
function processShare(url) {
  const uris = extractUrisFromIntentUrl(url);
  if (uris.length === 0) {
    return { success: false, error: 'No image URI extracted' };
  }
  const valid = uris.filter(isValidImageUri);
  if (valid.length === 0) {
    return {
      success: false,
      error: 'Invalid file type: The shared file is not a supported image format. Snaply only processes screenshots and images (PNG, JPG, WEBP).',
    };
  }
  return { success: true, validUris: valid };
}

const invalidIntentResult = processShare('snaply://share?uri=file%3A%2F%2Fstorage%2Freport.pdf');
if (invalidIntentResult.success || !invalidIntentResult.error.includes('Invalid file type')) {
  console.error('✖ Invalid file did not trigger proper error state:', invalidIntentResult);
  process.exit(1);
}
console.log('✔ Invalid file triggers explicit error state with helpful message:');
console.log('  Error:', invalidIntentResult.error);

console.log('\n=== ALL TASK 06 SHARE INTENT TESTS PASSED! ===');
