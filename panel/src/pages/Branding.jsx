import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

const FIELDS = [
  { key: 'name', label: 'Nazwa wyzwania', hint: 'Widoczna w aplikacji i panelu.' },
  { key: 'description', label: 'Opis wyzwania', area: true, hint: 'Krótki opis pokazywany uczestnikom.' },
  { key: 'logo_url', label: 'URL logo', hint: 'Adres obrazka z logo (https://…).' },
  { key: 'bg_image_url', label: 'URL tła', hint: 'Adres obrazka tła (https://…).' },
  { key: 'more_info_url', label: 'Link „więcej informacji"', hint: 'Strona z regulaminem lub stroną firmy.' },
];

export default function Branding() {
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
        const { branding } = await api('/admin/branding/' + c.id);
        setData(branding);
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
      const { branding } = await api('/admin/branding/' + contestId, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setData(branding);
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
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎨 Branding</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Tożsamość wyzwania — nazwa, opis, logo i kolor. Zapis trafia do bazy i jest
        dostępny dla aplikacji przez <code style={code}>GET /api/app/config</code>.
      </p>

      <div style={card}>
        {FIELDS.map((f) => (
          <label key={f.key} style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
              {f.label}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: T.grey, marginBottom: 6 }}>{f.hint}</span>
            {f.area ? (
              <textarea
                value={data[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
                rows={3}
                style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
              />
            ) : (
              <input
                type="text"
                value={data[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
                style={input}
              />
            )}
          </label>
        ))}

        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
            Kolor główny
          </span>
          <span style={{ display: 'block', fontSize: 11, color: T.grey, marginBottom: 6 }}>
            Główny kolor marki wyzwania.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={data.primary_color || '#181C33'}
              onChange={(e) => setField('primary_color', e.target.value)}
              style={{ width: 48, height: 38, border: '1.5px solid ' + T.border, borderRadius: 9, padding: 2, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={data.primary_color || ''}
              onChange={(e) => setField('primary_color', e.target.value)}
              style={{ ...input, width: 140 }}
            />
          </div>
        </label>
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
            ✓ Zapisano — aplikacja korzysta z nowego brandingu
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
  background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '18px 20px',
};
const input = {
  width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box',
};
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
