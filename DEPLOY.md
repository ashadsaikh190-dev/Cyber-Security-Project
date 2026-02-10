# Deploy to Vercel (Simple Static Site)

This project contains two static HTML pages and their JavaScript dependencies. No server or database required.

## Quick Deploy

1. Install Vercel CLI (one time):
```bash
npm i -g vercel
```

2. Navigate to your project folder and run:
```bash
vercel
```

3. Follow the prompts to link your GitHub account and deploy.

## Accessing Your Site

After deployment, you'll get a URL like:
- `https://your-project.vercel.app/index.html` — SOS button page
- `https://your-project.vercel.app/policedashbord.html` — Police dashboard page

## Files

- `index.html` — Women Safety SOS page with emergency button
- `policedashbord.html` — Police PCR Emergency Monitoring Dashboard
- `app.js` — SOS button logic (uses Supabase + EmailJS from CDN)
- `dashboard.js` — Dashboard logic (uses Supabase + Google Maps API from CDN)
- `.gitignore` — Git ignore file

## Notes

- All external libraries (Supabase, EmailJS, Google Maps) are loaded from CDN, so no npm install is needed.
- The site is completely static — Vercel will host it instantly.
