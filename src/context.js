import { getHistory, getCapturesWithEmbeddings } from './db.js';
import { embed, cosineSimilarity } from './embeddings.js';

export function buildContext() {
  return { history: getHistory(15) };
}

export async function buildRecallContext(query, limit = 5) {
  const history = getHistory(15);
  const captures = getCapturesWithEmbeddings();
  if (!captures.length) return { history, recall: [] };

  const q = await embed(query);
  const scored = captures.map((c) => ({
    ...c,
    score: cosineSimilarity(q, c.vector)
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map((c) => ({
    title: c.title,
    body: c.body,
    category: c.category,
    created_at: c.created_at,
    score: c.score
  }));

  return { history, recall: top };
}
