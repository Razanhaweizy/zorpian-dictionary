import bcrypt from 'bcryptjs';
import { sql } from './_db.js';
import { signToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { username, password } = req.body;
  const rows = await sql`select * from users where lower(username) = lower(${username})`;
  const user = rows[0];
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

  const token = signToken(user.username);
  res.json({ token, isEditor: user.is_editor, message: `Logged in as ${user.username}.` });
}
