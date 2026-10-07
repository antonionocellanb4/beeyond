/* Beeyond - generatore bilingue.
     node _i18n/build.js            genera _site/   (italiano in radice, inglese sotto /en/)
     node _i18n/build.js --check    solo il rapporto delle stringhe non tradotte, non scrive niente

   Le sette pagine inglesi in radice sono la fonte unica: non si toccano mai a mano per l'italiano.
   Le traduzioni stanno in _i18n/it.json:
     "blocchi" -> chiavi che contengono markup (titoli spezzati da <br> o <span class="muted">,
                  e la frase dei settori animata parola per parola). Vanno tradotte intere o
                  l'ordine delle parole in italiano esce sbagliato.
     "testi"   -> un nodo di testo o un attributo, senza markup dentro.
   Tutto il resto (sigle dei modelli, misure, unita, nomi di clienti e paesi) e in INVARIANTI
   piu sotto: non si traduce e non viene segnalato come mancante.

   Perche non un sistema a segnaposto {{chiave}}: avrebbe voluto 730 chiavi infilate a mano
   nelle sette pagine, e un template che va fuori sincro al primo ritocco al markup. Qui la
   sostituzione e letterale sul sorgente inglese, quindi una modifica al layout non rompe niente;
   un testo nuovo invece si fa vedere subito nel rapporto delle mancanti. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const SITE = 'https://beeyond.it';
const SOLO_CHECK = process.argv.includes('--check');

const PAGINE = ['index.html', 'btech-screw-press.html', 'bw-wave-separator.html',
  'about.html', 'technology.html', 'contact.html', 'applications.html'];

// serviti dalla radice, condivisi dalle due lingue
const ASSET = ['styles.css', 'main.js', 'favicon.svg', 'robots.txt', '404.html', 'img', 'video',
  'hero-home.webp', 'hero-home.jpg', 'hero.webp', 'hero.jpg', 'logo-beeyond.svg'];

const DIZ = JSON.parse(fs.readFileSync(path.join(__dirname, 'it.json'), 'utf8'));

// Stringhe identiche nelle due lingue. Sono il grosso delle tabelle dati: se finissero nel
// dizionario sarebbero 200 righe di traduzioni finte che nascondono quelle vere mancanti.
// kg-DS/h sta fuori di proposito: in italiano diventa kg-SS/h, quindi deve passare dal dizionario
const UNITA = '(%|kW|mm|m|kg|L\\/h|mg\\/L|g\\/L|m&sup3;\\/h|rpm)';
const INVARIANTI = [
  /^(BTECH|BW|MPSP|MDS)[-\s]?\d*[A-Z]*$/,                   // BTECH-353, BW-1212G, MPSP
  /^\d+(\s*&times;\s*\d+)+$/,                                // 3455 &times; 1135 &times; 1760
  new RegExp('^(&minus;|&ge;|&le;|&plusmn;|\\+|~)?[\\d\\s.,]+(&ndash;[\\d\\s.,]+)?\\s*' + UNITA + '?$'),
  /^\d+\/\d+$/,                                              // 24/7
  /^(&reg;|&rarr;|&uarr;|&darr;|&middot;|&nbsp;|kW|kg|mm|m)$/,
  /^[A-Z]{2,3}$/,                                            // GC, AB, REF, PE
  /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i,                          // info@ecoimpiantisud.it
  /\s\([A-Z]{2}\)$/,                                         // Serracapriola (FG), Massafra (TA)
];
const invariante = s => INVARIANTI.some(r => r.test(s));

/* Una stringa che e gia il risultato di una traduzione non va ricontrollata: i blocchi girano
   prima dei nodi di testo, quindi il passaggio sui nodi ritrova l'italiano appena scritto. */
const GIA_TRADOTTO = new Set([...Object.values(DIZ.blocchi), ...Object.values(DIZ.testi)]
  .flatMap(v => [v, ...v.split(/<[^>]*>/).map(s => s.replace(/\s+/g, ' ').trim())])
  .filter(Boolean));

const mancanti = new Map();
const segnala = (s, p) => {
  if (!mancanti.has(s)) mancanti.set(s, new Set());
  mancanti.get(s).add(p);
};

/* I nodi di testo, saltando script, style e commenti. Lavorare sui nodi e non sul file intero
   e quello che rende impossibile tradurre per sbaglio un nome di tag, una classe o un percorso. */
function perOgniTesto(html, f) {
  return html.replace(
    /(<(script|style)\b[\s\S]*?<\/\2>)|(<!--[\s\S]*?-->)|(<[^>]*>)|([^<]+)/g,
    (m, blocco, _t, commento, tag, testo) => {
      if (blocco || commento || tag) return m;
      const pre = testo.match(/^\s*/)[0], post = testo.match(/\s*$/)[0];
      const s = testo.trim();
      return s ? pre + f(s) + post : m;
    });
}

const ATTR = ['alt', 'title', 'placeholder', 'aria-label'];
const META = ['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'];

function traduci(html, pag) {
  const cerca = s => {
    const v = s.replace(/\s+/g, ' ');
    if (DIZ.testi[v] !== undefined) return DIZ.testi[v];
    if (!/[A-Za-z]{2}/.test(v) || invariante(v) || GIA_TRADOTTO.has(v)) return s;
    segnala(v, pag);
    return s;
  };

  // 1. i blocchi per primi, dal piu lungo: un titolo intero deve vincere sui suoi frammenti
  for (const k of Object.keys(DIZ.blocchi).sort((a, b) => b.length - a.length)) {
    html = html.split(k).join(DIZ.blocchi[k]);
  }
  // 2. nodi di testo
  html = perOgniTesto(html, cerca);
  // 3. attributi visibili all'utente
  for (const a of ATTR) {
    html = html.replace(new RegExp('(\\s' + a + '=")([^"]*)(")', 'g'),
      (m, p1, v, p3) => p1 + (v.trim() ? cerca(v) : v) + p3);
  }
  // 4. meta testuali (il <title> e gia un nodo di testo, lo prende il passaggio 2)
  for (const n of META) {
    const re = new RegExp('((?:name|property)="' + n.replace(':', ':') + '"\\s+content=")([^"]*)(")', 'g');
    html = html.replace(re, (m, a, v, b) => a + cerca(v) + b);
  }
  return html;
}

const slug = f => f === 'index.html' ? '' : f.replace('.html', '');
const url = (lang, f) => SITE + (lang === 'en' ? '/en/' : '/') + slug(f);

function hreflang(f) {
  return [
    '<link rel="alternate" hreflang="it" href="' + url('it', f) + '">',
    '<link rel="alternate" hreflang="en" href="' + url('en', f) + '">',
    '<link rel="alternate" hreflang="x-default" href="' + url('it', f) + '">',
  ].join('\n');
}

/* Il cambio lingua anche nell'header, non solo in fondo al menu: su un sito in due lingue
   e navigazione, e chi atterra sulla lingua sbagliata deve vederlo senza aprire niente.
   Mostra solo la lingua di arrivo, cosi e un comando e non un'etichetta ambigua: "EN" su
   una pagina italiana si legge "vai all'inglese". color:inherit nel CSS lo fa invertire
   sulle bande scure insieme al resto dell'header. */
function navLang(lang, f) {
  const s = slug(f);
  const a = lang === 'it'
    ? { href: 'en/' + s, cod: 'en', sigla: 'EN', titolo: 'Switch to English' }
    : { href: '../' + s, cod: 'it', sigla: 'IT', titolo: "Passa all'italiano" };
  // la sigla e doppia: il CSS fa scorrere la prima fuori e la seconda dentro in hover
  return '<a class="nav-lang" href="' + a.href + '" hreflang="' + a.cod + '" lang="' + a.cod
    + '" aria-label="' + a.titolo + '"><span class="nav-lang__t" aria-hidden="true"><span>'
    + a.sigla + '</span><span>' + a.sigla + '</span></span></a>';
}

/* Le pagine inglesi stanno un livello sotto la radice, gli asset no: vanno riportati su con ../
   I link fra pagine invece restano come sono. La regola e tutta nella convenzione delle URL
   pulite: con estensione e un file, senza estensione e una pagina. */
function assetSu(html) {
  const sposta = u => /^(https?:|mailto:|tel:|#|data:|\/|\.\.\/)/.test(u) || !/\.[a-z0-9]{2,5}($|[?#])/i.test(u)
    ? u : '../' + u.replace(/^\.\//, '');
  html = html.replace(/\b(href|src|content)="([^"]+)"/g, (m, a, u) =>
    a === 'content' && !/\.(webp|jpe?g|png|svg|mp4|css|js)($|[?#])/i.test(u) ? m : a + '="' + sposta(u) + '"');
  html = html.replace(/\bsrcset="([^"]+)"/g, (m, v) =>
    'srcset="' + v.split(',').map(p => { const [u, d] = p.trim().split(/\s+/); return sposta(u) + (d ? ' ' + d : ''); }).join(', ') + '"');
  html = html.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => 'url(' + q + sposta(u) + q + ')');
  return html;
}

function testa(html, lang, f) {
  html = html.replace('<html lang="en">', '<html lang="' + lang + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + url(lang, f) + '">\n' + hreflang(f));
  html = html.replace(/(<meta property="og:url" content=")[^"]*(">)/, '$1' + url(lang, f) + '$2');
  html = html.replace(/(<meta property="og:locale" content=")[^"]*(">)/, '$1' + (lang === 'it' ? 'it_IT' : 'en_GB') + '$2');
  return html;
}

// ---------------------------------------------------------------- generazione
// Via le pagine della build precedente, non gli asset: 22 MB di foto e video non vanno
// ricopiati a ogni giro. Se resta una pagina di un giro vecchio (e successo con _site/it/
// del generatore precedente) va online una URL che nessuno ha piu in sitemap.
if (!SOLO_CHECK && fs.existsSync(OUT)) {
  const pulisci = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!ASSET.includes(e.name)) { pulisci(p); fs.rmdirSync(p); } }
    else if (/\.(html|xml)$/.test(e.name)) fs.unlinkSync(p);
  });
  pulisci(OUT);
}

let scritte = 0;
const scrivi = (p, c) => { if (SOLO_CHECK) return; fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); scritte++; };

for (const f of PAGINE) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!src.includes('<!--LANG-NAV-->')) throw new Error(f + ': manca il segnaposto <!--LANG-NAV--> nell header');

  let it = testa(traduci(src, f.replace('.html', '')), 'it', f);
  it = it.replace('<!--LANG-NAV-->', navLang('it', f));
  scrivi(path.join(OUT, f), it);

  let en = testa(assetSu(src), 'en', f);
  en = en.replace('<!--LANG-NAV-->', navLang('en', f));
  scrivi(path.join(OUT, 'en', f), en);
}

// sitemap: le quattordici pagine, ognuna con i suoi alternate
if (!SOLO_CHECK) {
  const oggi = new Date().toISOString().slice(0, 10);
  const voce = (lang, f) => '  <url>\n    <loc>' + url(lang, f) + '</loc>\n' +
    ['it', 'en'].map(l => '    <xhtml:link rel="alternate" hreflang="' + l + '" href="' + url(l, f) + '"/>').join('\n') +
    '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + url('it', f) + '"/>' +
    '\n    <lastmod>' + oggi + '</lastmod>\n  </url>';
  scrivi(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    PAGINE.flatMap(f => ['it', 'en'].map(l => voce(l, f))).join('\n') + '\n</urlset>\n');

  for (const a of ASSET) {
    const s = path.join(ROOT, a);
    if (fs.existsSync(s)) fs.cpSync(s, path.join(OUT, a), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- rapporto
if (mancanti.size) {
  const righe = [...mancanti.entries()].sort((a, b) => b[0].length - a[0].length);
  console.error('\n' + righe.length + ' stringhe senza traduzione italiana:\n');
  righe.forEach(([s, ps]) => console.error('  [' + [...ps].join(',') + '] ' + s));
  console.error('\nVanno in _i18n/it.json -> "testi", oppure in INVARIANTI se non si traducono.');
  process.exit(1);
}
console.log(SOLO_CHECK ? 'dizionario completo: nessuna stringa scoperta'
  : '_site pronto: ' + scritte + ' file (it in radice, en sotto /en/)');
