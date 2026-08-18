import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Load credentials and config
function getSheetsConfig() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  if (!credentialsPath || !spreadsheetId) {
    return null;
  }
  
  try {
    const keyFile = path.resolve(credentialsPath);
    if (!fs.existsSync(keyFile)) return null;
    return { keyFile, spreadsheetId };
  } catch (err) {
    return null;
  }
}

export function isSheetsConfigured() {
  return getSheetsConfig() !== null;
}

export async function exportJobsToSheet(jobs) {
  const config = getSheetsConfig();
  if (!config) {
    throw new Error('Google Sheets export is not configured. Missing GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: config.keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    clientOptions: {
      timeout: 15000
    }
  });

  google.options({ timeout: 15000 });
  const sheets = google.sheets({ version: 'v4', auth });

  // Convert jobs to sheet rows (2.1 spec columns: title, company, location, score, tech stack, region-friendliness, status, source, URL, salary)
  const header = ['Title', 'Company', 'Location', 'Score', 'Tech Stack', 'Region Friendly', 'Status', 'Source', 'URL', 'Salary'];
  
  const rows = jobs.map(job => [
    job.title || '',
    job.company || '',
    job.location || '',
    job.relevance_score || 0,
    job.tech_stack || '',
    job.india_friendly || '',
    job.status || '',
    job.source || '',
    job.url || '',
    job.salary || ''
  ]);

  const values = [header, ...rows];

  // For this project, we can clear the sheet and write the new filtered set,
  // or just overwrite the first sheet
  const range = 'Sheet1!A1:J'; // assuming default sheet name 'Sheet1' and up to column J (10 columns)

  // Clear existing content first to avoid ghost rows if new export is smaller
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: range
  });

  // Write new content
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
  
  return { success: true, rowsExported: rows.length };
}
