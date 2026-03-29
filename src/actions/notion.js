import { Client } from '@notionhq/client';
import { saveNote, saveNotionDb, getNotionDbs } from '../db.js';
import { embed } from '../embeddings.js';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function saveToNotion(entities, intent) {
  const dbId = await resolveDatabase(entities, intent);

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: entities.title ?? 'Untitled' } }] },
      Tags: entities.tags?.length
        ? { multi_select: entities.tags.map((t) => ({ name: t })) }
        : undefined,
    },
    children: entities.body
      ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: entities.body } }] } }]
      : [],
  });

  const text = [entities.title, entities.body].filter(Boolean).join(' — ');
  const embedding = await embed(text);
  saveNote({ text, embedding, notionUrl: page.url, tags: entities.tags ?? [] });

  return page.url;
}

async function resolveDatabase(entities, intent) {
  if (intent === 'capture_thought') return process.env.NOTION_JOURNAL_DB_ID;

  const dbs = getNotionDbs();
  if (!dbs.length) return process.env.NOTION_INBOX_DB_ID;

  const context = dbs.map((d) => `${d.notion_id}: ${d.name} — ${d.description}`).join('\n');
  const { classify } = await import('../groq.js');

  const result = await classify(
    `Where does this belong?\nTitle: ${entities.title}\nBody: ${entities.body ?? ''}\n\nDatabases:\n${context}\n\nReply with ONLY the notion_id that fits best, or "new" if none fit.`,
    [],
    ''
  );

  const chosen = result.response?.trim();
  if (!chosen || chosen === 'new') return createDatabase(entities);

  const match = dbs.find((d) => d.notion_id === chosen);
  return match ? match.notion_id : createDatabase(entities);
}

async function createDatabase(entities) {
  const name = entities.tags?.[0] ?? 'Notes';

  const db = await notion.databases.create({
    parent: { page_id: await getRootPageId() },
    title: [{ text: { content: name } }],
    properties: {
      Name: { title: {} },
      Tags: { multi_select: {} },
    },
  });

  saveNotionDb(db.id, name, `Auto-created for ${entities.title ?? 'new content'}`);
  return db.id;
}

async function getRootPageId() {
  const res = await notion.search({ filter: { value: 'page', property: 'object' }, page_size: 1 });
  return res.results[0]?.id;
}
