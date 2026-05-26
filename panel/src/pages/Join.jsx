import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { T } from '../theme.js';

export default function Join() {
  const [contestId, setContestId] = useState(null);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { contests } = await api('/admin/contests');
        const c = contests[0];
        setContestId(c.id);
        const { join } = await api('/admin/join/' + c.id);
        setForm(join);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setStatus('');
  }

  async function save() {
    setStatus('saving');
    setError('');
    try {
      const payload = {
        participant_limit:
          form.participant_limit === '' || form.participant_limit == null
            ? null
            : Number(form.participant_limit),
        entry_code: form.entry_code || '',
        team_code_join: Number(form.team_code_join) ? 1 : 0,
        invite_links: Number(form.invite_links) ? 1 : 0,
        regulations_url: form.regulations_url || '',
        fairplay_screen: Number(form.fairplay_screen) ? 1 : 0,
        extra_consent: form.extra_consent || '',
        work_email_domains: form.work_email_domains || '',
      };
      const { join } = await api('/admin/join/' + contestId, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setForm(join);
      setStatus('saved');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  if (error && !form) return <div style={{ color: T.red, fontWeight: 600 }}>{error}</div>;
  if (!form) return <div style={{ color: T.grey }}>Wczytywanie…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🔗 Dołączanie</h1>
      <p style={{ fontSize: 13, color: T.grey, marginBottom: 20 }}>
        Zasady przystępowania do wyzwania. Ustawienia trafiają do bazy; aplikacja czyta je
        przez <code style={code}>GET /api/app/config</code> (ekran fair-play, link do regulaminu).
      </p>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Field label="Limit uczestników" hint="Puste = bez limitu.">
            <input
              type="number" min="0" value={form.participant_limit ?? ''}
              onChange={(e) => set('participant_limit', e.target.value)}
              placeholder="bez limitu" style={input}
            />
          </Field>
          <Field label="Kod dostępu do wyzwania" hint="Wpisywany przy dołączaniu.">
            <input
              type="text" value={form.entry_code || ''}
              onChange={(e) => set('entry_code', e.target.value)}
              placeholder="np. VS2026" style={input}
            />
          </Field>
        </div>

        <Field label="Link do regulaminu" hint="Adres https:// otwierany w aplikacji.">
          <input
            type="text" value={form.regulations_url || ''}
            onChange={(e) => set('regulations_url', e.target.value)}
            placeholder="https://…" style={{ ...input, marginBottom: 14 }}
          />
        </Field>

        <Field label="Dozwolone domeny e-mail służbowych" hint="Rozdzielone przecinkami, np. firma.pl, vanitystyle.pl">
          <input
            type="text" value={form.work_email_domains || ''}
            onChange={(e) => set('work_email_domains', e.target.value)}
            placeholder="firma.pl, vanitystyle.pl" style={{ ...input, marginBottom: 14 }}
          />
        </Field>

        <Field label="Dodatkowa zgoda" hint="Treść zgody pokazywanej przy dołączaniu (opcjonalnie).">
          <textarea
            value={form.extra_consent || ''}
            onChange={(e) => set('extra_consent', e.target.value)}
            rows={3} placeholder="Treść zgody…"
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </Field>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <Toggle
          label="Dołączanie kodem zespołu"
          desc="Uczestnik może wpisać kod zespołu, by od razu do niego trafić."
          on={Number(form.team_code_join) === 1}
          onChange={(v) => set('team_code_join', v ? 1 : 0)}
        />
        <Toggle
          label="Linki zapraszające"
          desc="Generowanie linków, które od razu dodają do wyzwania."
          on={Number(form.invite_links) === 1}
          onChange={(v) => set('invite_links', v ? 1 : 0)}
        />
        <Toggle
          label="Ekran fair-play przy starcie"
          desc="Aplikacja pokazuje ekran zasad uczciwej gry przy dołączeniu."
          on={Number(form.fairplay_screen) === 1}
          onChange={(v) => set('fairplay_screen', v ? 1 : 0)}
          last
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
        <button
          onClick={save} disabled={status === 'saving'}
          style={{
            padding: '11px 22px', borderRadius: 11, border: 'none', background: T.navy,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            opacity: status === 'saving' ? 0.6 : 1,
          }}
        >
          {status === 'saving' ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
        {status === 'saved' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>✓ Zapisano</span>
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
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: T.grey, marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Toggle({ label, desc, on, onChange, last }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: last ? 'none' : '1px solid ' + T.border,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{label}</div>
        <div style={{ fontSize: 11, color: T.grey, marginTop: 1 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 44, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
          background: on ? T.green : T.border, position: 'relative', flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
            borderRadius: '50%', background: '#fff', transition: 'left .15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

const card = {
  background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '16px 18px',
};
const input = {
  width: '100%', padding: '8px 10px', borderRadius: 9, border: '1.5px solid ' + T.border,
  fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const code = { background: T.greyBg, padding: '1px 5px', borderRadius: 4, fontSize: 11 };
