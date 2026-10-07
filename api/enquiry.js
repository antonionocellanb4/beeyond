/* Modulo contatti: una POST dal form, due mail via Resend.
   1. notifica all azienda, con reply_to del visitatore, cosi si risponde dal client
   2. conferma al visitatore, nella sua lingua
   La 2 non puo far fallire la 1: se la conferma salta, la richiesta e comunque arrivata. */

const API = 'https://api.resend.com/emails';
const DA = process.env.MAIL_FROM || 'Beeyond <info@beeyond.it>';
const A = (process.env.MAIL_TO || 'info@ecoimpiantisud.it').split(',').map(s => s.trim()).filter(Boolean);

const CAMPI = [
  ['name', 'Nome', 120, true],
  ['company', 'Azienda', 120, true],
  ['email', 'Email', 160, true],
  ['phone', 'Telefono', 60, false],
  ['technology', 'Tecnologia', 120, false],
  ['message', 'Messaggio', 4000, false],
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TESTI = {
  it: {
    sub: 'Abbiamo ricevuto la tua richiesta',
    corpo: n => `Ciao ${n},\n\ngrazie per averci scritto. Abbiamo ricevuto la tua richiesta e ti rispondiamo entro un giorno lavorativo.\n\nSe nel frattempo hai altri dati sul fango (portata, concentrazione, ore di esercizio), rispondi a questa mail: ci servono per darti un modello preciso invece di un depliant.\n\nBeeyond\nEcoimpianti Sud\n+39 0831 568482`,
  },
  en: {
    sub: 'We received your enquiry',
    corpo: n => `Hi ${n},\n\nthanks for writing. We have your enquiry and will reply within one working day.\n\nIf you have more figures on the sludge in the meantime (flow, concentration, running hours), just reply to this email: they let us send a model number instead of a brochure.\n\nBeeyond\nEcoimpianti Sud\n+39 0831 568482`,
  },
};

async function invia(key, mail) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 300));
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('RESEND_API_KEY mancante');
    return res.status(500).json({ error: 'config' });
  }

  const b = (req.body && typeof req.body === 'object') ? req.body : {};

  // honeypot: un campo che un umano non vede e non compila
  if (String(b.website || '').trim()) return res.status(200).json({ ok: true });

  const d = {};
  for (const [k, et, max, obb] of CAMPI) {
    const v = String(b[k] == null ? '' : b[k]).trim().slice(0, max);
    if (obb && !v) return res.status(400).json({ error: 'campo', campo: k });
    d[k] = v;
    d[k + '_et'] = et;
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) return res.status(400).json({ error: 'email' });

  const lang = b.lang === 'en' ? 'en' : 'it';
  const righe = CAMPI.filter(([k]) => d[k]).map(([k, et]) => [et, d[k]]);

  const notifica = {
    from: DA,
    to: A,
    reply_to: d.email,
    subject: 'Richiesta sito - ' + (d.technology || 'Beeyond') + ' - ' + d.company,
    text: righe.map(([et, v]) => et + ': ' + v).join('\n') + '\n\nLingua pagina: ' + lang,
    html: '<table cellpadding="6" style="font:14px/1.5 system-ui,sans-serif;border-collapse:collapse">'
      + righe.map(([et, v]) => '<tr><td style="color:#666;vertical-align:top">' + esc(et)
        + '</td><td><strong>' + esc(v).replace(/\n/g, '<br>') + '</strong></td></tr>').join('')
      + '<tr><td style="color:#666">Lingua pagina</td><td>' + lang + '</td></tr></table>',
  };

  try {
    await invia(key, notifica);
  } catch (e) {
    console.error('notifica fallita', e.message);
    return res.status(502).json({ error: 'invio' });
  }

  const t = TESTI[lang];
  try {
    await invia(key, {
      from: DA,
      to: [d.email],
      reply_to: A[0],
      subject: t.sub,
      text: t.corpo(d.name),
      html: '<div style="font:15px/1.6 system-ui,sans-serif;color:#14181A">'
        + esc(t.corpo(d.name)).replace(/\n/g, '<br>') + '</div>',
    });
  } catch (e) {
    console.error('conferma fallita (la notifica e partita)', e.message);
  }

  return res.status(200).json({ ok: true });
};
