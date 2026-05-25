import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

const CAT_LABEL = { foot: 'Na nogach', wheel: 'Na kołach', ex: 'Ćwiczenia', step: 'Kroki' };

export default function Dashboard() {
  const [contests, setContests] = useState([]);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const c = await api('/admin/contests');
        setContests(c.contests);
        // /api/app/config — dokładnie ten endpoint, z którego korzysta aplikacja FitProfit
        const cfg = await api('/app/config?contest=wyzwanie-vs');
        setConfig(cfg);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (error) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!config) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  const c = config.contest;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Pulpit</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 22 }}>
        Przegląd wyzwania i konfiguracji widocznej w aplikacji uczestnika.
      </p>

      {/* Kafelki podsumowania */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <Stat label="Wyzwania" value={contests.length} />
        <Stat label="Reguły punktacji" value={config.scoring.length} />
        <Stat label="Nagrody" value={config.rewards.length} />
        <Stat label="Status" value={c.status === 'published' ? 'Opublikowane' : c.status} accent={T.green} />
      </div>

      {/* Wyzwanie */}
      <Card title="Aktywne wyzwanie">
        <div style={{ fontSize: 16, fontWeight: 800 }}>{c.name}</div>
        <div style={{ fontSize: 13, color: T.grey, marginTop: 3 }}>{c.description}</div>
        <div style={{ display: 'flex', gap: 22, marginTop: 12, fontSize: 12, color: T.grey, flexWrap: 'wrap' }}>
          <span>Okres: <b style={{ color: T.text }}>{c.startDate} → {c.endDate}</b></span>
          <span>Strefa: <b style={{ color: T.text }}>{c.timezone}</b></span>
          <span>Język: <b style={{ color: T.text }}>{c.defaultLanguage}</b></span>
        </div>
      </Card>

      {/* Silnik punktacji — na żywo z API */}
      <Card title="Silnik punktacji — wartości pobierane przez aplikację">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: T.grey, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <th style={th}>Kategoria</th>
              <th style={th}>Pkt / jednostkę</th>
              <th style={th}>Min. próg</th>
              <th style={th}>Stały bonus</th>
              <th style={th}>Limit dzienny</th>
            </tr>
          </thead>
          <tbody>
            {config.scoring.map((r) => (
              <tr key={r.category} style={{ borderTop: '1px solid ' + T.border }}>
                <td style={{ ...td, fontWeight: 700 }}>{CAT_LABEL[r.category] || r.category}</td>
                <td style={td}>{r.points_per_unit} / {r.unit === 'km' ? 'km' : r.unit === 'step1000' ? '1000 kroków' : 'aktywność'}</td>
                <td style={td}>{r.min_threshold ? r.min_threshold + ' km' : '—'}</td>
                <td style={td}>{r.fixed_bonus ? '+' + r.fixed_bonus + ' pkt' : '—'}</td>
                <td style={td}>{r.daily_point_limit} pkt</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 11, color: T.grey, lineHeight: 1.6 }}>
          Te wartości backend zwraca przez <code style={code}>GET /api/app/config</code> — aplikacja FitProfit
          pobiera je zamiast trzymać w stałych w kodzie. Edycja w Etapie 2 (moduł „Silnik punktacji").
        </div>
      </Card>

      {/* Cel charytatywny */}
      {config.charity && (
        <Card title="Cel charytatywny">
          <div style={{ fontSize: 15, fontWeight: 800 }}>{config.charity.name}</div>
          <div style={{ fontSize: 13, color: T.grey, marginTop: 3 }}>{config.charity.description}</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            Cel zbiórki: <b>{config.charity.target_amount.toLocaleString('pl')} {config.charity.currency}</b>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || T.navy }}>{value}</div>
      <div style={{ fontSize: 12, color: T.grey, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.grey, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

const th = { padding: '4px 8px 8px 0', fontWeight: 600 };
const td = { padding: '9px 8px 9px 0', color: T.text };
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
