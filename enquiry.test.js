/* node enquiry.test.js -- prova la funzione senza toccare Resend.
   Finge fetch e controlla i quattro casi che contano. */
const assert = require('assert');

process.env.RESEND_API_KEY = 'test';
process.env.MAIL_TO = 'uno@esempio.it, due@esempio.it';
const handler = require('./api/enquiry.js');

let inviate = [];
let rompi = null;                  // indice della chiamata che deve fallire
global.fetch = async (_u, o) => {
  inviate.push(JSON.parse(o.body));
  const ko = rompi === inviate.length - 1;
  return { ok: !ko, status: ko ? 422 : 200, text: async () => 'errore finto', json: async () => ({ id: 'x' }) };
};

const risposta = () => {
  const r = { codice: 0, corpo: null };
  r.status = c => (r.codice = c, r);
  r.json = b => (r.corpo = b, r);
  return r;
};
const chiama = async (body, metodo) => {
  inviate = [];
  const r = risposta();
  await handler({ method: metodo || 'POST', body }, r);
  return r;
};
const pieno = { name: 'Mario', company: 'Acme', email: 'mario@acme.it', message: 'ciao' };

(async () => {
  let r = await chiama(pieno, 'GET');
  assert.strictEqual(r.codice, 405, 'solo POST');

  r = await chiama({ name: 'Mario', company: 'Acme' });
  assert.strictEqual(r.codice, 400, 'email obbligatoria');
  assert.strictEqual(inviate.length, 0, 'niente mail se i campi non passano');

  r = await chiama({ ...pieno, email: 'non-una-email' });
  assert.strictEqual(r.codice, 400, 'email malformata respinta');

  r = await chiama({ ...pieno, website: 'http://spam' });
  assert.strictEqual(r.codice, 200, 'al bot si risponde ok');
  assert.strictEqual(inviate.length, 0, 'il bot non manda mail');

  r = await chiama(pieno);
  assert.strictEqual(r.codice, 200);
  assert.strictEqual(inviate.length, 2, 'notifica + conferma');
  assert.deepStrictEqual(inviate[0].to, ['uno@esempio.it', 'due@esempio.it'], 'MAIL_TO si divide sulle virgole');
  assert.strictEqual(inviate[0].reply_to, 'mario@acme.it', 'rispondendo alla notifica si scrive al visitatore');
  assert.strictEqual(inviate[1].to[0], 'mario@acme.it', 'la conferma va al visitatore');
  assert.ok(/Grazie|Ciao/.test(inviate[1].text), 'conferma in italiano per default');

  r = await chiama({ ...pieno, lang: 'en' });
  assert.ok(inviate[1].subject === 'We received your enquiry', 'lang=en cambia la conferma');

  rompi = 1;                       // la conferma fallisce
  r = await chiama(pieno);
  assert.strictEqual(r.codice, 200, 'conferma fallita non deve far fallire la richiesta');

  rompi = 0;                       // la notifica fallisce
  r = await chiama(pieno);
  assert.strictEqual(r.codice, 502, 'notifica fallita deve dare errore');
  assert.strictEqual(inviate.length, 1, 'notifica rotta: la conferma non parte');

  console.log('api/enquiry: tutte le prove passate');
})();
