# Deploying to Vercel

This project contains static front-end files and a server-side `POST /sos` handler implemented as a Vercel Serverless Function.

Required environment variables (set in Vercel dashboard):

- `SUPABASE_URL` - your Supabase project URL (optional but required for DB inserts)
- `SUPABASE_KEY` - your Supabase service/public key (optional)
- `SMTP_HOST` - SMTP host for sending email (optional)
- `SMTP_PORT` - SMTP port (default 587)
- `SMTP_SECURE` - `true` or `false` (default false)
- `SMTP_USER` - SMTP username (optional)
- `SMTP_PASS` - SMTP password (optional)
- `EMAIL_TO` - recipient address for SOS emails
- `EMAIL_FROM` - sender address for SOS emails

Deployment steps:

1. Install Vercel CLI (optional):
   ```bash
   npm i -g vercel
   ```
2. From this project root run:
   ```bash
   vercel
   ```

Notes:
- Static files (like `index.html`, `policedashbord.html`, `app.js`, `dashboard.js`) are served as static assets.
- The server logic is in `api/sos.js`; requests to `/sos` are rewritten to `/api/sos` by `vercel.json`.
- Locally you can continue using `node server.js` for development, but Vercel will ignore `server.js` and use the serverless function instead.
