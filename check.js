/* Wiring check: node check.js
   Fails if a link, asset, anchor, tab panel or filter target does not exist. */
const fs = require('fs');
const pages = ['index.html', 'mds.html', 'wave.html', 'about.html', 'technology.html', 'contact.html'];
const bad = [];
const ids = {};

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
});

if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('OK - ' + pages.length + ' pages wired correctly');
