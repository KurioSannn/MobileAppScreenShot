import assert from 'node:assert';

console.log('=== TEST 1: Progressive Pipeline Step Definitions & Order ===');
const PIPELINE_STEPS = [
  'reading_image',
  'detecting_text',
  'detecting_language',
  'finding_actions',
  'completed',
];

assert.strictEqual(PIPELINE_STEPS.length, 5);
console.log('✔ Pipeline sequence defined:', PIPELINE_STEPS.join(' -> '));

console.log('\n=== TEST 2: Pipeline State Machine & Progressive Revelation Simulation ===');

class PipelineEngine {
  constructor(screenshot) {
    this.screenshot = screenshot;
    this.status = 'idle';
    this.progress = 0;
    this.extractedText = null;
    this.detectedLanguage = null;
    this.suggestedActions = [];
    this.isCancelled = false;
  }

  async run() {
    this.isCancelled = false;
    this.status = 'reading_image';
    this.progress = 15;

    // Stage 1 -> Stage 2
    await new Promise((r) => setTimeout(r, 20));
    if (this.isCancelled) return;
    this.status = 'detecting_text';
    this.progress = 40;

    // Stage 2 -> Stage 3: Progressive text reveal
    await new Promise((r) => setTimeout(r, 20));
    if (this.isCancelled) return;
    this.status = 'detecting_language';
    this.progress = 70;
    this.extractedText = 'Detected: Project Deadline October 12';

    // Stage 3 -> Stage 4
    await new Promise((r) => setTimeout(r, 20));
    if (this.isCancelled) return;
    this.status = 'finding_actions';
    this.progress = 90;
    this.detectedLanguage = 'English';

    // Stage 4 -> Completed
    await new Promise((r) => setTimeout(r, 20));
    if (this.isCancelled) return;
    this.status = 'completed';
    this.progress = 100;
    this.suggestedActions = ['translate', 'reminder', 'copy'];
  }

  cancel() {
    this.isCancelled = true;
    this.status = 'cancelled';
  }

  retry() {
    return this.run();
  }
}

// Test normal completion
const engine = new PipelineEngine({ id: 'sc_test', category: 'Other' });
await engine.run();

assert.strictEqual(engine.status, 'completed');
assert.strictEqual(engine.progress, 100);
assert.notStrictEqual(engine.extractedText, null);
assert.strictEqual(engine.detectedLanguage, 'English');
assert.strictEqual(engine.suggestedActions.length, 3);
console.log('✔ Full progressive pipeline completed from 0% to 100%');
console.log('  Extracted text:', engine.extractedText);
console.log('  Detected language:', engine.detectedLanguage);
console.log('  Suggested actions:', engine.suggestedActions.join(', '));

console.log('\n=== TEST 3: Pipeline Cancellation Test ===');
const cancelEngine = new PipelineEngine({ id: 'sc_cancel' });
const runPromise = cancelEngine.run();
// Cancel after 25ms (during detecting_text stage)
setTimeout(() => {
  cancelEngine.cancel();
}, 25);
await runPromise;

assert.strictEqual(cancelEngine.status, 'cancelled');
assert.strictEqual(cancelEngine.isCancelled, true);
assert.strictEqual(cancelEngine.progress < 100, true);
console.log('✔ Pipeline safely halted on cancel at progress:', cancelEngine.progress + '%');

console.log('\n=== TEST 4: Pipeline Retry Test ===');
await cancelEngine.retry();
assert.strictEqual(cancelEngine.status, 'completed');
assert.strictEqual(cancelEngine.progress, 100);
assert.notStrictEqual(cancelEngine.extractedText, null);
console.log('✔ Retry restarted cancelled pipeline and ran to 100% completion');

console.log('\n=== ALL TASK 07 PROGRESSIVE PIPELINE TESTS PASSED! ===');
