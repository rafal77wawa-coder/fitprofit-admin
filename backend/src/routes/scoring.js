import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const COLS =
  'category, enabled, points_per_unit, unit, min_threshold, fixed_bonus, ' +
  'bonus_max_per_day, bonus_min_interval_min, daily_point_limit, step_goal';

const ruleSchema = z.object({
  category: z.enum(['foot', 'wheel', 'ex', 'step']),
  enabled: z.coerce.number().int().min(0).max(1),
  points_per_unit: z.coerce.number().min(0),
  min_threshold: z.coerce.number().min(0),
  fixed_bonus: z.coerce.number().int().min(0),
  bonus_max_per_day: z.coerce.number().int().min(0),
  bonus_min_interval_min: z.coerce.number().int().min(0),
  daily_point_limit: z.coerce.number().int().min(0),
  step_goal: z.coerce.number().int().min(0),
});

// GET /api/admin/scoring/:contestId — reguły punktacji wyzwania
router.get('/:contestId', requireAuth, async (req, res) => {
  const rules = await db.all(
    'SELECT ' + COLS + ' FROM scoring_rules WHERE contest_id = ? ORDER BY category',
    req.params.contestId
  );
  res.json({ rules });
});

// PUT /api/admin/scoring/:contestId — zapis reguł punktacji (wszystkie kategorie)
router.put('/:contestId', requireAuth, async (req, res) => {
  const parsed = z.object({ rules: z.array(ruleSchema) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane reguł punktacji.' });
  }
  const contestId = req.params.contestId;

  for (const r of parsed.data.rules) {
    await db.run(
      `UPDATE scoring_rules SET enabled=?, points_per_unit=?, min_threshold=?, fixed_bonus=?,
       bonus_max_per_day=?, bonus_min_interval_min=?, daily_point_limit=?, step_goal=?
       WHERE contest_id=? AND category=?`,
      r.enabled, r.points_per_unit, r.min_threshold, r.fixed_bonus,
      r.bonus_max_per_day, r.bonus_min_interval_min, r.daily_point_limit, r.step_goal,
      contestId, r.category
    );
  }

  const rules = await db.all(
    'SELECT ' + COLS + ' FROM scoring_rules WHERE contest_id = ? ORDER BY category',
    contestId
  );
  res.json({ ok: true, rules });
});

export default router;
