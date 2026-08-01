import { sql } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const { word } = req.query;
  const rows = await sql`select word, meaning, type from words where lower(word) = lower(${word})`;
  if (rows.length === 0) {
    return res.status(404).json({ error: `No entry found for "${word}".` });
  }
  res.json(rows[0]);
}
