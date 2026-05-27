import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import db from '../db.js';
import { sendEmail, resetEmail, mailConfigured } from '../mailer.js';

const router = Router();

const TOKEN_TTL = '30d';
function appSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}
function signUserToken(user) {
  return jwt.sign({ uid: user.id, email: user.email, kind: 'app' }, appSecret(), { expiresIn: TOKEN_TTL });
}

/* Middleware: weryfikuje token sesji użytkownika aplikacji. */
export function requireAppUser(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const payload = jwt.verify(token, appSecret());
    if (payload.kind !== 'app') throw new Error('zły typ tokenu');
    req.appUser = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Wymagane logowanie.' });
  }
}

/* Buduje publiczny profil użytkownika dla aplikacji. */
async function userProfile(userId) {
  const u = await db.get(
    'SELECT id, first_name, last_name, company, email, display_name, display_mode FROM app_users WHERE id = ?',
    userId
  );
  if (!u) return null;
  const part = await db.get(
    'SELECT id, contest_id, team_id FROM participants WHERE user_id = ? ORDER BY id LIMIT 1',
    userId
  );
  let points = 0;
  if (part) {
    const row = await db.get(
      'SELECT COALESCE(SUM(points),0) AS pts FROM activities WHERE participant_id = ? AND deleted_at IS NULL',
      part.id
    );
    points = Number(row.pts) || 0;
  }
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    company: u.company,
    email: u.email,
    displayName: u.display_name || (u.first_name + ' ' + String(u.last_name || '').charAt(0) + '.'),
    points,
    teamId: part ? part.team_id : null,
    contestId: part ? part.contest_id : null,
  };
}

// GET /api/app/invite/:token — sprawdza zaproszenie, zwraca dane do powitania
router.get('/invite/:token', async (req, res) => {
  const inv = await db.get(
    "SELECT i.*, u.first_name, u.last_name, u.status FROM invites i JOIN app_users u ON u.id = i.user_id WHERE i.token = ? AND i.kind = 'invite'",
    req.params.token
  );
  if (!inv) return res.status(404).json({ error: 'Zaproszenie nie istnieje lub wygasło.' });
  if (inv.accepted_at) {
    return res.status(409).json({ error: 'used', message: 'To zaproszenie zostało już wykorzystane.' });
  }
  res.json({ ok: true, firstName: inv.first_name, lastName: inv.last_name, email: inv.email });
});

// POST /api/app/register — aktywacja konta przez zaproszenie (ustawienie hasła)
const registerSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 8 znaków.' });
  }
  const { token, password } = parsed.data;
  const inv = await db.get("SELECT * FROM invites WHERE token = ? AND kind = 'invite'", token);
  if (!inv) return res.status(404).json({ error: 'Zaproszenie nie istnieje lub wygasło.' });
  if (inv.accepted_at) return res.status(409).json({ error: 'To zaproszenie zostało już wykorzystane.' });

  const hash = await bcrypt.hash(password, 10);
  await db.run("UPDATE app_users SET password_hash = ?, status = 'active' WHERE id = ?", hash, inv.user_id);
  await db.run('UPDATE invites SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?', inv.id);

  const user = await db.get('SELECT id, email FROM app_users WHERE id = ?', inv.user_id);
  const profile = await userProfile(user.id);
  res.json({ ok: true, token: signUserToken(user), user: profile });
});

// POST /api/app/login — logowanie e-mail + hasło
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Podaj e-mail i hasło.' });

  const user = await db.get('SELECT id, email, password_hash, status FROM app_users WHERE LOWER(email) = LOWER(?)', parsed.data.email);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
  }
  const okPass = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!okPass) return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.' });

  const profile = await userProfile(user.id);
  res.json({ ok: true, token: signUserToken(user), user: profile });
});

// GET /api/app/me — profil zalogowanego użytkownika
router.get('/me', requireAppUser, async (req, res) => {
  const profile = await userProfile(req.appUser.uid);
  if (!profile) return res.status(404).json({ error: 'Nie znaleziono konta.' });
  res.json({ ok: true, user: profile });
});

// POST /api/app/forgot — wysyła maila z linkiem resetu hasła
router.post('/forgot', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  // Zawsze odpowiadamy tak samo — nie zdradzamy, czy adres istnieje w bazie.
  const generic = { ok: true, message: 'Jeśli konto istnieje, wysłaliśmy link do resetu hasła.' };
  if (!email) return res.json(generic);

  const user = await db.get('SELECT id, first_name, email FROM app_users WHERE LOWER(email) = LOWER(?)', email);
  if (!user) return res.json(generic);

  const token = randomBytes(24).toString('hex');
  await db.run(
    "INSERT INTO invites (user_id, token, email, kind) VALUES (?, ?, ?, 'reset')",
    user.id, token, user.email
  );
  if (mailConfigured()) {
    const base = (process.env.APP_PUBLIC_URL || '').replace(/\/+$/, '');
    const link = base + '/reset?token=' + token;
    const { subject, html, text } = resetEmail({ firstName: user.first_name, link });
    const r = await sendEmail({ to: user.email, toName: user.first_name, subject, html, text });
    if (r.ok) await db.run('UPDATE invites SET sent_at = CURRENT_TIMESTAMP WHERE token = ?', token);
  }
  res.json(generic);
});

// POST /api/app/reset — ustawia nowe hasło na podstawie tokenu resetu
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});
router.post('/reset', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 8 znaków.' });
  }
  const inv = await db.get("SELECT * FROM invites WHERE token = ? AND kind = 'reset'", parsed.data.token);
  if (!inv) return res.status(404).json({ error: 'Link resetu jest nieprawidłowy lub wygasł.' });
  if (inv.accepted_at) return res.status(409).json({ error: 'Ten link został już wykorzystany.' });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await db.run("UPDATE app_users SET password_hash = ?, status = 'active' WHERE id = ?", hash, inv.user_id);
  await db.run('UPDATE invites SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?', inv.id);
  res.json({ ok: true });
});

export default router;
