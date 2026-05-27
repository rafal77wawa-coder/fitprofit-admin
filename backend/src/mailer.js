/* Wysyłka e-maili przez API MailerSend.
   Konfiguracja przez zmienne środowiskowe (ustawiane na Render):
     MAILERSEND_API_TOKEN  — token API z MailerSend
     MAIL_FROM             — adres nadawcy (domena testowa lub zweryfikowana)
     MAIL_FROM_NAME        — nazwa nadawcy (opcjonalnie)
     APP_PUBLIC_URL        — publiczny adres aplikacji (do linków w mailu)
   Gdy brak tokenu, wysyłka jest pomijana — panel działa, mail po prostu nie wychodzi. */

const API_URL = 'https://api.mailersend.com/v1/email';

export function mailConfigured() {
  return Boolean(process.env.MAILERSEND_API_TOKEN && process.env.MAIL_FROM);
}

export async function sendEmail({ to, toName, subject, html, text }) {
  if (!mailConfigured()) {
    return { ok: false, skipped: true, reason: 'Wysyłka e-mail nie jest skonfigurowana.' };
  }
  const body = {
    from: {
      email: process.env.MAIL_FROM,
      name: process.env.MAIL_FROM_NAME || 'FitProfit',
    },
    to: [{ email: to, name: toName || to }],
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
  };

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.MAILERSEND_API_TOKEN,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: 'Błąd połączenia z usługą e-mail.' };
  }

  if (res.status === 202 || res.status === 200) {
    return { ok: true };
  }
  let detail = '';
  try { detail = JSON.stringify(await res.json()); } catch (e) { /* brak treści */ }
  return { ok: false, error: 'MailerSend odrzucił wysyłkę (' + res.status + ').', detail };
}

/* Treść zaproszenia do FitProfit. */
export function inviteEmail({ firstName, link }) {
  const subject = 'Zaproszenie do wyzwania FitProfit';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#181C33">
      <h2 style="color:#181C33">Cześć ${firstName || ''}!</h2>
      <p style="font-size:14px;line-height:1.6;color:#444">
        Zostałeś zaproszony do firmowego wyzwania sportowego w aplikacji FitProfit.
        Kliknij poniższy przycisk, aby dokończyć rejestrację konta.
      </p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#181C33;color:#fff;text-decoration:none;
           padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">
          Dołącz do wyzwania
        </a>
      </p>
      <p style="font-size:12px;color:#888;line-height:1.5">
        Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:<br>
        <span style="color:#0C5093">${link}</span>
      </p>
    </div>`;
  const text = `Cześć ${firstName || ''}! Zostałeś zaproszony do wyzwania FitProfit. Dokończ rejestrację: ${link}`;
  return { subject, html, text };
}

/* Treść maila resetu hasła. */
export function resetEmail({ firstName, link }) {
  const subject = 'Reset hasła w aplikacji FitProfit';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#181C33">
      <h2 style="color:#181C33">Cześć ${firstName || ''}!</h2>
      <p style="font-size:14px;line-height:1.6;color:#444">
        Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta FitProfit.
        Kliknij poniższy przycisk, aby ustawić nowe hasło. Jeśli to nie Ty, zignoruj tę wiadomość.
      </p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#181C33;color:#fff;text-decoration:none;
           padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">
          Ustaw nowe hasło
        </a>
      </p>
      <p style="font-size:12px;color:#888;line-height:1.5">
        Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:<br>
        <span style="color:#0C5093">${link}</span>
      </p>
    </div>`;
  const text = `Cześć ${firstName || ''}! Reset hasła FitProfit: ${link}`;
  return { subject, html, text };
}
