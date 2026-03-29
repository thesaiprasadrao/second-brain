import { getNoteEmbeddings } from '../db.js';
import { embed, cosineSimilarity } from '../embeddings.js';

export async function recall(query, topK = 5) {
  const notes = getNoteEmbeddings();
  if (!notes.length) return [];

  const queryVec = await embed(query);

  return notes
    .map((note) => ({ ...note, score: cosineSimilarity(queryVec, note.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
