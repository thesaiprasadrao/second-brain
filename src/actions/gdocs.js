import { google } from 'googleapis';
import { getDocId, saveDocId } from '../db.js';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function saveCapture(category, title, body, date) {
  const docs = google.docs({ version: 'v1', auth: getAuth() });
  const drive = google.drive({ version: 'v3', auth: getAuth() });

  let docId = getDocId(category);

  if (!docId) {
    const doc = await drive.files.create({
      requestBody: {
        name: `Second Brain — ${category}`,
        mimeType: 'application/vnd.google-apps.document',
      },
    });
    docId = doc.data.id;
    saveDocId(category, docId);
  }

  const entry = `${title}\n${body ? body + '\n' : ''}Added: ${date}\n${'─'.repeat(40)}\n`;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: entry,
          },
        },
      ],
    },
  });
}
