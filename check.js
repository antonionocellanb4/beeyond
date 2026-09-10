/* Wiring check: node check.js
   Fails if a link, asset, anchor, tab panel or filter target does not exist. */
const fs = require('fs');
const pages = ['index.html', 'mds.html', 'wave.html', 'about.html', 'technology.html', 'contact.html'];
const bad = [];
const warn = [];   // not fatal, but not shippable either
const ids = {};
const titles = {};   // the same title on two pages sinks both

pages.forEach(p => {
  const h = fs.readFileSync(p, 'utf8');
  ids[p] = new Set([...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
});

pages.forEach(p => {
  const h = fs.readFileSync(p, 'utf8');
  const say = m => bad.push(`${p}: ${m}`);

  // div balance: one missing </div> silently reparents the rest of the page
  const open = h.split('<div').length - 1, close = h.split('</div>').length - 1;
  if (open !== close) say(`${open} <div> vs ${close} </div>`);

  // assets + links
  [...h.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1])
    .filter(u => !/^(https?:|mailto:|tel:|#)/.test(u))
    .map(u => u.split('#')[0].split('?')[0])
    .forEach(u => { if (u && !fs.existsSync(u)) say(`missing file ${u}`); });

  // inline style="--hero-img:url(...)" is invisible to the href/src sweep above.
  // split beats a regex here: the escaping survives every layer between editor and file
  h.split('url(').slice(1).map(s => s.split(')')[0].trim().replace(/['"]/g, ''))
    .filter(u => u && !/^(https?:|data:|#)/.test(u))
    .forEach(u => { if (!fs.existsSync(u)) say(`missing background image ${u}`); });

  // anchors, same page and cross page
  [...h.matchAll(/href="([^"]*#[^"]+)"/g)].map(m => m[1]).forEach(u => {
    const [file, frag] = u.split('#');
    const target = file === '' ? p : file;
    if (!ids[target]) return say(`link to unknown page ${target}`);
    if (!ids[target].has(frag)) say(`dead anchor #${frag} -> ${target}`);
  });

  // every dark band has to be flagged, or the header keeps dark type over it
  if (!h.includes('<footer data-nav-dark')) say('footer is not marked data-nav-dark');
  if (/<section class="[^"]*(hero-band|hero--dark|contact)/.test(h)) say('a dark section is not marked data-nav-dark');

  // hotspot dots and their cards must pair up
  const hs = [...h.matchAll(/data-hs="([^"]+)"/g)].map(m => m[1]);
  hs.filter((v, i) => hs.indexOf(v) === i)
    .forEach(n => { if (hs.filter(x => x === n).length !== 2) say(`data-hs="${n}" is not a dot/card pair`); });

  // tab buttons -> panels
  [...h.matchAll(/data-target="([^"]+)"/g)].map(m => m[1])
    .forEach(t => { if (!ids[p].has(t)) say(`tab target #${t} not found`); });

  // filter input -> table
  [...h.matchAll(/data-filter="([^"]+)"/g)].map(m => m[1])
    .forEach(t => { if (t !== 'all' && !ids[p].has(t)) say(`filter target #${t} not found`); });

  // every <select id="conc"> option must have matching data-conc cells
  const opts = [...h.matchAll(/<option value="(\d+)"/g)].map(m => m[1]);
  const cells = new Set([...h.matchAll(/data-conc="(\d+)"/g)].map(m => m[1]));
  opts.forEach(o => { if (!cells.has(o)) say(`concentration ${o} has no data-conc cells`); });

  // each data row must have one cell per column header
  [...h.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map(m => m[0]).forEach(tbl => {
    const cols = (tbl.match(/<th\b/g) || []).length;
    (tbl.match(/<tr>(?![\s\S]*?<th)[\s\S]*?<\/tr>/g) || []).forEach(tr => {
      const n = (tr.match(/<td\b/g) || []).length;
      if (n && n !== cols) say(`row has ${n} cells, header has ${cols}: ${tr.slice(0, 40)}`);
    });
  });

  // ---- SEO: what breaks first when someone else edits the page ----
  const txt = s => s.replace(/&reg;/g, '\u00ae').replace(/&amp;/g, '&')
                    .replace(/&[mn]dash;/g, '\u2014').replace(/&nbsp;/g, ' ');

  const title = txt((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  if (!title) say('no <title>');
  else if (title.length > 60) say(`title is ${title.length} chars, over 60`);
  else if (title.length < 20) say(`title is only ${title.length} chars, too thin for a SERP line`);
  titles[title] = (titles[title] || []).concat(p);

  const desc = txt((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  if (!desc) say('no meta description');
  else if (desc.length > 155) say(`description is ${desc.length} chars, over 155`);

  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) say(`${h1} <h1> on the page, must be exactly 1`);

  (h.match(/<img\b[^>]*>/g) || []).forEach(t => {
    if (!/\salt=/.test(t)) say(`img has no alt: ${t.slice(0, 60)}`);
  });

  if (!/rel="canonical"/.test(h)) say('no canonical link');
  if (!/rel="icon"/.test(h)) say('no favicon link');
  if (!/property="og:image"/.test(h)) say('the link preview will be blank: no og:image');

  // placeholders: a warning, not a failure - the site still works, it just cannot go live
  ['beeyond.example', '000 000 0000', 'Via Example', 'beeyond.it'].forEach(ph => {
    const n = h.split(ph).length - 1;
    if (n) warn.push(`${p}: ${n}x placeholder "${ph}"`);
  });

});
// main.js is not in `pages`, but it holds the address the contact form actually mails
['beeyond.example', '000 000 0000'].forEach(ph => {
  const n = fs.readFileSync('main.js', 'utf8').split(ph).length - 1;
  if (n) warn.push(`main.js: ${n}x placeholder "${ph}"`);
});

Object.entries(titles).forEach(([t, ps]) => {
  if (ps.length > 1) bad.push(`duplicate <title> "${t}" on ${ps.join(", ")}`);
});


if (warn.length) console.warn('placeholders still in place:\n  ' + warn.join('\n  ') + '\n');
if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('OK - ' + pages.length + ' pages wired correctly');
