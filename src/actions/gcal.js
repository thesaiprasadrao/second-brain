import { google } from 'googleapis';

function getCalendar() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

export async function createEvent(entities) {
  const calendar = getCalendar();
  const start = new Date(entities.datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1hr default

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: entities.title,
      description: entities.body ?? undefined,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  return event.data.htmlLink;
}

export async function createReminder(entities) {
  const calendar = getCalendar();
  const start = new Date(entities.datetime);
  const end = new Date(start.getTime() + 15 * 60 * 1000); // 15min

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: entities.title,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
    },
  });

  return event.data.htmlLink;
}

export async function getTodayEvents() {
  const calendar = getCalendar();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items ?? [];
}

export async function querySchedule(entities) {
  const calendar = getCalendar();
  const from = entities.datetime ? new Date(entities.datetime) : new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 10,
  });

  return res.data.items ?? [];
}
