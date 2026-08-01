import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-too';

export function signToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
}

// Returns the username if the request has a valid token, otherwise null.
// Serverless functions are stateless between requests, so the token itself
// (not a server-side session) is what proves who's asking.
export function verifyToken(req) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET).username;
  } catch {
    return null;
  }
}

// 3-20 chars: letters, numbers, underscore, hyphen. No spaces —
// partly because the terminal UI splits commands on whitespace anyway,
// so a spaced username could never be typed there, but this makes it a
// hard rule everywhere, including direct API calls.
const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;

// 8-64 chars: letters, numbers, and a fixed set of common symbols. No spaces.
const PASSWORD_RE = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>/?~]{8,64}$/;

export function validateUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username);
}

export function validatePassword(password) {
  return typeof password === 'string' && PASSWORD_RE.test(password);
}

export const USERNAME_RULES = '3-20 characters: letters, numbers, underscores, hyphens only (no spaces).';
export const PASSWORD_RULES =
  '8-64 characters, no spaces. Letters, numbers, and !@#$%^&*()_+-=[]{}|;:,.<>/?~ are allowed.';
