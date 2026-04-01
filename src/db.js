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

  CREATE TABLE IF NOT EXISTS pending_captures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    body       TEXT,
    options    TEXT NOT NULL,
    step       TEXT NOT NULL DEFAULT 'awaiting_category',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS docs_registry (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE,
    doc_id   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS captures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    body       TEXT,
    category   TEXT    NOT NULL,
    source     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS capture_embeddings (
    capture_id INTEGER PRIMARY KEY,
    vector     TEXT NOT NULL,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE
  );
`);

db.exec('PRAGMA foreign_keys = ON');

// --- messages ---

const insertMessage = db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)');
const selectRecentMessages = db.prepare('SELECT role, content, created_at FROM messages ORDER BY id DESC LIMIT ?');

export function saveMessage(role, content) {
  insertMessage.run(role, content);
}

export function getHistory(limit = 15) {
  return selectRecentMessages.all(limit).reverse();
}

export function getRecentMessages(limit = 10) {
  return selectRecentMessages.all(limit).reverse();
}

// --- pending_captures ---

const insertPending = db.prepare(
  'INSERT INTO pending_captures (title, body, options, step) VALUES (?, ?, ?, ?)'
);
const selectPending = db.prepare('SELECT * FROM pending_captures ORDER BY id DESC LIMIT 1');
const updatePendingStep = db.prepare('UPDATE pending_captures SET step = ? WHERE id = ?');
const deletePending = db.prepare('DELETE FROM pending_captures WHERE id = ?');

export function savePending({ title, body, options, step = 'awaiting_category' }) {
  db.prepare('DELETE FROM pending_captures').run();
  insertPending.run(title, body ?? null, JSON.stringify(options), step);
}

export function getPending() {
  const row = selectPending.get();
  if (!row) return null;
  return { ...row, options: JSON.parse(row.options) };
}

export function updatePendingToCustom(id) {
  updatePendingStep.run('awaiting_custom', id);
}

export function clearPending() {
  db.prepare('DELETE FROM pending_captures').run();
}

// --- docs_registry ---

const upsertDoc = db.prepare(
  'INSERT INTO docs_registry (category, doc_id) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET doc_id = excluded.doc_id'
);
const getDoc = db.prepare('SELECT doc_id FROM docs_registry WHERE category = ?');

export function saveDocId(category, docId) {
  upsertDoc.run(category, docId);
}

export function getDocId(category) {
  return getDoc.get(category)?.doc_id ?? null;
}

// --- captures ---

const insertCapture = db.prepare(
  'INSERT INTO captures (title, body, category, source) VALUES (?, ?, ?, ?)'
);
const listCaptures = db.prepare(
  'SELECT id, title, body, category, created_at, source FROM captures ORDER BY id DESC LIMIT ?'
);
const listCapturesSince = db.prepare(
  'SELECT id, title, body, category, created_at, source FROM captures WHERE datetime(created_at) >= datetime(?) ORDER BY id DESC'
);

export function saveCaptureRecord({ title, body, category, source }) {
  const info = insertCapture.run(title, body ?? null, category, source ?? null);
  return info.lastInsertRowid;
}

export function getCaptures(limit = 100) {
  return listCaptures.all(limit);
}

export function getCapturesSince(dateTime) {
  return listCapturesSince.all(dateTime);
}

// --- capture_embeddings ---

const upsertEmbedding = db.prepare(
  'INSERT INTO capture_embeddings (capture_id, vector) VALUES (?, ?) ON CONFLICT(capture_id) DO UPDATE SET vector = excluded.vector'
);
const listEmbeddings = db.prepare(
  `SELECT c.id, c.title, c.body, c.category, c.created_at, c.source, e.vector
   FROM captures c
   JOIN capture_embeddings e ON e.capture_id = c.id`
);

export function saveCaptureEmbedding(captureId, vector) {
  upsertEmbedding.run(captureId, JSON.stringify(vector));
}

export function getCapturesWithEmbeddings() {
  return listEmbeddings.all().map((row) => ({
    ...row,
    vector: JSON.parse(row.vector)
  }));
}
