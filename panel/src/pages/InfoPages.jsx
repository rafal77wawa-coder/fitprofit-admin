import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

const TYPES = [
  { value: 'rules', label: 'Zasady' },
  { value: 'rewards', label: 'Nagrody' },
  { value: 'custom', label: 'Własna' },
];

export default function InfoPages() {
  const [contestId, setContestId] = useState(null);
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const keyRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const { contests } = await api('/admin/contests');
        const c = contests[0];
        setContestId(c.id);
        const { pages } = await api('/admin/pages/' + c.id);
        setRows(pages.map((p) => ({ ...p, _k: 'p' + p.id })));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function update(k, field, value) {
    setRows(rows.map((r) => (r._k === k ? { ...r, [field]: value } : r)));
    setStatus('');
  }
  function addRow() {
    keyRef.current += 1;
    setRows([...rows, { _k: 'n' + keyRef.current, type: 'custom', title: '', content: '' }]);
    setStatus('');
  }
  function removeRow(k) {
    setRows(rows.filter((r) => r._k !== k));
    setStatus('');
  }

  async function save() {
    if (rows.some((r) => !String(r.title).trim())) {
      setError('Każda strona musi mieć tytuł.');
      setStatus('error');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      const payload = rows.map((r) => {
        const o = { type: r.type, title: r.title, content: r.content };
        if (typeof r.id === 'number') o.id = r.id;
        return o;
      });
      const { pages } = await api('/admin/pages/' + contestId, {
        method: 'PUT',
        body: JSON.stringify({ pages: payload }),
      });
      setRows(pages.map((p) => ({ ...p, _k: 'p' + p.id })));
      setStatus('saved');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  if (error && !rows) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!rows) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📄 Strony informacyjne</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Teksty Zasad, Regulaminu i innych stron pomocy. Aplikacja pobiera je przez{' '}
        <code style={code}>GET /api/app/config</code> i wyświetla w sekcji informacyjnej.
      </p>

      {rows.map((r) => (
        <div key={r._k} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <select
              value={r.type}
              onChange={(e) => update(r._k, 'type', e.target.value)}
              style={{ ...input, width: 120, flexShrink: 0 }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              type="text" value={r.title || ''} placeholder="Tytuł strony"
              onChange={(e) => update(r._k, 'title', e.target.value)}
              style={{ ...input, flex: 1, fontWeight: 600 }}
            />
            <button
              onClick={() => removeRow(r._k)} title="Usuń stronę"
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + T.border, background: '#fff', color: T.red, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
            >×</button>
          </div>
          <textarea
            value={r.content || ''} placeholder="Treść strony"
            onChange={(e) => update(r._k, 'content', e.target.value)}
            rows={6}
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
      ))}

      <button
        onClick={addRow}
        style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px dashed ' + T.border, background: '#fff', color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
      >
        + Dodaj stronę
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={save}
          disabled={status === 'saving'}
          style={{
            padding: '11px 22px', borderRadius: 11, border: 'none', background: T.navy,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            opacity: status === 'saving' ? 0.6 : 1,
          }}
        >
          {status === 'saving' ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
        {status === 'saved' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>
            ✓ Zapisano — aplikacja pokazuje nowe teksty
          </span>
        )}
        {status === 'error' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>{error}</span>
        )}
      </div>
    </div>
  );
}

const card = {
  background: T.card, border: '1px solid ' + T.border, borderRadius: 14,
  padding: '16px 18px', marginBottom: 12,
};
const input = {
  width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
