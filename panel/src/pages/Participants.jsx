import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

/* Prosty parser CSV — obsługuje przecinek/średnik jako separator, pierwszy wiersz to nagłówki. */
function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(sep);
    const row = {};
    head.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

const EMPTY = { first_name: '', last_name: '', company: '', email: '', card_type: '', evs_id: '', runner_id: '', team_id: null };

export default function Participants() {
  const [contestId, setContestId] = useState(null);
  const [rows, setRows] = useState(null);
  const [teams, setTeams] = useState([]);
  const [mailReady, setMailReady] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);   // null | EMPTY (nowy) | uczestnik (edycja)
  const [pwUser, setPwUser] = useState(null);     // uczestnik, któremu admin ustawia hasło
  const [pwValue, setPwValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function reload(cid) {
    const { participants, teams, mailReady } = await api('/admin/participants/' + cid);
    setRows(participants);
    setTeams(teams || []);
    setMailReady(Boolean(mailReady));
  }

  useEffect(() => {
    (async () => {
      try {
        const { contests } = await api('/admin/contests');
        const c = contests[0];
        setContestId(c.id);
        await reload(c.id);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function teamName(id) {
    const t = teams.find((x) => x.id === id);
    return t ? t.name : '—';
  }

  async function save() {
    if (!editing.first_name.trim() || !editing.last_name.trim()) {
      setError('Imię i nazwisko są wymagane.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        first_name: editing.first_name, last_name: editing.last_name,
        company: editing.company || '', email: editing.email || '',
        card_type: editing.card_type || '', evs_id: editing.evs_id || '',
        runner_id: editing.runner_id || '',
        team_id: editing.team_id ? Number(editing.team_id) : null,
      };
      let res;
      if (editing.user_id) {
        res = await api('/admin/participants/' + contestId + '/' + editing.user_id, {
          method: 'PUT', body: JSON.stringify(payload),
        });
      } else {
        res = await api('/admin/participants/' + contestId, {
          method: 'POST', body: JSON.stringify(payload),
        });
      }
      setRows(res.participants);
      setEditing(null);
      if (res.invite) {
        setMsg(res.invite.sent
          ? 'Uczestnik dodany — zaproszenie wysłane na e-mail.'
          : 'Uczestnik dodany. Link zaproszenia: ' + res.invite.link);
      } else {
        setMsg('Zapisano.');
      }
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function remove(u) {
    if (!window.confirm('Usunąć uczestnika ' + u.first_name + ' ' + u.last_name + '?')) return;
    setBusy(true);
    try {
      const res = await api('/admin/participants/' + contestId + '/' + u.user_id, { method: 'DELETE' });
      setRows(res.participants);
      setMsg('Uczestnik usunięty.');
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function savePassword() {
    if (pwValue.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/admin/participants/' + contestId + '/' + pwUser.user_id + '/set-password', {
        method: 'POST', body: JSON.stringify({ password: pwValue }),
      });
      await reload(contestId);
      setMsg('Hasło ustawione dla: ' + pwUser.first_name + ' ' + pwUser.last_name
        + '. Przekaż je użytkownikowi: ' + pwValue);
      setPwUser(null);
      setPwValue('');
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  function genPassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPwValue(s);
  }

  async function resend(u) {
    setBusy(true);
    setError('');
    try {
      const res = await api('/admin/participants/' + contestId + '/' + u.user_id + '/invite', { method: 'POST' });
      setMsg(res.invite.sent
        ? 'Zaproszenie wysłane ponownie na ' + u.email
        : 'Link zaproszenia: ' + res.invite.link);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  function pickCsv(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const parsed = parseCsv(reader.result);
      if (!parsed.length) {
        setError('Plik CSV jest pusty lub nieczytelny.');
        return;
      }
      setBusy(true);
      setError('');
      try {
        const res = await api('/admin/participants/' + contestId + '/import', {
          method: 'POST', body: JSON.stringify({ rows: parsed }),
        });
        setRows(res.participants);
        let m = 'Zaimportowano ' + res.added + ' uczestników.';
        if (res.errors && res.errors.length) m += ' Pominięto: ' + res.errors.length + '.';
        setMsg(m);
      } catch (e) {
        setError(e.message);
      }
      setBusy(false);
    };
    reader.readAsText(file);
  }

  if (error && !rows) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!rows) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.first_name + ' ' + r.last_name + ' ' + (r.email || '')).toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🧑 Uczestnicy</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 16 }}>
        Lista uczestników wyzwania. Punkty liczone z zarejestrowanych aktywności.
        Aplikacja pokazuje tych uczestników w rankingu.
      </p>

      {!mailReady && (
        <div style={{ ...note, background: '#FFF6E5', borderColor: '#F0C36D', color: '#8A6516' }}>
          Wysyłka e-mail nie jest skonfigurowana — przy dodawaniu uczestnika z adresem
          panel pokaże link zaproszenia do skopiowania zamiast wysłać go automatycznie.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" value={query} placeholder="Szukaj po nazwisku lub e-mailu…"
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...input, flex: 1, minWidth: 200 }}
        />
        <button onClick={() => { setEditing({ ...EMPTY }); setError(''); }} style={btnPrimary}>
          + Dodaj uczestnika
        </button>
        <button onClick={() => fileRef.current && fileRef.current.click()} style={btnGhost}>
          Import z CSV
        </button>
        <input
          ref={fileRef} type="file" accept=".csv,.txt,text/csv" style={{ display: 'none' }}
          onChange={(e) => { pickCsv(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {msg && (
        <div style={{ ...note, background: '#E8F3EC', borderColor: '#9CCBA9', color: '#1E5A33', wordBreak: 'break-all' }}>
          {msg}
        </div>
      )}
      {error && rows && (
        <div style={{ ...note, background: '#FBE9E9', borderColor: '#E0A3A3', color: '#9A2A2A' }}>{error}</div>
      )}

      <div style={{ fontSize: 12, color: T.grey, marginBottom: 6 }}>
        {filtered.length} {filtered.length === 1 ? 'uczestnik' : 'uczestników'}
      </div>

      <div style={{ border: '1px solid ' + T.border, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.greyBg, textAlign: 'left' }}>
              <th style={th}>Uczestnik</th>
              <th style={th}>E-mail</th>
              <th style={th}>Zespół</th>
              <th style={{ ...th, textAlign: 'right' }}>Punkty</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user_id} style={{ borderTop: '1px solid ' + T.border }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                  <div style={{ fontSize: 11, color: T.grey }}>{u.company || '—'}</div>
                </td>
                <td style={{ ...td, color: u.email ? T.text : T.grey }}>{u.email || '—'}</td>
                <td style={td}>{teamName(u.team_id)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{u.points.toLocaleString('pl')}</td>
                <td style={td}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: u.status === 'active' ? '#E8F3EC' : '#FFF6E5',
                    color: u.status === 'active' ? '#1E5A33' : '#8A6516',
                  }}>
                    {u.status === 'active' ? 'aktywny' : 'oczekuje'}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {u.email && (
                    <button onClick={() => resend(u)} disabled={busy} style={btnMini} title="Wyślij zaproszenie ponownie">
                      ✉
                    </button>
                  )}
                  <button onClick={() => { setPwUser(u); setPwValue(''); setError(''); }} style={btnMini} title="Ustaw hasło">
                    🔑
                  </button>
                  <button onClick={() => { setEditing(u); setError(''); }} style={btnMini} title="Edytuj">✎</button>
                  <button onClick={() => remove(u)} disabled={busy} style={{ ...btnMini, color: T.red }} title="Usuń">×</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} style={{ ...td, color: T.grey, textAlign: 'center' }}>Brak uczestników.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pwUser && (
        <div style={overlay} onClick={() => setPwUser(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Ustaw hasło</h2>
            <p style={{ fontSize: 13, color: T.grey, marginBottom: 14 }}>
              Konto: <b style={{ color: T.text }}>{pwUser.first_name} {pwUser.last_name}</b>
              {pwUser.email ? ' · ' + pwUser.email : ''}
            </p>
            <p style={{ fontSize: 12, color: T.grey, marginBottom: 12, lineHeight: 1.5 }}>
              Po ustawieniu hasła konto staje się aktywne — użytkownik może zalogować się
              w aplikacji e-mailem i tym hasłem. Hasło przekaż mu samodzielnie.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" value={pwValue} placeholder="Hasło (min. 8 znaków)"
                onChange={(e) => setPwValue(e.target.value)}
                style={{ ...input, flex: 1, fontFamily: 'monospace' }}
              />
              <button onClick={genPassword} style={btnGhost}>Generuj</button>
            </div>
            {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setPwUser(null)} style={btnGhost}>Anuluj</button>
              <button onClick={savePassword} disabled={busy} style={btnPrimary}>
                {busy ? 'Zapisywanie…' : 'Ustaw hasło'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={overlay} onClick={() => setEditing(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>
              {editing.user_id ? 'Edytuj uczestnika' : 'Nowy uczestnik'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Lbl t="Imię"><input style={input} value={editing.first_name}
                onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></Lbl>
              <Lbl t="Nazwisko"><input style={input} value={editing.last_name}
                onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></Lbl>
              <Lbl t="Firma"><input style={input} value={editing.company || ''}
                onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></Lbl>
              <Lbl t="E-mail"><input style={input} value={editing.email || ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Lbl>
              <Lbl t="Rodzaj karty"><input style={input} value={editing.card_type || ''}
                onChange={(e) => setEditing({ ...editing, card_type: e.target.value })} /></Lbl>
              <Lbl t="Zespół">
                <select style={input} value={editing.team_id || ''}
                  onChange={(e) => setEditing({ ...editing, team_id: e.target.value || null })}>
                  <option value="">— brak —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Lbl>
              <Lbl t="ID EVS"><input style={input} value={editing.evs_id || ''}
                onChange={(e) => setEditing({ ...editing, evs_id: e.target.value })} /></Lbl>
              <Lbl t="ID Runner"><input style={input} value={editing.runner_id || ''}
                onChange={(e) => setEditing({ ...editing, runner_id: e.target.value })} /></Lbl>
            </div>
            {!editing.user_id && (
              <div style={{ fontSize: 11, color: T.grey, marginTop: 10, lineHeight: 1.5 }}>
                Po dodaniu uczestnik otrzyma status „oczekuje". Jeśli podasz e-mail,
                zostanie wygenerowane zaproszenie {mailReady ? '(wysłane automatycznie)' : '(link do skopiowania)'}.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={btnGhost}>Anuluj</button>
              <button onClick={save} disabled={busy} style={btnPrimary}>
                {busy ? 'Zapisywanie…' : 'Zapisz'}
              </button>
            </div>
            {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ t, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, color: T.grey, marginBottom: 3 }}>{t}</span>
      {children}
    </label>
  );
}

const input = {
  width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const th = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: T.grey, textTransform: 'uppercase' };
const td = { padding: '9px 12px', verticalAlign: 'top' };
const note = { fontSize: 12, padding: '9px 12px', borderRadius: 9, border: '1px solid', marginBottom: 12 };
const btnPrimary = {
  padding: '9px 16px', borderRadius: 10, border: 'none', background: T.navy,
  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const btnGhost = {
  padding: '9px 16px', borderRadius: 10, border: '1.5px solid ' + T.border,
  background: '#fff', color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnMini = {
  width: 28, height: 28, marginLeft: 4, borderRadius: 7, border: '1px solid ' + T.border,
  background: '#fff', color: T.text, fontSize: 14, cursor: 'pointer',
};
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(20,24,40,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
};
const modal = {
  background: '#fff', borderRadius: 16, padding: '22px 24px', width: 'min(560px, 100%)',
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
