import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function initDB(): Database.Database {
  if (db) return db;

  const dbDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(process.cwd(), 'data');
  const dbFile = process.env.DB_PATH || path.join(dbDir, 'app.db');

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbFile);
  db.pragma('journal_mode = WAL');

  return db;
}

export function getDB(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
