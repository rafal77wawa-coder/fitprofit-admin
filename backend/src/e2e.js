// Uruchamia API + zbudowany panel i sprawdza caly lancuch.
import { initDb } from './db.js';
import { createApp } from './app.js';

await initDb();
const srv = createApp().listen(0);
await new Promise((r) => srv.once('listening', r));
const base = 'http://localhost:' + srv.address().port;
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log((c ? '  OK  ' : '  XX  ') + n); };

try {
  const home = await fetch(base + '/');
  const html = await home.text();
  ok('panel laduje sie pod /', home.status === 200 && html.includes('Panel administracyjny'));
  const m = html.match(/\/assets\/[\w.-]+\.js/);
  ok('strona linkuje zbudowany bundle React', !!m);
  if (m) ok('bundle JS serwowany (200)', (await fetch(base + m[0])).status === 200);

  const login = await (await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fitprofit.app', password: 'admin123' }),
  })).json();
  ok('logowanie przez API zwraca token', !!login.token);

  const cfg = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('aplikacja pobiera konfiguracje z /api/app/config', cfg.contest && cfg.scoring.length === 4);
  console.log('\n  Wyzwanie:  ' + cfg.contest.name);
  console.log('  Punktacja: ' + cfg.scoring.map((r) => r.category + '=' + r.points_per_unit).join('  '));
} catch (e) {
  fail++; console.log('  XX  ' + e.message);
}

srv.close();
console.log('\n  ' + pass + ' OK, ' + fail + ' bledow');
process.exit(fail ? 1 : 0);
