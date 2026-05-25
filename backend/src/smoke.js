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

  // edycja punktacji: panel -> API -> baza -> /api/app/config
  const cid = contests.contests[0].id;
  const hAuth = { Authorization: 'Bearer ' + login.token };
  const before = await (await fetch(base + '/api/admin/scoring/' + cid, { headers: hAuth })).json();
  const foot0 = Number(before.rules.find((r) => r.category === 'foot').points_per_unit);
  const edited = before.rules.map((r) => (r.category === 'foot' ? { ...r, points_per_unit: 9 } : r));
  const putRes = await fetch(base + '/api/admin/scoring/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ rules: edited }),
  });
  ok('zapis punktacji (PUT) zwraca 200', putRes.status === 200);
  const cfg2 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('zmiana punktacji widoczna w /api/app/config',
    Number(cfg2.scoring.find((r) => r.category === 'foot').points_per_unit) === 9);
  const noTokPut = await fetch(base + '/api/admin/scoring/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: edited }),
  });
  ok('zapis punktacji bez tokenu -> 401', noTokPut.status === 401);
  await fetch(base + '/api/admin/scoring/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ rules: before.rules }),
  });
  const cfg3 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('przywrocenie punktacji dziala',
    Number(cfg3.scoring.find((r) => r.category === 'foot').points_per_unit) === foot0);

  // edycja brandingu: panel -> API -> /api/app/config
  const b0 = await (await fetch(base + '/api/admin/branding/' + cid, { headers: hAuth })).json();
  ok('GET branding zwraca nazwe wyzwania', !!b0.branding && !!b0.branding.name);
  const name0 = b0.branding.name;
  const putB = await fetch(base + '/api/admin/branding/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ ...b0.branding, name: 'Wyzwanie TEST' }),
  });
  ok('zapis brandingu (PUT) zwraca 200', putB.status === 200);
  const cfgB = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('zmiana nazwy widoczna w /api/app/config', cfgB.contest.name === 'Wyzwanie TEST');
  const noTokB = await fetch(base + '/api/admin/branding/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...b0.branding, name: 'X' }),
  });
  ok('zapis brandingu bez tokenu -> 401', noTokB.status === 401);
  await fetch(base + '/api/admin/branding/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify(b0.branding),
  });
  const cfgB2 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('przywrocenie nazwy dziala', cfgB2.contest.name === name0);

  // edycja celu charytatywnego: panel -> API -> /api/app/config
  const ch0 = await (await fetch(base + '/api/admin/charity/' + cid, { headers: hAuth })).json();
  ok('GET charity zwraca cel', !!ch0.charity && !!ch0.charity.name);
  const target0 = ch0.charity.target_amount;
  const putC = await fetch(base + '/api/admin/charity/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ ...ch0.charity, target_amount: 12345 }),
  });
  ok('zapis celu (PUT) zwraca 200', putC.status === 200);
  const cfgC = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('zmiana celu widoczna w /api/app/config', Number(cfgC.charity.target_amount) === 12345);
  await fetch(base + '/api/admin/charity/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify(ch0.charity),
  });
  const cfgC2 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('przywrocenie celu dziala', Number(cfgC2.charity.target_amount) === Number(target0));

  // edycja katalogu nagrod: panel -> API -> /api/app/config
  const rw0 = await (await fetch(base + '/api/admin/rewards/' + cid, { headers: hAuth })).json();
  ok('GET rewards zwraca liste', Array.isArray(rw0.rewards) && rw0.rewards.length >= 1);
  const cnt0 = rw0.rewards.length;
  const editedR = rw0.rewards.map((r, i) => (i === 0 ? { ...r, cost: 7777, codes: 'KOD-AAA\nKOD-BBB', image_url: 'data:image/png;base64,AAAA' } : r));
  const putR = await fetch(base + '/api/admin/rewards/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ rewards: editedR }),
  });
  ok('zapis nagrod (PUT) zwraca 200', putR.status === 200);
  const cfgR = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('zmiana kosztu nagrody w /api/app/config', cfgR.rewards.some((r) => Number(r.cost) === 7777));
  ok('kody i zdjecie nagrody w /api/app/config', cfgR.rewards.some((r) => String(r.codes).includes('KOD-AAA') && String(r.image_url).startsWith('data:image')));
  await fetch(base + '/api/admin/rewards/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ rewards: rw0.rewards }),
  });
  const cfgR2 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('przywrocenie nagrod dziala', cfgR2.rewards.length === cnt0);

  // edycja stron informacyjnych: panel -> API -> /api/app/config
  const pg0 = await (await fetch(base + '/api/admin/pages/' + cid, { headers: hAuth })).json();
  ok('GET pages zwraca liste', Array.isArray(pg0.pages) && pg0.pages.length >= 1);
  const pcnt0 = pg0.pages.length;
  const editedP = pg0.pages.map((p, i) => (i === 0 ? { ...p, title: 'Test tytul ABC' } : p));
  const putP = await fetch(base + '/api/admin/pages/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ pages: editedP }),
  });
  ok('zapis stron (PUT) zwraca 200', putP.status === 200);
  const cfgP = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('zmiana tytulu strony w /api/app/config', cfgP.infoPages.some((p) => p.title === 'Test tytul ABC'));
  await fetch(base + '/api/admin/pages/' + cid, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...hAuth },
    body: JSON.stringify({ pages: pg0.pages }),
  });
  const cfgP2 = await (await fetch(base + '/api/app/config?contest=wyzwanie-vs')).json();
  ok('przywrocenie stron dziala', cfgP2.infoPages.length === pcnt0);
} catch (e) {
  fail++; console.log('  XX  wyjatek: ' + e.message);
}

srv.close();
console.log('\n  Wynik: ' + pass + ' OK, ' + fail + ' bledow');
process.exit(fail ? 1 : 0);
