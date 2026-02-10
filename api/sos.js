import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { latitude, longitude } = req.body || {};
  if (latitude == null || longitude == null) {
    res.status(400).json({ error: 'latitude and longitude required' });
    return;
  }

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

  const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

  try {
    if (supabase) {
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
        // continue — don't fail entirely if DB insert fails
      }
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

    return res.status(200).json({ ok: true, mapLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
}
