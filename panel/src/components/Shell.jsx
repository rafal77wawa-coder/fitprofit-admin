import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { T } from '../theme.js';
import Dashboard from '../pages/Dashboard.jsx';
import Scoring from '../pages/Scoring.jsx';
import Branding from '../pages/Branding.jsx';
import Charity from '../pages/Charity.jsx';
import Rewards from '../pages/Rewards.jsx';
import InfoPages from '../pages/InfoPages.jsx';

// Lista modułów panelu. stage = etap wdrożenia (1 = gotowy).
const MODULES = [
  { id: 'dashboard', label: 'Pulpit', icon: '📊', stage: 1 },
  { id: 'contest', label: 'Ustaw wyzwanie', icon: '🎯', stage: 2 },
  { id: 'branding', label: 'Branding', icon: '🎨', stage: 2 },
  { id: 'scoring', label: 'Silnik punktacji', icon: '⚡', stage: 2 },
  { id: 'join', label: 'Dołączanie', icon: '🔗', stage: 3 },
  { id: 'custom', label: 'Punkty niestandardowe', icon: '➕', stage: 3 },
  { id: 'charity', label: 'Cele charytatywne', icon: '❤️', stage: 3 },
  { id: 'rewards', label: 'Nagrody', icon: '🎁', stage: 3 },
  { id: 'teams', label: 'Zespoły', icon: '👥', stage: 3 },
  { id: 'participants', label: 'Uczestnicy', icon: '🧑', stage: 3 },
  { id: 'pages', label: 'Strony informacyjne', icon: '📄', stage: 3 },
  { id: 'moderation', label: 'Moderacja', icon: '🚩', stage: 3 },
  { id: 'photos', label: 'Weryfikacja zdjęć', icon: '🖼️', stage: 3 },
  { id: 'messages', label: 'Komunikacja', icon: '✉️', stage: 3 },
  { id: 'eko', label: 'EKO i HQ', icon: '🌱', stage: 3 },
  { id: 'stats', label: 'Statystyki', icon: '📈', stage: 3 },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('dashboard');
  const current = MODULES.find((m) => m.id === view);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 244, background: T.card, borderRight: '1px solid ' + T.border, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid ' + T.border }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>V</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>FitProfit</div>
            <div style={{ fontSize: 10, color: T.grey }}>Panel administracyjny</div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {MODULES.map((m) => {
            const active = m.id === view;
            return (
              <button key={m.id} onClick={() => setView(m.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                marginBottom: 2, border: 'none', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                background: active ? T.navy : 'transparent',
                color: active ? '#fff' : T.text,
              }}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{m.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, flex: 1 }}>{m.label}</span>
                {m.stage > 1 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                    background: active ? 'rgba(255,255,255,0.18)' : T.greyBg,
                    color: active ? 'rgba(255,255,255,0.8)' : T.grey,
                  }}>
                    E{m.stage}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Główna kolumna ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 58, background: T.card, borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Wyzwanie firmowe VanityStyle</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{user.name}</div>
              <div style={{ fontSize: 10, color: T.grey }}>{user.role}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
              {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <button onClick={logout} style={{
              border: '1px solid ' + T.border, background: T.card, borderRadius: 9,
              padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: T.text,
            }}>
              Wyloguj
            </button>
          </div>
        </header>

        {/* Treść */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
          {view === 'dashboard' ? <Dashboard />
            : view === 'scoring' ? <Scoring />
            : view === 'branding' ? <Branding />
            : view === 'charity' ? <Charity />
            : view === 'rewards' ? <Rewards />
            : view === 'pages' ? <InfoPages />
            : <Placeholder module={current} />}
        </main>
      </div>
    </div>
  );
}

function Placeholder({ module }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{module.icon} {module.label}</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 22 }}>Moduł panelu administracyjnego.</p>
      <div style={{ background: T.card, border: '1px dashed ' + T.greyLt, borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🛠️</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Moduł w przygotowaniu</div>
        <div style={{ fontSize: 13, color: T.grey, marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Realizacja w <b>Etapie {module.stage}</b> według zatwierdzonego planu. Etap 1 (gotowy):
          backend, baza danych, uwierzytelnianie i logowanie do panelu.
        </div>
      </div>
    </div>
  );
}
