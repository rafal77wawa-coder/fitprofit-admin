import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const schema = z.object({
  participant_limit: z.number().int().min(0).nullable(),
  entry_code: z.string().max(64),
  team_code_join: z.coerce.number().int().min(0).max(1),
  invite_links: z.coerce.number().int().min(0).max(1),
  regulations_url: z.string().max(500),
  fairplay_screen: z.coerce.number().int().min(0).max(1),
  extra_consent: z.string().max(4000),
  work_email_domains: z.string().max(2000),
});

const COLS =
  'participant_limit, entry_code, team_code_join, invite_links, regulations_url, fairplay_screen, extra_consent, work_email_domains';

const EMPTY = {
  participant_limit: null, entry_code: '', team_code_join: 0, invite_links: 1,
  regulations_url: '', fairplay_screen: 1, extra_consent: '', work_email_domains: '',
};

// GET /api/admin/join/:contestId — ustawienia dołączania do wyzwania
router.get('/:contestId', requireAuth, async (req, res) => {
  const row = await db.get('SELECT ' + COLS + ' FROM join_settings WHERE contest_id = ?', req.params.contestId);
  res.json({ join: row || EMPTY });
});

// PUT /api/admin/join/:contestId — zapis ustawień dołączania
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane ustawień dołączania.' });
  }
  const id = req.params.contestId;
  const d = parsed.data;

  const contest = await db.get('SELECT id FROM contests WHERE id = ?', id);
  if (!contest) return res.status(404).json({ error: 'Nie znaleziono wyzwania.' });

  await db.run(
    `INSERT INTO join_settings
       (contest_id, participant_limit, entry_code, team_code_join, invite_links, regulations_url, fairplay_screen, extra_consent, work_email_domains)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (contest_id) DO UPDATE SET
       participant_limit = excluded.participant_limit,
       entry_code = excluded.entry_code,
       team_code_join = excluded.team_code_join,
       invite_links = excluded.invite_links,
       regulations_url = excluded.regulations_url,
       fairplay_screen = excluded.fairplay_screen,
       extra_consent = excluded.extra_consent,
       work_email_domains = excluded.work_email_domains`,
    id, d.participant_limit, d.entry_code, d.team_code_join, d.invite_links,
    d.regulations_url, d.fairplay_screen, d.extra_consent, d.work_email_domains
  );

  res.json({ ok: true, join: d });
});

export default router;
