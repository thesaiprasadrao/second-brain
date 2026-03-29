import { saveToNotion } from './actions/notion.js';
import { createEvent, createReminder, querySchedule } from './actions/gcal.js';
import { addTask, addListItem } from './actions/gtasks.js';
import { recall } from './actions/recall.js';

export async function route(intent, entities, relevantNotes) {
  switch (intent) {
    case 'capture_note':
    case 'capture_thought': {
      const url = await saveToNotion(entities, intent);
      return `Saved. ${url}`;
    }

    case 'add_task': {
      await addTask(entities);
      return `Task added: ${entities.title}`;
    }

    case 'add_list_item': {
      await addListItem(entities);
      return `Added to ${entities.list_name ?? 'list'}: ${entities.title}`;
    }

    case 'create_event': {
      const link = await createEvent(entities);
      return `Event created. ${link}`;
    }

    case 'set_reminder': {
      const link = await createReminder(entities);
      return `Reminder set. ${link}`;
    }

    case 'recall': {
      if (!relevantNotes.length) return "Nothing found on that.";
      const hits = relevantNotes
        .map((n, i) => `${i + 1}. ${n.text}${n.notionUrl ? ` — ${n.notionUrl}` : ''}`)
        .join('\n');
      return `Here's what I found:\n\n${hits}`;
    }

    case 'query_schedule': {
      const events = await querySchedule(entities);
      if (!events.length) return 'Nothing scheduled in that window.';
      const lines = events.map((e) => `• ${e.summary} — ${e.start.dateTime ?? e.start.date}`);
      return lines.join('\n');
    }

    case 'converse':
    default:
      return null; // groq response is used directly
  }
}
