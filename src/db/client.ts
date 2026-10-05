import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

export const DATABASE_NAME = 'snaply.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initializes the SQLite database and executes any pending idempotent migrations.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Ensure WAL mode and foreign keys
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // Run pending migrations idempotently
    const appliedRows = await db.getAllAsync<{ name: string }>(
      'SELECT name FROM _migrations'
    );
    const appliedNames = new Set(appliedRows.map((r) => r.name));

    for (const migration of MIGRATIONS) {
      if (!appliedNames.has(migration.name)) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(migration.sql);
          await db.runAsync(
            'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
            [migration.name, Date.now()]
          );
        });
      }
    }

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

/**
 * Returns the current database instance. Automatically initializes if needed.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Resets the local database by dropping all tables and reapplying migrations.
 * Corresponds to PRD Section 20 "clear local database" user privacy option.
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS _migrations;
    DROP TABLE IF EXISTS manga_regions;
    DROP TABLE IF EXISTS manga_pages;
    DROP TABLE IF EXISTS tags;
    DROP TABLE IF EXISTS reminders;
    DROP TABLE IF EXISTS entities;
    DROP TABLE IF EXISTS translations;
    DROP TABLE IF EXISTS ocr_results;
    DROP TABLE IF EXISTS screenshots;
    DROP TABLE IF EXISTS settings;
    PRAGMA foreign_keys = ON;
  `);

  dbInstance = null;
  initPromise = null;
  await initDatabase();
}
