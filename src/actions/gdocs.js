import { google } from 'googleapis';
import { getDocId, saveDocId } from '../db.js';

function normalizeCategory(category) {
  return category.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatCategory(category) {
  return category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getAuth() {
  // Check if service account is configured
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      scopes: [
        'https://www.googleapis.com/auth/keep',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
  }
  
  // Fallback to OAuth2 if service account not configured
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

  const key = normalizeCategory(category);
  const displayCategory = formatCategory(key);
  let docId = getDocId(key);

  if (!docId) {
    const doc = await drive.files.create({
      requestBody: {
        name: `Second Brain — ${displayCategory}`,
        mimeType: 'application/vnd.google-apps.document',
      },
    });
    docId = doc.data.id;
    saveDocId(key, docId);
  }

  const entry = `${title}\n${body ? body + '\n' : ''}Added: ${date}\n${'-'.repeat(40)}\n`;

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
