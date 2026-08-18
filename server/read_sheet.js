import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function verify() {
  const auth = new google.auth.GoogleAuth({
    keyFile: '/Users/anvesh/Documents/Codes/Job-scraper-Node/creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1_kNkvkYOcZPBDckhzXWDLMXJBTAWOR4f5O83H9ZbSh8',
    range: 'Sheet1!A1:J',
  });
  console.log("Sheet Headers:", res.data.values[0]);
  console.log(`Total Rows (including header): ${res.data.values.length}`);
  console.log("First Data Row:", res.data.values[1]);
}
verify().catch(console.error);
