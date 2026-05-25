import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const COLS = 'id, name, description, kind, image_url, target_amount, currency';

const schema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000),
  kind: z.enum(['common', 'individual']),
  image_url: z.string().max(500),
  target_amount: z.coerce.number().int().min(0),
  currency: z.string().min(1).max(20),
});

async function goalOf(contestId) {
  return db.get(
    'SELECT ' + COLS + ' FROM charity_goals WHERE contest_id = ? ORDER BY id LIMIT 1',
    contestId
  );
}

// GET /api/admin/charity/:contestId — cel charytatywny wyzwania
router.get('/:contestId', requireAuth, async (req, res) => {
  const goal = await goalOf(req.params.contestId);
  if (!goal) return res.status(404).json({ error: 'Brak celu charytatywnego dla tego wyzwania.' });
  res.json({ charity: goal });
});

// PUT /api/admin/charity/:contestId — zapis celu charytatywnego
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane celu charytatywnego.' });
  }
  const goal = await goalOf(req.params.contestId);
  if (!goal) return res.status(404).json({ error: 'Brak celu charytatywnego dla tego wyzwania.' });

  const d = parsed.data;
  await db.run(
    `UPDATE charity_goals SET name=?, description=?, kind=?, image_url=?, target_amount=?, currency=?
     WHERE id=?`,
    d.name, d.description, d.kind, d.image_url, d.target_amount, d.currency, goal.id
  );
  res.json({ ok: true, charity: await db.get('SELECT ' + COLS + ' FROM charity_goals WHERE id = ?', goal.id) });
});

export default router;
