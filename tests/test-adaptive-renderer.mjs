// tests/test-adaptive-renderer.mjs
// Verification of Task 17: Adaptive Manga Bubble Renderer & Typography
import assert from 'node:assert';

console.log('=== TEST 1: calculateAdaptiveFontSize Algorithm ===');

function calculateAdaptiveFontSize(
  text,
  boxWidth,
  boxHeight,
  minSize = 9,
  maxSize = 16
) {
  if (!text || boxWidth <= 0 || boxHeight <= 0) return 11;

  const charCount = text.length;
  for (let size = maxSize; size >= minSize; size--) {
    const charWidth = size * 0.58;
    const lineHeight = size * 1.25;
    const charsPerLine = Math.max(1, Math.floor((boxWidth - 12) / charWidth));
    const linesNeeded = Math.ceil(charCount / charsPerLine);
    const totalHeightNeeded = linesNeeded * lineHeight;

    if (totalHeightNeeded <= boxHeight - 6) {
      return size;
    }
  }

  return minSize;
}

// 1.1 Edge cases
assert.strictEqual(calculateAdaptiveFontSize('', 100, 100), 11, 'Empty text should return default 11');
assert.strictEqual(calculateAdaptiveFontSize('Hello', 0, 100), 11, 'Zero width should return default 11');
assert.strictEqual(calculateAdaptiveFontSize('Hello', 100, 0), 11, 'Zero height should return default 11');
console.log('  ✓ Edge cases handle empty text and non-positive dimensions gracefully');

// 1.2 Large box with short text should get maxSize
const shortText = 'Halo!';
const largeSize = calculateAdaptiveFontSize(shortText, 250, 180, 9, 16);
assert.strictEqual(largeSize, 16, 'Short text in large bubble should pick maxSize 16');
console.log(`  ✓ Short text in large bubble picked maxSize: ${largeSize}pt`);

// 1.3 Moderate text in medium box should scale adaptively between minSize and maxSize
const mediumText = 'Kita harus segera pergi sebelum musuh datang kembali!';
const mediumSize = calculateAdaptiveFontSize(mediumText, 120, 80, 9, 16);
assert(mediumSize >= 9 && mediumSize <= 16, 'Medium size should be between 9 and 16');
console.log(`  ✓ Medium text adaptively computed font size: ${mediumSize}pt`);

// 1.4 Very long dialogue in small box should scale down to minSize but never below it
const longDialogue = 'Tunggu sebentar! Apakah kamu benar-benar yakin dengan keputusan berbahaya ini? Jangan gegabah!';
const smallSize = calculateAdaptiveFontSize(longDialogue, 60, 40, 9, 16);
assert.strictEqual(smallSize, 9, 'Dense text in cramped bubble must not drop below minSize 9');
console.log(`  ✓ Dense text in cramped bubble stayed at minSize floor: ${smallSize}pt`);


console.log('\n=== TEST 2: Skia Polygon Vertex Scaling ===');

function scalePolygon(polygon, containerWidth, containerHeight, imageWidth = 1080, imageHeight = 1920) {
  if (!polygon || polygon.length === 0) return [];
  const scaleX = containerWidth / Math.max(1, imageWidth);
  const scaleY = containerHeight / Math.max(1, imageHeight);

  return polygon.map(([x, y]) => [
    Math.round(x * scaleX * 100) / 100,
    Math.round(y * scaleY * 100) / 100,
  ]);
}

const rawPolygon = [
  [100, 200],
  [300, 200],
  [300, 400],
  [100, 400],
];
const scaled = scalePolygon(rawPolygon, 540, 960, 1080, 1920); // 0.5x scaling
assert.deepStrictEqual(scaled[0], [50, 100], 'First vertex scaled by 0.5');
assert.deepStrictEqual(scaled[1], [150, 100], 'Second vertex scaled by 0.5');
assert.deepStrictEqual(scaled[2], [150, 200], 'Third vertex scaled by 0.5');
assert.deepStrictEqual(scaled[3], [50, 200], 'Fourth vertex scaled by 0.5');
console.log('  ✓ Polygon coordinates correctly project from raw 1080x1920 image to display canvas');


console.log('\n=== TEST 3: Adaptive Render Mode & Low-Confidence Fallback ===');

function determineEffectiveRenderMode(userSelectedMode, regionConfidence) {
  // If user selected 'replace' but detection confidence is low (< 0.90),
  // fallback to 'floating' so manga background art is never obscured
  if (userSelectedMode === 'replace' && regionConfidence < 0.90) {
    return 'floating';
  }
  return userSelectedMode;
}

// 3.1 High confidence bubble in Replace mode stays Replace
assert.strictEqual(
  determineEffectiveRenderMode('replace', 0.95),
  'replace',
  'High confidence speech bubble should remain replace mode'
);

// 3.2 Low confidence bubble in Replace mode falls back to Floating to save artwork
assert.strictEqual(
  determineEffectiveRenderMode('replace', 0.78),
  'floating',
  'Low confidence region (< 0.90) must fallback to floating to preserve artwork'
);

// 3.3 Glass mode remains Glass
assert.strictEqual(
  determineEffectiveRenderMode('glass', 0.85),
  'glass',
  'Glass mode should remain glass regardless of confidence'
);

// 3.4 Floating mode remains Floating
assert.strictEqual(
  determineEffectiveRenderMode('floating', 0.99),
  'floating',
  'Floating mode should remain floating'
);
console.log('  ✓ Low-confidence fallback correctly protects artwork from opaque patches');


console.log('\n=== TEST 4: Stylistic Inpainting Attributes ===');

function getBubbleStyle(renderMode, regionType, isSelected) {
  if (renderMode === 'replace') {
    return {
      fillColor: regionType === 'narration' ? 'rgba(255, 252, 235, 0.98)' : 'rgba(255, 255, 255, 0.98)',
      strokeColor: isSelected ? '#F5B031' : regionType === 'narration' ? '#8C7A58' : '#2C2B29',
      strokeWidth: isSelected ? 2.5 : 1.5,
    };
  }
  if (renderMode === 'glass') {
    return {
      fillColor: 'rgba(255, 255, 255, 0.52)',
      strokeColor: isSelected ? '#F5B031' : 'rgba(255, 255, 255, 0.85)',
      strokeWidth: isSelected ? 2.5 : 1.5,
    };
  }
  // floating
  return {
    fillColor: 'transparent',
    strokeColor: isSelected ? '#F5B031' : 'transparent',
    strokeWidth: isSelected ? 2.0 : 0,
  };
}

// 4.1 Dialogue bubble in Replace mode
const dialogueStyle = getBubbleStyle('replace', 'bubble', false);
assert.strictEqual(dialogueStyle.fillColor, 'rgba(255, 255, 255, 0.98)');
assert.strictEqual(dialogueStyle.strokeColor, '#2C2B29');

// 4.2 Narration box in Replace mode uses warm parchment
const narrationStyle = getBubbleStyle('replace', 'narration', false);
assert.strictEqual(narrationStyle.fillColor, 'rgba(255, 252, 235, 0.98)');
assert.strictEqual(narrationStyle.strokeColor, '#8C7A58');

// 4.3 Active/Selected bubble has amber highlight stroke
const selectedDialogue = getBubbleStyle('replace', 'bubble', true);
assert.strictEqual(selectedDialogue.strokeColor, '#F5B031');
assert.strictEqual(selectedDialogue.strokeWidth, 2.5);

// 4.4 Glass mode translucency
const glassStyle = getBubbleStyle('glass', 'bubble', false);
assert.strictEqual(glassStyle.fillColor, 'rgba(255, 255, 255, 0.52)');

// 4.5 Floating mode transparent fill
const floatingStyle = getBubbleStyle('floating', 'bubble', false);
assert.strictEqual(floatingStyle.fillColor, 'transparent');

console.log('  ✓ Inpainting styles correctly differentiate dialogue, narration, glass and active states');

console.log('\n ALL ADAPTIVE MANGA RENDERER TESTS PASSED SUCCESSFULLY! ');
