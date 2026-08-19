# AutoJobs 🚀
 AutoJobs is an automated, self-hosted job scraping and outreach generation pipeline built for developers. It eliminates the manual grind of searching for jobs by automatically collecting roles from various boards and ATS career pages, scoring them against your highly-specific configured profile, and preparing outreach material before sending a daily HTML email digest right to your inbox.

Stop wasting time manually filtering through irrelevant roles. Build a pipeline that does the heavy lifting for you.

---

## 🛠️ Tech Stack
 AutoJobs is designed to be lightweight, fast, and easy to self-host.

### Frontend
- **React 18** via **Vite**: Blazing fast modern component framework.
- **TailwindCSS**: Utility-first CSS framework (used exclusively for the marketing/landing page).
- **React Router DOM**: Client-side routing for the Single Page Application dashboard.
- **Lucide React**: Clean, consistent icon set.

### Backend
- **Node.js & Express**: API layer and static file serving.
- **SQLite3** (`better-sqlite3`): Ultra-fast, serverless relational database configured with WAL (Write-Ahead Logging) for safe concurrent read/writes.
- **Nodemailer**: SMTP email client for daily HTML digests.
- **Node-Cron**: Native task scheduler for unattended daily pipeline execution.

### Integrations
- **Google Sheets API**: For pushing highly qualified roles into a structured spreadsheet.
- **JSearch API (RapidAPI)**: Aggregates postings from LinkedIn, Indeed, and Glassdoor.
- **Direct ATS Scraping**: Natively crawls Ashby, Greenhouse, and Lever API endpoints.

---

## 🏗️ System Architecture
 AutoJobs operates as an autonomous background pipeline broken into four distinct phases:

1. **The Collector:** Runs on a scheduled cron (or manually triggered) and polls configured ATS endpoints and external APIs to ingest thousands of raw job postings.
2. **The Scorer:** Immediately evaluates raw jobs against your active "Search Profile". It runs a rule-based engine mapping positive/negative keywords, title regexes, region restrictions, and experience tiers to assign a score from 0-100. Jobs failing baseline requirements are instantly dropped.
3. **The Outreach Generator:** For high-scoring jobs, the system automatically parses the company name and role to generate deep-linked LinkedIn Search URLs (to find the hiring manager) and formats a templated DM/Email ready for copy-pasting.
4. **The Deliverer:** 
   - Exports the finalized pipeline to a configured Google Sheet.
   - Compiles a highly-stylized HTML email digest of the day's top jobs and sends it to you via SMTP at 9:00 AM.

All of this data is surfaced through a React Dashboard where you can filter results, edit profiles, and track outreach status.

---

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have Node.js 18+ installed on your machine.

### 2. Clone & Install
```bash
git clone https://github.com/AnveshSrivastava/AutoJobs.git
cd AutoJobs
npm install
```

### 3. Environment Variables
Create a `.env` file in the **root** directory of the project.

```env
# Required for Daily Email Digests
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
# Optional SMTP overrides (defaults to Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465

# Optional - Fallback email if profile doesn't specify one
DEFAULT_EMAIL_RECIPIENT=your_email@gmail.com

# Optional - RapidAPI JSearch Key for LinkedIn/Indeed data
JSEARCH_API_KEY=your_rapidapi_key

# Optional - Google Sheets Export
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_from_url
```

### 4. Running Locally (Development)
Start the backend and frontend simultaneously:
```bash
npm run dev:server
npm run dev:client
```
Navigate to `http://localhost:5173` in your browser.

**Initial Setup Step:** By default, you have no active search profile, so the pipeline won't know what to look for. Navigate to the **Profile** tab, select a preset (e.g., "backend-node") from the dropdown at the bottom, and click "Import Preset".

### 5. Running in Production
To build the React app and serve it directly from the Express backend on port `3000`:
```bash
# Build the Vite client
cd client && npm run build
cd ..

# Start the server in production mode
NODE_ENV=production node server/index.js
```

*(For deployment on a VPS, we highly recommend using `pm2` to keep the `server/index.js` process running persistently across server reboots).*

---

## ⚠️ Security Warning

**DO NOT EXPOSE THIS APP TO THE PUBLIC INTERNET UNLESS SECURED.**
 AutoJobs has **no built-in authentication** (v1 is built as a single-player, locally hosted tool). If you expose port `3000` to the public internet on a VPS, **anyone can access your database, edit your search profiles, and see your configured SMTP credentials and email data.**

If you deploy this to a VPS, ensure you either:
1. Block port `3000` from the outside using `ufw` or `iptables`, and access it via an SSH tunnel:
   `ssh -L 3000:localhost:3000 user@your-vps-ip`
2. Run it behind a reverse proxy (like Nginx, Caddy, or Traefik) and configure Basic Authentication or OAuth in front of it.
