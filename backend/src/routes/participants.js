import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendEmail, inviteEmail, mailConfigured } from '../mailer.js';

const router = Router();

const userSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  company: z.string().max(120),
  email: z.string().email().max(160).or(z.literal('')),
  card_type: z.string().max(40),
  evs_id: z.string().max(60),
  runner_id: z.string().max(60),
  team_id: z.coerce.number().int().nullable().optional(),
});

/* Lista uczestników wyzwania z policzonymi punktami z aktywności. */
async function listParticipants(contestId) {
  const rows = await db.all(
    `SELECT p.id AS participant_id, u.id AS user_id,
            u.first_name, u.last_name, u.company, u.email,
            u.card_type, u.evs_id, u.runner_id, u.source, u.status,
            p.team_id, t.name AS team_name, p.joined_at,
            COALESCE((SELECT SUM(a.points) FROM activities a
                      WHERE a.participant_id = p.id AND a.deleted_at IS NULL), 0) AS points
       FROM participants p
       JOIN app_users u ON u.id = p.user_id
       LEFT JOIN teams t ON t.id = p.team_id
      WHERE p.contest_id = ?
      ORDER BY points DESC, u.last_name`,
    contestId
  );
  return rows.map((r) => ({ ...r, points: Number(r.points) || 0 }));
}

// GET /api/admin/participants/:contestId — lista uczestników + zespoły
router.get('/:contestId', requireAuth, async (req, res) => {
  const participants = await listParticipants(req.params.contestId);
  const teams = await db.all('SELECT id, name FROM teams WHERE contest_id = ? ORDER BY name', req.params.contestId);
  res.json({ participants, teams, mailReady: mailConfigured() });
});

/* Tworzy uczestnika: wpis w app_users + participants. Zwraca participant_id. */
async function createParticipant(contestId, d, source) {
  const ins = await db.get(
    `INSERT INTO app_users (first_name, last_name, company, email, card_type, evs_id, runner_id, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id`,
    d.first_name, d.last_name, d.company || '', d.email || '',
    d.card_type || '', d.evs_id || '', d.runner_id || '', source
  );
  const userId = Number(ins.id);
  const part = await db.get(
    'INSERT INTO participants (contest_id, user_id, team_id) VALUES (?, ?, ?) RETURNING id',
    contestId, userId, d.team_id || null
  );
  return { userId, participantId: Number(part.id) };
}

/* Tworzy token zaproszenia i (jeśli skonfigurowano) wysyła e-mail.
   Link prowadzi do APP_PUBLIC_URL (publiczny adres aplikacji) — nie do backendu. */
async function createInvite(userId, firstName, email) {
  const token = randomBytes(24).toString('hex');
  await db.run('INSERT INTO invites (user_id, token, email) VALUES (?, ?, ?)', userId, token, email);
  const base = (process.env.APP_PUBLIC_URL || '').replace(/\/+$/, '');
  const link = base + '/zaproszenie?token=' + token;
  let sent = false;
  if (email && mailConfigured()) {
    const { subject, html, text } = inviteEmail({ firstName, link });
    const r = await sendEmail({ to: email, toName: firstName, subject, html, text });
    if (r.ok) {
      sent = true;
      await db.run("UPDATE invites SET sent_at = CURRENT_TIMESTAMP WHERE token = ?", token);
    }
  }
  return { token, link, sent };
}

// POST /api/admin/participants/:contestId — dodanie pojedynczego uczestnika
router.post('/:contestId', requireAuth, async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane uczestnika.' });
  }
  const contestId = req.params.contestId;
  const { userId } = await createParticipant(contestId, parsed.data, 'manual');

  let invite = null;
  if (parsed.data.email) {
    invite = await createInvite(userId, parsed.data.first_name, parsed.data.email);
  }
  const participants = await listParticipants(contestId);
  res.json({ ok: true, participants, invite });
});

// POST /api/admin/participants/:contestId/import — import listy z CSV
router.post('/:contestId/import', requireAuth, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows) return res.status(400).json({ error: 'Brak danych do importu.' });

  const contestId = req.params.contestId;
  const teams = await db.all('SELECT id, name FROM teams WHERE contest_id = ?', contestId);
  const teamByName = {};
  for (const t of teams) teamByName[String(t.name).trim().toLowerCase()] = t.id;

  let added = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const d = {
      first_name: String(raw.first_name || raw.imie || '').trim(),
      last_name: String(raw.last_name || raw.nazwisko || '').trim(),
      company: String(raw.company || raw.firma || '').trim(),
      email: String(raw.email || '').trim(),
      card_type: String(raw.card_type || raw.karta || '').trim(),
      evs_id: String(raw.evs_id || raw.evs || '').trim(),
      runner_id: String(raw.runner_id || raw.runner || '').trim(),
    };
    if (!d.first_name || !d.last_name) {
      errors.push('Wiersz ' + (i + 1) + ': brak imienia lub nazwiska.');
      continue;
    }
    const teamName = String(raw.team || raw.zespol || '').trim().toLowerCase();
    d.team_id = teamName && teamByName[teamName] ? teamByName[teamName] : null;
    const { userId } = await createParticipant(contestId, d, 'import');
    if (d.email) await createInvite(userId, d.first_name, d.email);
    added += 1;
  }
  const participants = await listParticipants(contestId);
  res.json({ ok: true, added, errors, participants });
});

// PUT /api/admin/participants/:contestId/:userId — edycja uczestnika
router.put('/:contestId/:userId', requireAuth, async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane uczestnika.' });
  }
  const d = parsed.data;
  await db.run(
    'UPDATE app_users SET first_name=?, last_name=?, company=?, email=?, card_type=?, evs_id=?, runner_id=? WHERE id=?',
    d.first_name, d.last_name, d.company || '', d.email || '',
    d.card_type || '', d.evs_id || '', d.runner_id || '', req.params.userId
  );
  await db.run(
    'UPDATE participants SET team_id=? WHERE contest_id=? AND user_id=?',
    d.team_id || null, req.params.contestId, req.params.userId
  );
  const participants = await listParticipants(req.params.contestId);
  res.json({ ok: true, participants });
});

// POST /api/admin/participants/:contestId/:userId/invite — ponowne wysłanie zaproszenia
router.post('/:contestId/:userId/invite', requireAuth, async (req, res) => {
  const u = await db.get('SELECT id, first_name, email FROM app_users WHERE id = ?', req.params.userId);
  if (!u) return res.status(404).json({ error: 'Nie znaleziono uczestnika.' });
  if (!u.email) return res.status(400).json({ error: 'Uczestnik nie ma adresu e-mail.' });
  const invite = await createInvite(u.id, u.first_name, u.email);
  res.json({ ok: true, invite });
});

// POST /api/admin/participants/:contestId/:userId/set-password — admin nadaje hasło
router.post('/:contestId/:userId/set-password', requireAuth, async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 8) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 8 znaków.' });
  }
  const u = await db.get('SELECT id FROM app_users WHERE id = ?', req.params.userId);
  if (!u) return res.status(404).json({ error: 'Nie znaleziono uczestnika.' });

  const hash = await bcrypt.hash(password, 10);
  await db.run("UPDATE app_users SET password_hash = ?, status = 'active' WHERE id = ?", hash, u.id);
  res.json({ ok: true });
});

// DELETE /api/admin/participants/:contestId/:userId — usunięcie uczestnika
router.delete('/:contestId/:userId', requireAuth, async (req, res) => {
  await db.run('DELETE FROM app_users WHERE id = ?', req.params.userId);
  const participants = await listParticipants(req.params.contestId);
  res.json({ ok: true, participants });
});

export default router;
