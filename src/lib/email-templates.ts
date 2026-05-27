// Italian transactional email templates. Each template builder takes the
// dynamic inputs and returns the fields the Resend client needs.
//
// HTML is intentionally inline-styled with table layouts — every major mail
// client (Gmail, Outlook desktop/web, Apple Mail, iOS) renders this reliably
// without needing build-time CSS extraction. A plain-text fallback is always
// included for accessibility and spam-score reasons.

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = 'GeoLeague';
const FOOTER_TEXT =
  'Stai ricevendo questa email perché sei iscritto a GeoLeague. Modifica le preferenze di notifica dalle impostazioni del tuo account.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell({
  preheader,
  bodyHtml,
}: {
  preheader: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(BRAND)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <p style="margin:0;font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#737373;">${escapeHtml(BRAND)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px;border-top:1px solid #f0f0f0;">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#a3a3a3;">${escapeHtml(FOOTER_TEXT)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
    <tr>
      <td align="center" bgcolor="#0a0a0a" style="border-radius:10px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** Launch email — sent when today's challenge has just been published. */
export function launchEmail({ appUrl }: { appUrl: string }): EmailTemplate {
  const subject = 'La sfida di oggi è pronta';
  const preheader = 'Hai 2 ore per giocare. Apri la mappa e prova a indovinare dove ti trovi.';
  const cta = appUrl;
  const bodyHtml = `
    <h1 style="margin:8px 0 12px 0;font-size:22px;line-height:1.3;color:#0a0a0a;">La sfida di oggi è iniziata</h1>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.55;color:#262626;">
      La sfida quotidiana è appena partita. Hai <strong>2 ore</strong> per inviare il tuo tiro.
    </p>
    <p style="margin:0 0 4px 0;font-size:15px;line-height:1.55;color:#262626;">
      Più giochi velocemente, più punti bonus ottieni.
    </p>
    ${button(cta, 'Gioca ora')}
    <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#737373;">
      Se il pulsante non funziona, copia e incolla questo link nel browser:<br />
      <a href="${escapeHtml(cta)}" style="color:#525252;">${escapeHtml(cta)}</a>
    </p>
  `;
  const text = [
    'La sfida di oggi è iniziata.',
    'Hai 2 ore per inviare il tuo tiro. Più giochi velocemente, più punti bonus.',
    '',
    `Gioca ora: ${cta}`,
    '',
    FOOTER_TEXT,
  ].join('\n');

  return { subject: `${BRAND} — ${subject}`, html: shell({ preheader, bodyHtml }), text };
}

/** Last-call email — sent ~30 min before a challenge window closes. */
export function lastCallEmail({ appUrl }: { appUrl: string }): EmailTemplate {
  const subject = 'Ultima chiamata: la sfida sta per chiudersi';
  const preheader = 'Mancano circa 30 minuti. Non perdere la striscia di oggi.';
  const cta = appUrl;
  const bodyHtml = `
    <h1 style="margin:8px 0 12px 0;font-size:22px;line-height:1.3;color:#0a0a0a;">Ultima chiamata</h1>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.55;color:#262626;">
      Mancano circa <strong>30 minuti</strong> alla chiusura della sfida di oggi.
    </p>
    <p style="margin:0 0 4px 0;font-size:15px;line-height:1.55;color:#262626;">
      Non perdere la tua striscia: invia il tiro prima del timer.
    </p>
    ${button(cta, 'Gioca adesso')}
  `;
  const text = [
    'Ultima chiamata.',
    'Mancano circa 30 minuti alla chiusura della sfida di oggi. Non perdere la tua striscia.',
    '',
    `Gioca adesso: ${cta}`,
    '',
    FOOTER_TEXT,
  ].join('\n');

  return { subject: `${BRAND} — ${subject}`, html: shell({ preheader, bodyHtml }), text };
}
