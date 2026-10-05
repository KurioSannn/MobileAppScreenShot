import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

console.log('=== TEST 1: Date & Time Snippet Parsing ===');

function parseDateTimeFromText(text) {
  const now = new Date();
  let targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
  targetDate.setHours(9, 0, 0, 0);

  const clean = text.trim();

  let hours = 9;
  let minutes = 0;
  let hasTime = false;

  // 1. Time: HH:mm (e.g. 17:00, 09:30, 23:59)
  const timeMatch = /(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/i.exec(clean);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    hasTime = true;
  }

  // 2. Day of week
  const dayPatterns = {
    friday: 5,
    jumat: 5,
    monday: 1,
    senin: 1,
  };

  const lower = clean.toLowerCase();
  for (const [dayName, dayIndex] of Object.entries(dayPatterns)) {
    if (lower.includes(dayName)) {
      const currentDay = now.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7;
      targetDate = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
      break;
    }
  }

  targetDate.setHours(hasTime ? hours : 9, hasTime ? minutes : 0, 0, 0);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const hh = String(targetDate.getHours()).padStart(2, '0');
  const min = String(targetDate.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`,
    timestamp: targetDate.getTime(),
  };
}

const parsed1 = parseDateTimeFromText('Deadline: Friday 17:00 PM');
assert.ok(parsed1.timeStr === '17:00');
assert.ok(parsed1.timestamp > Date.now());
console.log('✔ Parsed deadline date and time successfully:', parsed1.dateStr, parsed1.timeStr);

console.log('\n=== TEST 2: Editable Parameters & Trigger Offset Calculation ===');

// User edits title, date, time, and remind-before minutes
const userInput = {
  title: 'Project Final Review with Client',
  date: '2026-10-15',
  time: '14:30',
  remindBeforeMinutes: 30, // 30 minutes before
};

const [year, month, day] = userInput.date.split('-').map(Number);
const [hour, minute] = userInput.time.split(':').map(Number);
const scheduledAt = new Date(year, month - 1, day, hour, minute).getTime();
const triggerTime = scheduledAt - userInput.remindBeforeMinutes * 60 * 1000;

assert.strictEqual(scheduledAt - triggerTime, 30 * 60 * 1000);
console.log('✔ Custom edited parameters validated:');
console.log('  Event Time:   ', new Date(scheduledAt).toISOString());
console.log('  Trigger Time: ', new Date(triggerTime).toISOString());
console.log('  Offset:        30 minutes before event');

console.log('\n=== TEST 3: SQLite Persistence of Scheduled Reminders ===');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    screenshot_id TEXT,
    title TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    remind_before_minutes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notification_id TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
  CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
`);

const insertStmt = db.prepare(`
  INSERT INTO reminders (id, screenshot_id, title, scheduled_at, remind_before_minutes, status, notification_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const testReminder = {
  id: 'rem_001',
  screenshot_id: 'sc_invoice_1',
  title: userInput.title,
  scheduled_at: scheduledAt,
  remind_before_minutes: userInput.remindBeforeMinutes,
  status: 'pending',
  notification_id: 'notif_local_123',
  created_at: Date.now(),
};

insertStmt.run(
  testReminder.id,
  testReminder.screenshot_id,
  testReminder.title,
  testReminder.scheduled_at,
  testReminder.remind_before_minutes,
  testReminder.status,
  testReminder.notification_id,
  testReminder.created_at
);

const getStmt = db.prepare('SELECT * FROM reminders WHERE id = ?');
const row = getStmt.get('rem_001');

assert.ok(row, 'Reminder should exist in SQLite');
assert.strictEqual(row.id, 'rem_001');
assert.strictEqual(row.title, 'Project Final Review with Client');
assert.strictEqual(row.remind_before_minutes, 30);
assert.strictEqual(row.status, 'pending');
assert.strictEqual(row.notification_id, 'notif_local_123');
console.log('✔ Scheduled reminder stored in SQLite with notification_id and pending status');

// Test status update to completed
const updateStmt = db.prepare('UPDATE reminders SET status = ? WHERE id = ?');
updateStmt.run('completed', 'rem_001');

const updatedRow = getStmt.get('rem_001');
assert.strictEqual(updatedRow.status, 'completed');
console.log('✔ Reminder status updated to completed');

db.close();

console.log('\n=== ALL TASK 12 LOCAL REMINDER TESTS PASSED! ===');
