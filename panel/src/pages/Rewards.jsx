import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

export default function Rewards() {
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
        const { rewards } = await api('/admin/rewards/' + c.id);
        setRows(rewards.map((r) => ({ ...r, _k: 'r' + r.id })));
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
    setRows([
      ...rows,
      { _k: 'n' + keyRef.current, name: '', description: '', icon: '🎁', cost: 100, stock: -1, enabled: 1 },
    ]);
    setStatus('');
  }
  function removeRow(k) {
    setRows(rows.filter((r) => r._k !== k));
    setStatus('');
  }

  async function save() {
    if (rows.some((r) => !String(r.name).trim())) {
      setError('Każda nagroda musi mieć nazwę.');
      setStatus('error');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      const payload = rows.map((r) => {
        const o = {
          name: r.name, description: r.description, icon: r.icon,
          cost: r.cost, stock: r.stock, enabled: r.enabled,
        };
        if (typeof r.id === 'number') o.id = r.id;
        return o;
      });
      const { rewards } = await api('/admin/rewards/' + contestId, {
        method: 'PUT',
        body: JSON.stringify({ rewards: payload }),
      });
      setRows(rewards.map((r) => ({ ...r, _k: 'r' + r.id })));
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
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎁 Nagrody</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Katalog nagród do wymiany za punkty. Zapis trafia do bazy; aplikacja pobiera
        włączone nagrody przez <code style={code}>GET /api/app/config</code>.
      </p>

      {rows.map((r) => (
        <div key={r._k} style={{ ...card, opacity: Number(r.enabled) === 1 ? 1 : 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <input
              type="text" value={r.icon || ''} onChange={(e) => update(r._k, 'icon', e.target.value)}
              style={{ ...input, width: 52, textAlign: 'center', fontSize: 18, flexShrink: 0 }}
            />
            <input
              type="text" value={r.name || ''} placeholder="Nazwa nagrody"
              onChange={(e) => update(r._k, 'name', e.target.value)}
              style={{ ...input, flex: 1, fontWeight: 600 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.grey, flexShrink: 0 }}>
              <input
                type="checkbox" checked={Number(r.enabled) === 1}
                onChange={(e) => update(r._k, 'enabled', e.target.checked ? 1 : 0)}
              />
              Widoczna
            </label>
            <button
              onClick={() => removeRow(r._k)} title="Usuń nagrodę"
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + T.border, background: '#fff', color: T.red, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
            >×</button>
          </div>

          <input
            type="text" value={r.description || ''} placeholder="Opis"
            onChange={(e) => update(r._k, 'description', e.target.value)}
            style={{ ...input, marginBottom: 12 }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={fieldLbl}>
              <span style={lblTxt}>Koszt (pkt)</span>
              <input type="number" min="0" value={r.cost} onChange={(e) => update(r._k, 'cost', e.target.value)} style={input} />
            </label>
            <label style={fieldLbl}>
              <span style={lblTxt}>Dostępna ilość (-1 = bez limitu)</span>
              <input type="number" min="-1" value={r.stock} onChange={(e) => update(r._k, 'stock', e.target.value)} style={input} />
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px dashed ' + T.border, background: '#fff', color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
      >
        + Dodaj nagrodę
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
            ✓ Zapisano — aplikacja korzysta z nowego katalogu
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
const fieldLbl = { display: 'block' };
const lblTxt = { display: 'block', fontSize: 11, color: T.grey, marginBottom: 4 };
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
