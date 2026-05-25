import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { T } from '../theme.js';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.navy, padding: 24 }}>
      <div style={{ width: 380, maxWidth: '100%' }}>
        {/* Marka */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: T.navy }}>V</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>FitProfit · Panel</span>
        </div>

        <form onSubmit={submit} style={{ background: T.card, borderRadius: 18, padding: '28px 26px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Zaloguj się</div>
          <div style={{ fontSize: 13, color: T.grey, marginBottom: 22 }}>Panel administracyjny wyzwań grywalizacyjnych</div>

          <label style={lbl}>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
            placeholder="admin@fitprofit.app" style={inp} />

          <label style={{ ...lbl, marginTop: 14 }}>Hasło</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            placeholder="••••••••" style={inp} />

          {error && (
            <div style={{ marginTop: 14, background: T.red + '14', border: '1px solid ' + T.red + '33', color: T.red, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} style={{
            width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, border: 'none',
            background: T.navy, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}>
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + T.border, fontSize: 11, color: T.grey, lineHeight: 1.7 }}>
            <b style={{ color: T.text }}>Konta demonstracyjne:</b><br />
            admin@fitprofit.app / admin123<br />
            koordynator@fitprofit.app / koordynator123
          </div>
        </form>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: T.grey, marginBottom: 6 };
const inp = {
  width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', background: T.card,
};
