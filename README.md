# AntiGravity

AntiGravity is an automated, self-hosted job scraping and outreach generation pipeline. It collects jobs from various free boards and ATS career pages, scores them against a configurable profile, and prepares outreach material (LinkedIn search URLs, DM templates) before sending a daily HTML email digest.

## ⚠️ Security Warning

**DO NOT EXPOSE THIS APP TO THE PUBLIC INTERNET UNLESS SECURED.**

AntiGravity has **no built-in authentication**. It is designed to run locally on your machine or on a private, firewalled Virtual Private Server (VPS).

If you expose port `3000` to the public internet, **anyone can access your database, edit your search profiles, and see your configured SMTP credentials and email data.**

If you deploy this to a VPS, ensure you either:
1. Block port `3000` from the outside using `ufw` or `iptables`, and access it via an SSH tunnel:
   `ssh -L 3000:localhost:3000 user@your-vps-ip`
2. Run it behind a reverse proxy (like Nginx, Caddy, or Traefik) and configure Basic Authentication or OAuth in front of it.

## Environment Variables

Create a `.env` file in the **root** directory (next to `package.json`).

### Required
- `SMTP_USER` - The username/email for the SMTP server to send daily digests.
- `SMTP_PASS` - The password/app password for the SMTP server.
*(If these are missing, the pipeline will still collect jobs but will skip sending the email digest.)*

### Optional
- `SMTP_HOST` - The SMTP server host. Defaults to `smtp.gmail.com`.
- `SMTP_PORT` - The SMTP server port. Defaults to `465`.
- `JSEARCH_API_KEY` - A RapidAPI key for the JSearch API (LinkedIn/Indeed/Glassdoor jobs). Max 200 requests/month on the free tier. If omitted, JSearch collection is skipped smoothly.
- `GOOGLE_APPLICATION_CREDENTIALS` - Absolute path to your Google Service Account JSON key file. Required for Google Sheets export.
- `GOOGLE_SHEETS_SPREADSHEET_ID` - The ID of the Google Sheet (found in the URL) where jobs will be exported.
- `DEFAULT_EMAIL_RECIPIENT` - Fallback email address for the daily digest if the active profile doesn't specify one.

## Running Locally (Development)

1. Ensure you have Node.js 18+ installed.
2. Clone the repository and install dependencies from the root:
   ```bash
   npm install
   ```
3. Create your `.env` file in the root.
4. Start both the backend and frontend in development mode:
   ```bash
   npm run dev:server
   npm run dev:client
   ```
5. Open your browser to `http://localhost:5173` (Vite dev server).
6. **First Run Setup:** Navigate to the "Profile" tab. No profiles are active by default. Select a preset (e.g., "backend-node") from the dropdown on the bottom left and click "Import". This will create and activate your first search profile.
7. Return to the "Dashboard" tab or trigger a manual collection via the API to start scraping!

## Deployment (Unattended VPS)

To rely on the daily 9:00 AM email scheduler, you need to run AntiGravity persistently.

1. Clone the project onto your VPS.
2. Install dependencies and build the frontend:
   ```bash
   npm install
   npm run build:client
   ```
3. Create your `.env` file with SMTP credentials.

### Using PM2 (Recommended)
PM2 is a Node.js process manager that ensures the app stays running and restarts after a server reboot.

```bash
# Install PM2 globally
npm install -g pm2

# Start the server (from the root directory)
NODE_ENV=production pm2 start server/index.js --name "antigravity"

# Save the process list so it restarts on reboot
pm2 save
pm2 startup
```

The Express backend natively serves the compiled React frontend in production. 
You can access the app at `http://localhost:3000` (or via an SSH tunnel / secure reverse proxy as mentioned in the Security Warning).

**Don't forget to navigate to the Profile tab and Import/Activate a search profile!** The pipeline won't know what to scrape until a profile is active.

### Manual Maintenance
- **Data Cleanup:** The pipeline automatically deletes jobs older than 14 days and drops jobs that score below the minimum threshold every time a profile is updated. 
- **Database Backups:** All data is stored in `server/jobs.db`. Backing up this single file backs up your entire application state.
