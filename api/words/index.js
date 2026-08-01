import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const q = (req.query.q || '').toString();
    const rows = q
      ? await sql`select word, meaning, type from words where word ilike ${'%' + q + '%'} order by word`
      : await sql`select word, meaning, type from words order by word`;
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const username = verifyToken(req);
    if (!username) return res.status(401).json({ error: 'Not logged in.' });

    const userRows = await sql`select is_editor from users where username = ${username}`;
    if (!userRows[0]?.is_editor) {
      return res.status(403).json({ error: 'You need editor perms for that. Try `unlock <password>`.' });
    }

    const { word, meaning, type } = req.body;
    if (!word || !meaning) {
      return res.status(400).json({ error: 'Both a word and a meaning are required.' });
    }

    const existing = await sql`select id from words where lower(word) = lower(${word})`;
    if (existing.length > 0) {
      return res.status(409).json({ error: `"${word}" already exists. Pick another entry.` });
    }

    await sql`insert into words (word, meaning, type, added_by)
              values (${word}, ${meaning}, ${type || null}, ${username})`;
    return res.json({ message: `Added "${word}" to the dictionary.` });
  }

  res.status(405).json({ error: 'Method not allowed.' });
}
