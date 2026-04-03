import { google } from 'googleapis';

function getTasks() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.tasks({ version: 'v1', auth });
}

async function getOrCreateList(tasks, listName) {
  const res = await tasks.tasklists.list();
  const existing = res.data.items?.find(
    (l) => l.title.toLowerCase() === listName.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await tasks.tasklists.insert({ requestBody: { title: listName } });
  return created.data.id;
}

export async function addTask(entities) {
  try {
    const tasks = getTasks();
    const listId = await getOrCreateList(tasks, entities.list_name ?? '@default');

    const body = {
      title: entities.title,
      notes: entities.body ?? undefined,
    };

    // Google Tasks API expects date in RFC 3339 format
    // The documentation says "due": "2019-10-01" format works
    if (entities.datetime) {
      const dueDate = new Date(entities.datetime);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (dueDate >= now) {
        // Pass just the date part
        body.due = entities.datetime;
      }
    }

    const result = await tasks.tasks.insert({
      tasklist: listId,
      requestBody: body,
    });

    return result.data.id;
  } catch (err) {
    console.error('Failed to create task:', err.message);
    throw err;
  }
}

export async function addListItem(entities) {
  const tasks = getTasks();
  const listId = await getOrCreateList(tasks, entities.list_name ?? 'Shopping');

  await tasks.tasks.insert({
    tasklist: listId,
    requestBody: { title: entities.title },
  });
}

export async function getOverdueTasks() {
  const tasks = getTasks();
  const res = await tasks.tasklists.list();
  const lists = res.data.items ?? [];

  const allTasks = await Promise.all(
    lists.map((l) =>
      tasks.tasks
        .list({ tasklist: l.id, showCompleted: false, showHidden: false })
        .then((r) => (r.data.items ?? []).map((t) => ({ ...t, listTitle: l.title })))
    )
  );

  const now = new Date();
  return allTasks.flat().filter((t) => t.due && new Date(t.due) < now);
}
