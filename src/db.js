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
`);

// --- messages ---

const insertMessage = db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)');
const getRecentMessages = db.prepare('SELECT role, content FROM messages ORDER BY id DESC LIMIT ?');

export function saveMessage(role, content) {
  insertMessage.run(role, content);
}

export function getHistory(limit = 15) {
  return getRecentMessages.all(limit).reverse();
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
