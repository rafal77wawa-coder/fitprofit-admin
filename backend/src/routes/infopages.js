import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const COLS = 'id, type, title, content';

const item = z.object({
  id: z.coerce.number().int().optional(),
  type: z.enum(['rules', 'rewards', 'custom']),
  title: z.string().min(1).max(160),
  content: z.string().max(20000),
});

// GET /api/admin/pages/:contestId — strony informacyjne wyzwania
router.get('/:contestId', requireAuth, async (req, res) => {
  const pages = await db.all(
    'SELECT ' + COLS + ' FROM info_pages WHERE contest_id = ? ORDER BY id',
    req.params.contestId
  );
  res.json({ pages });
});

// PUT /api/admin/pages/:contestId — zapis stron (synchronizacja listy)
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = z.object({ pages: z.array(item) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane stron informacyjnych.' });
  }
  const contestId = req.params.contestId;
  const existing = (await db.all('SELECT id FROM info_pages WHERE contest_id = ?', contestId))
    .map((p) => Number(p.id));
  const keep = [];

  for (const p of parsed.data.pages) {
    if (p.id && existing.includes(Number(p.id))) {
      await db.run(
        'UPDATE info_pages SET type=?, title=?, content=? WHERE id=? AND contest_id=?',
        p.type, p.title, p.content, p.id, contestId
      );
      keep.push(Number(p.id));
    } else {
      const ins = await db.get(
        'INSERT INTO info_pages (contest_id, type, title, content) VALUES (?,?,?,?) RETURNING id',
        contestId, p.type, p.title, p.content
      );
      keep.push(Number(ins.id));
    }
  }
  for (const id of existing) {
    if (!keep.includes(id)) await db.run('DELETE FROM info_pages WHERE id = ?', id);
  }

  const pages = await db.all('SELECT ' + COLS + ' FROM info_pages WHERE contest_id = ? ORDER BY id', contestId);
  res.json({ ok: true, pages });
});

export default router;
