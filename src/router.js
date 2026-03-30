import { createEvent, createReminder, querySchedule } from './actions/gcal.js';
import { addTask, addListItem } from './actions/gtasks.js';

export async function route(intent, entities) {
  switch (intent) {
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

    case 'query_schedule': {
      const events = await querySchedule(entities);
      if (!events.length) return 'Nothing scheduled in that window.';
      return events.map((e) => `• ${e.summary} — ${e.start.dateTime ?? e.start.date}`).join('\n');
    }

    case 'converse':
    default:
      return null;
  }
}
