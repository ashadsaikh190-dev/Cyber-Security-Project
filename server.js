import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Serve any existing .html file in project root via `/name.html`
app.get('/:name', (req, res, next) => {
  const name = req.params.name;
  if (!name.endsWith('.html')) return next();
  const filePath = join(__dirname, name);
  if (existsSync(filePath)) return res.sendFile(filePath);
  return res.status(404).send('Not found');
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn('Warning: SUPABASE_URL or SUPABASE_KEY not set. Database operations will be skipped.');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

app.post('/sos', async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

  try {
    const { error } = await supabase.from('alerts').insert([
      {
        latitude,
        longitude,
        status: 'SOS TRIGGERED',
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'database error' });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.EMAIL_TO,
      subject: 'SOS Triggered',
      text: `SOS triggered at ${mapLink} (lat: ${latitude}, lng: ${longitude})`,
      html: `<p>SOS triggered at <a href="${mapLink}" target="_blank">${mapLink}</a></p><p>Time: ${new Date().toLocaleString()}</p>`
    };

    if (process.env.EMAIL_TO && (process.env.SMTP_USER || process.env.SMTP_HOST)) {
      transporter.sendMail(mailOptions).catch(err => console.error('Email error:', err));
    }

    return res.json({ ok: true, mapLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => console.log(`Server listening on port ${port}`));
