import { google } from 'googleapis';

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
