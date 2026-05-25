/*
 * Zasiewa baze kontami panelu i przykladowym wyzwaniem z konfiguracja
 * odpowiadajaca obecnym wartosciom aplikacji FitProfit.
 * Wywolywane automatycznie przez initDb(), gdy baza jest pusta.
 * Dziala na PostgreSQL i SQLite — INSERT ... RETURNING id obsluguja oba.
 */
import bcrypt from 'bcryptjs';

export async function seed(db) {
  const insAdmin = 'INSERT INTO admin_users (email, password_hash, name, role) VALUES (?, ?, ?, ?)';
  await db.run(insAdmin, 'admin@fitprofit.app', bcrypt.hashSync('admin123', 10), 'Administrator', 'admin');
  await db.run(insAdmin, 'koordynator@fitprofit.app', bcrypt.hashSync('koordynator123', 10), 'Koordynator wyzwania', 'koordynator');

  const contest = await db.get(
    `INSERT INTO contests (slug, name, description, status, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    'wyzwanie-vs',
    'Wyzwanie firmowe VanityStyle',
    'Wewnetrzne wyzwanie sportowe FitProfit — zbieraj punkty za aktywnosc i wspieraj wspolny cel.',
    'published', '2026-05-17', '2026-06-16'
  );
  const contestId = contest.id;

  await db.run(
    'INSERT INTO branding (contest_id, more_info_url, primary_color) VALUES (?, ?, ?)',
    contestId, 'https://vanitystyle.pl', '#181C33'
  );

  const insRule = `INSERT INTO scoring_rules
    (contest_id, category, enabled, points_per_unit, unit, min_threshold,
     fixed_bonus, bonus_max_per_day, bonus_min_interval_min, daily_point_limit, step_goal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  await db.run(insRule, contestId, 'foot',  1, 6,   'km',       1.5, 10, 2, 30, 100, 0);
  await db.run(insRule, contestId, 'wheel', 1, 2,   'km',       0,   0,  0, 0,  100, 0);
  await db.run(insRule, contestId, 'ex',    1, 1,   'activity', 0,   0,  0, 0,  100, 0);
  await db.run(insRule, contestId, 'step',  1, 1.6, 'step1000', 0,   10, 1, 0,  100, 10000);

  await db.run(
    'INSERT INTO join_settings (contest_id, entry_code, fairplay_screen, invite_links) VALUES (?, ?, 1, 1)',
    contestId, 'VS2026'
  );

  const goal = await db.get(
    `INSERT INTO charity_goals (contest_id, name, description, kind, target_amount, currency)
     VALUES (?, ?, ?, 'common', 19000, 'pkt') RETURNING id`,
    contestId, 'Schronisko na Paluchu',
    'Wspolna zbiorka punktow firmy na pomoc zwierzetom ze schroniska.'
  );
  const insConv = 'INSERT INTO charity_converters (charity_goal_id, category, metric, ratio) VALUES (?, ?, ?, ?)';
  for (const c of ['foot', 'wheel', 'ex', 'step']) await db.run(insConv, goal.id, c, 'points', 1);

  const insReward = 'INSERT INTO rewards (contest_id, name, description, icon, cost) VALUES (?, ?, ?, ?, ?)';
  await db.run(insReward, contestId, 'Kupon QlturaProfit', 'Dostep do wydarzen kulturalnych', 'K', 800);
  await db.run(insReward, contestId, 'Voucher -50% Prezent Marzen', 'Na jeden prezent z katalogu', 'V', 400);
  await db.run(insReward, contestId, '-40% na DOZ.pl', 'Apteka i zdrowie online', 'D', 600);
  await db.run(insReward, contestId, 'Bon Decathlon 50 zl', 'Na sprzet sportowy', 'B', 1200);

  const insPage = 'INSERT INTO info_pages (contest_id, type, title, content) VALUES (?, ?, ?, ?)';
  await db.run(insPage, contestId, 'rules', 'Zasady', 'Zasady punktacji wyzwania FitProfit.');
  await db.run(insPage, contestId, 'rewards', 'Nagrody', 'Wymieniaj punkty na kupony i vouchery.');
  await db.run(insPage, contestId, 'custom', 'Regulamin', 'Regulamin wyzwania firmowego.');

  await db.run(
    'INSERT INTO eko_settings (contest_id, enabled, auto_mark_commute, manual_mark_allowed, commute_bonus) VALUES (?, 1, 1, 1, 25)',
    contestId
  );
  const insEko = 'INSERT INTO eko_transport_factors (contest_id, transport, kg_per_km) VALUES (?, ?, ?)';
  await db.run(insEko, contestId, 'Pojazd diesel', 0.171);
  await db.run(insEko, contestId, 'Pojazd na paliwo', 0.192);
  await db.run(insEko, contestId, 'Pojazd hybrydowy', 0.106);
  await db.run(insEko, contestId, 'Pojazd elektryczny', 0.053);
  await db.run(insEko, contestId, 'Transport publiczny', 0.041);

  await db.run(
    "INSERT INTO reminder_defaults (contest_id, enabled, time, days, bonus) VALUES (?, 1, '08:00', '0,1,2,3,4', 25)",
    contestId
  );

  const insTask = 'INSERT INTO onboarding_tasks (contest_id, task_key, label, required, completed) VALUES (?, ?, ?, ?, ?)';
  await db.run(insTask, contestId, 'survey', 'Wstepna ankieta', 1, 1);
  await db.run(insTask, contestId, 'branding', 'Uzupelnij logo, zdjecie i opis', 1, 0);
  await db.run(insTask, contestId, 'rules', 'Zapoznaj sie z zasadami gry', 1, 0);
  await db.run(insTask, contestId, 'scoring', 'Skonfiguruj silnik punktacji', 1, 1);
  await db.run(insTask, contestId, 'charity', 'Dodaj cel charytatywny', 0, 1);
  await db.run(insTask, contestId, 'invite', 'Zapros uczestnikow', 1, 0);
}
