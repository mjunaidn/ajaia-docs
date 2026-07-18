import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Use an in-memory database for tests so runs are isolated and disposable.
const dbPath =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(DATA_DIR, 'app.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#5B5FEF'
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled document',
    content TEXT NOT NULL DEFAULT '',
    owner_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (document_id, user_id)
  );
`);

export function seedUsersIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO users (name, email, color) VALUES (?, ?, ?)'
  );
  const seed = db.transaction((users) => {
    for (const u of users) insert.run(u.name, u.email, u.color);
  });

  seed([
    { name: 'Alex Rivera', email: 'alex@ajaia.test', color: '#5B5FEF' },
    { name: 'Jordan Kim', email: 'jordan@ajaia.test', color: '#C2542E' },
    { name: 'Sam Okafor', email: 'sam@ajaia.test', color: '#1F7A5C' },
  ]);
}

seedUsersIfEmpty();
