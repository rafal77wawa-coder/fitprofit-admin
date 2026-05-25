import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

const CAT = {
  foot:  { label: 'Na nogach', unit: 'km' },
  wheel: { label: 'Na kołach', unit: 'km' },
  ex:    { label: 'Ćwiczenia', unit: 'aktywność' },
  step:  { label: 'Kroki', unit: '1000 kroków' },
};

// Pola edytowalne per kategoria.
const FIELDS = [
  { key: 'points_per_unit', label: 'Punkty za jednostkę' },
  { key: 'min_threshold', label: 'Minimalny dystans (km)' },
  { key: 'fixed_bonus', label: 'Stały bonus (pkt)' },
  { key: 'bonus_max_per_day', label: 'Bonus — max razy/dzień' },
  { key: 'bonus_min_interval_min', label: 'Bonus — odstęp (min)' },
  { key: 'daily_point_limit', label: 'Dzienny limit (pkt)' },
];

export default function Scoring() {
  const [contestId, setContestId] = useState(null);
  const [rules, setRules] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { contests } = await api('/admin/contests');
        const c = contests[0];
        setContestId(c.id);
        const { rules } = await api('/admin/scoring/' + c.id);
        setRules(rules);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function setField(cat, key, value) {
    setRules(rules.map((r) => (r.category === cat ? { ...r, [key]: value } : r)));
    setStatus('');
  }

  async function save() {
    setStatus('saving');
    setError('');
    try {
      const { rules: saved } = await api('/admin/scoring/' + contestId, {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      });
      setRules(saved);
      setStatus('saved');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  if (error && !rules) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!rules) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚡ Silnik punktacji</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Reguły naliczania punktów per kategoria. Zapis trafia do bazy i jest natychmiast
        widoczny w aplikacji przez <code style={code}>GET /api/app/config</code>.
      </p>

      {rules.map((r) => {
        const meta = CAT[r.category] || { label: r.category, unit: r.unit };
        return (
          <div key={r.category} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: T.grey, background: T.greyBg, padding: '2px 8px', borderRadius: 99 }}>
                jednostka: {meta.unit}
              </span>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.grey }}>
                <input
                  type="checkbox"
                  checked={Number(r.enabled) === 1}
                  onChange={(e) => setField(r.category, 'enabled', e.target.checked ? 1 : 0)}
                />
                Kategoria aktywna
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  value={r[f.key]}
                  onChange={(v) => setField(r.category, f.key, v)}
                />
              ))}
              {r.category === 'step' && (
                <Field
                  label="Cel kroków"
                  value={r.step_goal}
                  onChange={(v) => setField('step', 'step_goal', v)}
                />
              )}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
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
            ✓ Zapisano — aplikacja już korzysta z nowych reguł
          </span>
        )}
        {status === 'error' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>{error}</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, color: T.grey, marginBottom: 4 }}>{label}</span>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 9,
          border: '1.5px solid ' + T.border, fontSize: 14, color: T.text, outline: 'none',
        }}
      />
    </label>
  );
}

const card = {
  background: T.card, border: '1px solid ' + T.border, borderRadius: 14,
  padding: '16px 18px', marginBottom: 14,
};
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
