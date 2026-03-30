import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function saveCapture(category, title, body, date) {
  const keep = google.keep({ version: 'v1', auth: getAuth() });

  const noteTitle = `${category}: ${title}`;
  const noteBody = [body, `Added: ${date}`].filter(Boolean).join('\n\n');

  await keep.notes.create({
    requestBody: {
      title: noteTitle,
      body: { text: { text: noteBody } },
    },
  });
}
