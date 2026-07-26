import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDS_PATH = path.join(__dirname, 'data', 'words.json');
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const EDITOR_SECRET = process.env.EDITOR_SECRET || 'change-me-please';
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- tiny JSON "database" helpers ----------
async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}
async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// in-memory session map: token -> username
// (fine for a single-instance hobby project; sessions reset on server restart)
const sessions = new Map();

function getUserFromToken(token) {
  return sessions.get(token) || null;
}

// ---------- auth middleware ----------
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const username = token && getUserFromToken(token);
  if (!username) return res.status(401).json({ error: 'Not logged in.' });
  req.username = username;
  next();
}

async function requireEditor(req, res, next) {
  const users = await readJSON(USERS_PATH);
  const user = users.find((u) => u.username === req.username);
  if (!user?.isEditor) {
    return res.status(403).json({ error: 'You need editor perms for that. Try `unlock <password>`.' });
  }
  next();
}

// ---------- auth routes ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  const users = await readJSON(USERS_PATH);
  if (users.some((u) => u.username === username)) {
    return res.status(409).json({ error: 'That username is taken.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash, isEditor: false });
  await writeJSON(USERS_PATH, users);
  res.json({ message: `Account created. Welcome, ${username}. Now try \`login ${username} <password>\`.` });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await readJSON(USERS_PATH);
  const user = users.find((u) => u.username === username);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

  const token = randomUUID();
  sessions.set(token, username);
  res.json({ token, isEditor: user.isEditor, message: `Logged in as ${username}.` });
});

app.post('/api/unlock', requireAuth, async (req, res) => {
  const { secret } = req.body;
  if (secret !== EDITOR_SECRET) {
    return res.status(403).json({ error: 'Incorrect password.' });
  }
  const users = await readJSON(USERS_PATH);
  const user = users.find((u) => u.username === req.username);
  user.isEditor = true;
  await writeJSON(USERS_PATH, users);
  res.json({ message: 'Editor perms granted. You can now use `add <word> : <meaning>`.' });
});

// ---------- dictionary routes ----------
app.get('/api/words', async (req, res) => {
  const words = await readJSON(WORDS_PATH);
  const q = (req.query.q || '').toLowerCase();
  const results = q
    ? words.filter((w) => w.word.toLowerCase().includes(q))
    : words;
  res.json(results.sort((a, b) => a.word.localeCompare(b.word)));
});

app.get('/api/words/:word', async (req, res) => {
  const words = await readJSON(WORDS_PATH);
  const entry = words.find((w) => w.word.toLowerCase() === req.params.word.toLowerCase());
  if (!entry) return res.status(404).json({ error: `No entry found for "${req.params.word}".` });
  res.json(entry);
});

app.post('/api/words', requireAuth, requireEditor, async (req, res) => {
  const { word, meaning, type } = req.body;
  if (!word || !meaning) {
    return res.status(400).json({ error: 'Both a word and a meaning are required.' });
  }
  const words = await readJSON(WORDS_PATH);
  if (words.some((w) => w.word.toLowerCase() === word.toLowerCase())) {
    return res.status(409).json({ error: `"${word}" already exists. Pick another entry.` });
  }
  words.push({ word, meaning, type: type || 'unknown', addedBy: req.username });
  await writeJSON(WORDS_PATH, words);
  res.json({ message: `Added "${word}" to the dictionary.` });
});

app.listen(PORT, () => {
  console.log(`Lexiterm backend running at http://localhost:${PORT}`);
});
