import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

export default function Charity() {
  const [contestId, setContestId] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { contests } = await api('/admin/contests');
        const c = contests[0];
        setContestId(c.id);
        const { charity } = await api('/admin/charity/' + c.id);
        setData(charity);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function setField(key, value) {
    setData({ ...data, [key]: value });
    setStatus('');
  }

  async function save() {
    setStatus('saving');
    setError('');
    try {
      const { charity } = await api('/admin/charity/' + contestId, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          kind: data.kind,
          image_url: data.image_url,
          target_amount: data.target_amount,
          currency: data.currency,
        }),
      });
      setData(charity);
      setStatus('saved');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  if (error && !data) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!data) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>❤️ Cel charytatywny</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Wspólny cel, na który uczestnicy zbierają punkty. Zapis trafia do bazy i jest
        dostępny dla aplikacji przez <code style={code}>GET /api/app/config</code>.
      </p>

      <div style={card}>
        <Field label="Nazwa celu" hint="Np. organizacja lub akcja, którą wspieracie.">
          <input type="text" value={data.name || ''} onChange={(e) => setField('name', e.target.value)} style={input} />
        </Field>

        <Field label="Opis" hint="Krótko, na czym polega cel.">
          <textarea
            value={data.description || ''}
            onChange={(e) => setField('description', e.target.value)}
            rows={3}
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Cel (ilość)" hint="Próg do osiągnięcia.">
            <input
              type="number" min="0" step="1"
              value={data.target_amount}
              onChange={(e) => setField('target_amount', e.target.value)}
              style={input}
            />
          </Field>
          <Field label="Jednostka" hint="Np. pkt, zł, kg.">
            <input type="text" value={data.currency || ''} onChange={(e) => setField('currency', e.target.value)} style={input} />
          </Field>
        </div>

        <Field label="Rodzaj celu" hint="Wspólny dla całej firmy lub indywidualny.">
          <select value={data.kind} onChange={(e) => setField('kind', e.target.value)} style={input}>
            <option value="common">Wspólny dla firmy</option>
            <option value="individual">Indywidualny</option>
          </select>
        </Field>

        <Field label="URL obrazka" hint="Adres grafiki celu (https://…).">
          <input type="text" value={data.image_url || ''} onChange={(e) => setField('image_url', e.target.value)} style={input} />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
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
            ✓ Zapisano — aplikacja korzysta z nowego celu
          </span>
        )}
        {status === 'error' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>{error}</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{label}</span>
      {hint && <span style={{ display: 'block', fontSize: 11, color: T.grey, marginBottom: 6 }}>{hint}</span>}
      {children}
    </label>
  );
}

const card = {
  background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '18px 20px',
};
const input = {
  width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
