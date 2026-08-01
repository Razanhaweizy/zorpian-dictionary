import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const username = verifyToken(req);
  if (!username) return res.status(401).json({ error: 'Not logged in.' });

  const { secret } = req.body;
  if (secret !== process.env.EDITOR_SECRET) {
    return res.status(403).json({ error: 'Incorrect password.' });
  }

  await sql`update users set is_editor = true where username = ${username}`;
  res.json({ message: 'Editor perms granted. You can now use `add <word> : <meaning>`.' });
}
