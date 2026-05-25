import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

/* Wczytuje plik graficzny, skaluje do maks. 400 px i zwraca data-URL (JPEG).
   Dzięki temu zdjęcie zapisuje się w bazie jako tekst — bez osobnego magazynu plików. */
function fileToDataURL(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
        else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* Rozbija tekst (linie / przecinki / średniki) na listę kodów. */
function parseCodes(text) {
  return String(text || '').split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
}

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
    setRows((rs) => rs.map((r) => (r._k === k ? { ...r, [field]: value } : r)));
    setStatus('');
  }
  function addRow() {
    keyRef.current += 1;
    setRows([
      ...rows,
      { _k: 'n' + keyRef.current, name: '', description: '', icon: '🎁', image_url: '', codes: '', cost: 100, stock: -1, enabled: 1 },
    ]);
    setStatus('');
  }
  function removeRow(k) {
    setRows(rows.filter((r) => r._k !== k));
    setStatus('');
  }

  async function pickImage(k, file) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataURL(file, 400);
      update(k, 'image_url', dataUrl);
    } catch (e) {
      setError('Nie udało się wczytać zdjęcia.');
      setStatus('error');
    }
  }

  function importCsv(k, file, currentCodes) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const added = parseCodes(reader.result);
      const existing = parseCodes(currentCodes);
      const merged = existing.concat(added);
      update(k, 'codes', merged.join('\n'));
    };
    reader.readAsText(file);
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
          image_url: r.image_url || '', codes: r.codes || '',
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
        Katalog nagród do wymiany za punkty. Każda nagroda może mieć zdjęcie oraz pulę
        kodów kuponów (jeden lub wiele — wgrywanych z pliku CSV).
      </p>

      {rows.map((r) => {
        const codeCount = parseCodes(r.codes).length;
        return (
          <div key={r._k} style={{ ...card, opacity: Number(r.enabled) === 1 ? 1 : 0.6 }}>
            {/* nazwa + status + usuń */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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

            {/* zdjęcie nagrody */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: T.greyBg, border: '1px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {r.image_url
                  ? <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 24 }}>{r.icon || '🎁'}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.grey, marginBottom: 4 }}>Zdjęcie nagrody (zastępuje ikonę)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={btnSm}>
                    {r.image_url ? 'Zmień zdjęcie' : 'Wgraj zdjęcie'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => pickImage(r._k, e.target.files[0])} />
                  </label>
                  {r.image_url && (
                    <button onClick={() => update(r._k, 'image_url', '')}
                      style={{ ...btnSm, color: T.red, cursor: 'pointer' }}>Usuń zdjęcie</button>
                  )}
                  <input
                    type="text" value={r.icon || ''} placeholder="ikona (emoji)"
                    onChange={(e) => update(r._k, 'icon', e.target.value)}
                    style={{ ...input, width: 110, textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>

            <input
              type="text" value={r.description || ''} placeholder="Opis"
              onChange={(e) => update(r._k, 'description', e.target.value)}
              style={{ ...input, marginBottom: 12 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <label style={fieldLbl}>
                <span style={lblTxt}>Koszt (pkt)</span>
                <input type="number" min="0" value={r.cost} onChange={(e) => update(r._k, 'cost', e.target.value)} style={input} />
              </label>
              <label style={fieldLbl}>
                <span style={lblTxt}>Dostępna ilość (-1 = bez limitu)</span>
                <input type="number" min="-1" value={r.stock} onChange={(e) => update(r._k, 'stock', e.target.value)} style={input} />
              </label>
            </div>

            {/* kody kuponów */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={lblTxt}>Kody kuponów — jeden na linię (jeden kod lub wiele)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: codeCount ? T.green : T.grey }}>
                  {codeCount} {codeCount === 1 ? 'kod' : 'kodów'}
                </span>
              </div>
              <textarea
                value={r.codes || ''} placeholder={'FP-XXXX-YYYY\nFP-XXXX-ZZZZ'}
                onChange={(e) => update(r._k, 'codes', e.target.value)}
                rows={3}
                style={{ ...input, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
              />
              <label style={btnSm}>
                Wgraj listę z CSV
                <input type="file" accept=".csv,.txt,text/csv,text/plain" style={{ display: 'none' }}
                  onChange={(e) => importCsv(r._k, e.target.files[0], r.codes)} />
              </label>
            </div>
          </div>
        );
      })}

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
const btnSm = {
  display: 'inline-block', padding: '7px 12px', borderRadius: 8,
  border: '1.5px solid ' + T.border, background: '#fff', color: T.text,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const fieldLbl = { display: 'block' };
const lblTxt = { display: 'block', fontSize: 11, color: T.grey, marginBottom: 4 };
