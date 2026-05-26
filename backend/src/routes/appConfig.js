import { Router } from 'express';
import db from '../db.js';

const router = Router();

/*
 * GET /api/app/config?contest=<slug>
 * Punkt integracji panel → aplikacja. Aplikacja FitProfit pobiera tu
 * cała efektywną konfigurację wyzwania zamiast trzymać ją w stałych.
 */
router.get('/config', async (req, res) => {
  const slug = String(req.query.contest || 'wyzwanie-vs');
  const contest = await db.get('SELECT * FROM contests WHERE slug = ?', slug);
  if (!contest) return res.status(404).json({ error: 'Nie znaleziono wyzwania.' });

  const scoring = await db.all(
    'SELECT category, enabled, points_per_unit, unit, min_threshold, fixed_bonus, bonus_max_per_day, bonus_min_interval_min, daily_point_limit, step_goal FROM scoring_rules WHERE contest_id = ?',
    contest.id
  );
  const charity = await db.get('SELECT * FROM charity_goals WHERE contest_id = ?', contest.id);
  const rewards = await db.all(
    'SELECT id, name, description, icon, image_url, codes, cost, stock FROM rewards WHERE contest_id = ? AND enabled = 1 ORDER BY cost',
    contest.id
  );
  const infoPages = await db.all('SELECT type, title, content FROM info_pages WHERE contest_id = ?', contest.id);
  const eko = await db.get('SELECT * FROM eko_settings WHERE contest_id = ?', contest.id);
  const branding = await db.get('SELECT * FROM branding WHERE contest_id = ?', contest.id);
  const join = await db.get(
    'SELECT participant_limit, entry_code, team_code_join, invite_links, regulations_url, fairplay_screen, extra_consent, work_email_domains FROM join_settings WHERE contest_id = ?',
    contest.id
  );

  // Ranking uczestników — realni ludzie z bazy, punkty sumowane z aktywności.
  const leaderboardRows = await db.all(
    `SELECT u.first_name, u.last_name, u.company, p.team_id,
            COALESCE((SELECT SUM(a.points) FROM activities a
                      WHERE a.participant_id = p.id AND a.deleted_at IS NULL), 0) AS points
       FROM participants p
       JOIN app_users u ON u.id = p.user_id
      WHERE p.contest_id = ?`,
    contest.id
  );
  const leaderboard = leaderboardRows
    .map((r) => ({
      name: r.first_name + ' ' + String(r.last_name || '').charAt(0) + '.',
      company: r.company || '',
      teamId: r.team_id,
      points: Number(r.points) || 0,
    }))
    .sort((a, b) => b.points - a.points);
  const reminder = await db.get('SELECT * FROM reminder_defaults WHERE contest_id = ?', contest.id);

  res.json({
    contest: {
      slug: contest.slug,
      name: contest.name,
      description: contest.description,
      status: contest.status,
      startDate: contest.start_date,
      endDate: contest.end_date,
      timezone: contest.timezone,
      defaultLanguage: contest.default_language,
    },
    scoring,
    charity,
    rewards,
    infoPages,
    eko,
    branding,
    join,
    leaderboard,
    reminder: reminder
      ? { ...reminder, days: String(reminder.days).split(',').filter(Boolean).map(Number) }
      : null,
  });
});

export default router;
