// Test dymny — uruchamia API na losowym porcie, sprawdza endpointy, konczy.
import { initDb } from './db.js';
import { createApp } from './app.js';

await initDb();
const srv = createApp().listen(0);
await new Promise((r) => srv.once('listening', r));
const base = 'http://localhost:' + srv.address().port;
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log((c ? '  OK  ' : '  XX  ') + n); };

try {
  const health = await (await fetch(base + '/api/health')).json();
  ok('health zwraca ok', health.ok === true);

  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fitprofit.app', password: 'admin123' }),
  });
  const login = await loginRes.json();
  ok('login poprawnymi danymi zwraca token', loginRes.status === 200 && !!login.token);
  ok('login zwraca role admina', login.user && login.user.role === 'admin');

  const bad = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fitprofit.app', password: 'zle' }),
  });
  ok('login blednym haslem -> 401', bad.status === 401);

  const me = await (await fetch(base + '/api/auth/me', {
    headers: { Authorization: 'Bearer ' + login.token },
  })).json();
  ok('/auth/me z tokenem zwraca usera', me.user && me.user.email === 'admin@fitprofit.app');

  const noTok = await fetch(base + '/api/admin/contests');
  ok('endpoint panelu bez tokenu -> 401', noTok.status === 401);

  const withTok = await fetch(base + '/api/admin/contests', {
    headers: { Authorization: 'Bearer ' + login.token },
  });
  const contests = await withTok.json();
  ok('endpoint panelu z tokenem zwraca wyzwania', withTok.status === 200 && contests.contests.length >= 1);

  const cfg = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('app/config zwraca wyzwanie', cfg.contest && cfg.contest.name.includes('VanityStyle'));
  ok('app/config zwraca 4 reguly punktacji', cfg.scoring.length === 4);
  const foot = cfg.scoring.find((r) => r.category === 'foot');
  ok('regula foot = 6 pkt/km, limit 100', Number(foot.points_per_unit) === 6 && Number(foot.daily_point_limit) === 100);
  ok('app/config zwraca cel charytatywny 19000', cfg.charity && Number(cfg.charity.target_amount) === 19000);
  ok('app/config zwraca nagrody', cfg.rewards.length >= 1);
} catch (e) {
  fail++; console.log('  XX  wyjatek: ' + e.message);
}

srv.close();
console.log('\n  Wynik: ' + pass + ' OK, ' + fail + ' bledow');
process.exit(fail ? 1 : 0);
