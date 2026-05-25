import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const COLS = 'id, name, description, icon, image_url, codes, cost, stock, enabled';

const item = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000),
  icon: z.string().max(16),
  image_url: z.string().max(900000),          // URL lub data-URL (base64) zdjęcia
  codes: z.string().max(200000),              // kody kuponów, jeden na linię
  cost: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(-1),
  enabled: z.coerce.number().int().min(0).max(1),
});

// GET /api/admin/rewards/:contestId — pełny katalog nagród (z wyłączonymi)
router.get('/:contestId', requireAuth, async (req, res) => {
  const rewards = await db.all(
    'SELECT ' + COLS + ' FROM rewards WHERE contest_id = ? ORDER BY id',
    req.params.contestId
  );
  res.json({ rewards });
});

// PUT /api/admin/rewards/:contestId — zapis katalogu (synchronizacja listy)
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = z.object({ rewards: z.array(item) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane nagród.' });
  }
  const contestId = req.params.contestId;
  const existing = (await db.all('SELECT id FROM rewards WHERE contest_id = ?', contestId))
    .map((r) => Number(r.id));
  const keep = [];

  for (const r of parsed.data.rewards) {
    if (r.id && existing.includes(Number(r.id))) {
      await db.run(
        'UPDATE rewards SET name=?, description=?, icon=?, image_url=?, codes=?, cost=?, stock=?, enabled=? WHERE id=? AND contest_id=?',
        r.name, r.description, r.icon, r.image_url, r.codes, r.cost, r.stock, r.enabled, r.id, contestId
      );
      keep.push(Number(r.id));
    } else {
      const ins = await db.get(
        'INSERT INTO rewards (contest_id, name, description, icon, image_url, codes, cost, stock, enabled) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id',
        contestId, r.name, r.description, r.icon, r.image_url, r.codes, r.cost, r.stock, r.enabled
      );
      keep.push(Number(ins.id));
    }
  }
  for (const id of existing) {
    if (!keep.includes(id)) await db.run('DELETE FROM rewards WHERE id = ?', id);
  }

  const rewards = await db.all('SELECT ' + COLS + ' FROM rewards WHERE contest_id = ? ORDER BY id', contestId);
  res.json({ ok: true, rewards });
});

export default router;
