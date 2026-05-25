import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  logo_url: z.string().max(500),
  bg_image_url: z.string().max(500),
  more_info_url: z.string().max(500),
  primary_color: z.string().min(1).max(20),
});

const EMPTY = { logo_url: '', bg_image_url: '', more_info_url: '', primary_color: '#181C33' };

// GET /api/admin/branding/:contestId — nazwa, opis i branding wyzwania
router.get('/:contestId', requireAuth, async (req, res) => {
  const id = req.params.contestId;
  const contest = await db.get('SELECT name, description FROM contests WHERE id = ?', id);
  if (!contest) return res.status(404).json({ error: 'Nie znaleziono wyzwania.' });
  const b = await db.get(
    'SELECT logo_url, bg_image_url, more_info_url, primary_color FROM branding WHERE contest_id = ?',
    id
  );
  res.json({ branding: { ...contest, ...(b || EMPTY) } });
});

// PUT /api/admin/branding/:contestId — zapis nazwy, opisu i brandingu
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane brandingu.' });
  }
  const id = req.params.contestId;
  const d = parsed.data;

  const contest = await db.get('SELECT id FROM contests WHERE id = ?', id);
  if (!contest) return res.status(404).json({ error: 'Nie znaleziono wyzwania.' });

  await db.run('UPDATE contests SET name = ?, description = ? WHERE id = ?', d.name, d.description, id);
  await db.run(
    `INSERT INTO branding (contest_id, logo_url, bg_image_url, more_info_url, primary_color)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (contest_id) DO UPDATE SET
       logo_url = excluded.logo_url, bg_image_url = excluded.bg_image_url,
       more_info_url = excluded.more_info_url, primary_color = excluded.primary_color`,
    id, d.logo_url, d.bg_image_url, d.more_info_url, d.primary_color
  );

  res.json({ ok: true, branding: d });
});

export default router;
