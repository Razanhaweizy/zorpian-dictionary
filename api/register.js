import bcrypt from 'bcryptjs';
import { sql } from './_db.js';
import { validateUsername, validatePassword, USERNAME_RULES, PASSWORD_RULES } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { username, password } = req.body;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: `Invalid username. Rules: ${USERNAME_RULES}` });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: `Invalid password. Rules: ${PASSWORD_RULES}` });
  }

  const existing = await sql`select id from users where lower(username) = lower(${username})`;
  if (existing.length > 0) {
    return res.status(409).json({ error: 'That username is taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await sql`insert into users (username, password_hash) values (${username}, ${passwordHash})`;

  res.json({ message: `Account created. Welcome, ${username}. Now try \`login ${username} <password>\`.` });
}
