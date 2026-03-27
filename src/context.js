import { getHistory, getNoteEmbeddings, getNotionDbs } from './db.js';
import { embed, cosineSimilarity } from './embeddings.js';

export async function buildContext(userText, intent) {
  const history = getHistory(15);
  const notionDbContext = getNotionDbs()
    .map((d) => `${d.name} — ${d.description}`)
    .join('\n');

  let relevantNotes = [];
  if (intent === 'recall') {
    relevantNotes = await getTopNotes(userText, 5);
  }

  return { history, notionDbContext, relevantNotes };
}

async function getTopNotes(query, topK) {
  const notes = getNoteEmbeddings();
  if (!notes.length) return [];

  const queryVec = await embed(query);

  return notes
    .map((note) => ({ ...note, score: cosineSimilarity(queryVec, note.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
