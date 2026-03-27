import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('memory.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT    NOT NULL,
    embedding  BLOB    NOT NULL,
    notion_url TEXT,
    tags       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notion_dbs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    notion_id   TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL
  );
`);

// --- messages ---

const insertMessage = db.prepare(
  'INSERT INTO messages (role, content) VALUES (?, ?)'
);

const getRecentMessages = db.prepare(
  'SELECT role, content FROM messages ORDER BY id DESC LIMIT ?'
);

export function saveMessage(role, content) {
  insertMessage.run(role, content);
}

export function getHistory(limit = 15) {
  return getRecentMessages.all(limit).reverse();
}

// --- notes ---

const insertNote = db.prepare(
  'INSERT INTO notes (text, embedding, notion_url, tags) VALUES (?, ?, ?, ?)'
);

const getAllNotes = db.prepare(
  'SELECT id, text, embedding, notion_url, tags FROM notes'
);

export function saveNote({ text, embedding, notionUrl, tags }) {
  const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);
  insertNote.run(text, embeddingBlob, notionUrl ?? null, tags ? JSON.stringify(tags) : null);
}

export function getNoteEmbeddings() {
  return getAllNotes.all().map((row) => ({
    id: row.id,
    text: row.text,
    notionUrl: row.notion_url,
    tags: row.tags ? JSON.parse(row.tags) : [],
    embedding: new Float32Array(row.embedding.buffer),
  }));
}

// --- notion_dbs ---

const upsertDb = db.prepare(`
  INSERT INTO notion_dbs (notion_id, name, description)
  VALUES (?, ?, ?)
  ON CONFLICT(notion_id) DO UPDATE SET name = excluded.name, description = excluded.description
`);

const getAllDbs = db.prepare('SELECT notion_id, name, description FROM notion_dbs');

export function saveNotionDb(notionId, name, description) {
  upsertDb.run(notionId, name, description);
}

export function getNotionDbs() {
  return getAllDbs.all();
}
