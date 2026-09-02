/* BEEYOND - all site behaviour. Vanilla, no deps. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- nav: solid background after scroll ---- */
  var nav = $('.nav');
  var onScroll = function () { nav.classList.toggle('solid', window.scrollY > 40); };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---- underlay menu: the page slides left off the panel ---- */
  var unav = $('.unav');
  if (unav) {
    var btn = $('[data-menu="toggle"]');
    var toggle = function (open) {
      document.body.classList.toggle('unav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      unav.setAttribute('aria-hidden', !open);
      if (btn) btn.setAttribute('aria-expanded', open);
    };
    $$('[data-menu]').forEach(function (b) {
      b.addEventListener('click', function () {
        toggle(b.dataset.menu === 'toggle' ? !document.body.classList.contains('unav-open') : false);
      });
    });
    $$('a', unav).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* ---- scroll reveal ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.rv').forEach(function (el) { io.observe(el); });

  /* ---- process stepper: highlights svg groups cumulatively ---- */
  $$('.proc').forEach(function (proc) {
    var steps = $$('.proc-steps button', proc);
    var parts = $$('[data-step]', proc);
    var timer;
    var show = function (n) {
      steps.forEach(function (b, i) { b.setAttribute('aria-selected', i === n); });
      parts.forEach(function (p) { p.classList.toggle('dim', +p.dataset.step > n + 1); });
    };
    var stop = function () { clearInterval(timer); proc.classList.add('paused'); };
    steps.forEach(function (b, i) {
      b.addEventListener('click', function () { stop(); show(i); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = (i + d + steps.length) % steps.length;
        stop(); show(n); steps[n].focus();
      });
    });
    show(0);
    // autoplay until first interaction
    var i = 0;
    timer = setInterval(function () { i = (i + 1) % steps.length; show(i); }, 3200);
    proc.addEventListener('click', stop, { once: true });
  });

  /* ---- generic tabs: [data-tabs] buttons -> panels by id ---- */
  $$('[data-tabs]').forEach(function (group) {
    var btns = $$('button[data-target]', group);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          o.setAttribute('aria-selected', o === b);
          var p = document.getElementById(o.dataset.target);
          if (p) p.hidden = o !== b;
        });
      });
    });
  });

  /* ---- table: text filter ---- */
  $$('[data-filter]').forEach(function (input) {
    var id = input.dataset.filter;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var rows = id === 'all' ? $$('tbody tr') : $$('tbody tr', document.getElementById(id));
      rows.forEach(function (tr) {
        tr.classList.toggle('hide', q !== '' && tr.textContent.toLowerCase().indexOf(q) === -1);
      });
    });
  });

  /* ---- table: click header to sort ---- */
  $$('table.sortable').forEach(function (table) {
    var body = $('tbody', table);
    $$('th', table).forEach(function (th, col) {
      th.addEventListener('click', function () {
        var asc = !(th.classList.contains('sorted') && !th.classList.contains('asc'));
        $$('th', table).forEach(function (o) { o.classList.remove('sorted', 'asc'); });
        th.classList.add('sorted');
        if (asc) th.classList.add('asc');
        var num = function (tr) {
          var t = tr.children[col].textContent.replace(/[^0-9.\-]/g, '');
          return t === '' ? NaN : parseFloat(t);
        };
        $$('tr', body)
          .sort(function (a, b) {
            var x = num(a), y = num(b);
            if (isNaN(x) || isNaN(y)) {
              return a.children[col].textContent.localeCompare(b.children[col].textContent) * (asc ? 1 : -1);
            }
            return (x - y) * (asc ? 1 : -1);
          })
          .forEach(function (tr) { body.appendChild(tr); });
      });
    });
  });

  /* ---- MDS: sludge concentration selector shows one m3/h column ---- */
  var conc = $('#conc');
  if (conc) {
    var applyConc = function () {
      $$('[data-conc]').forEach(function (cell) { cell.hidden = cell.dataset.conc !== conc.value; });
    };
    conc.addEventListener('change', applyConc);
    applyConc();
  }

  /* ---- contact form: opens the visitor's mail client (no backend yet) ---- */
  var form = $('#enquiry');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form), l = [];
      d.forEach(function (v, k) { l.push(k.toUpperCase() + ': ' + v); });
      location.href = 'mailto:info@beeyond.example?subject=' +
        encodeURIComponent('Enquiry - ' + (d.get('technology') || 'Beeyond')) +
        '&body=' + encodeURIComponent(l.join('\n'));
    });
  }


  /* ---- hotspots: a dot and its card light each other up ---- */
  $$('[data-hotspots]').forEach(function (box) {
    var mark = function (n, on) {
      $$('[data-hs="' + n + '"]', box).forEach(function (el) { el.classList.toggle('on', on); });
    };
    $$('[data-hs]', box).forEach(function (el) {
      var n = el.dataset.hs;
      ['mouseenter', 'focus'].forEach(function (e) {
        el.addEventListener(e, function () { mark(n, true); });
      });
      ['mouseleave', 'blur'].forEach(function (e) {
        el.addEventListener(e, function () { mark(n, false); });
      });
    });
  });

  /* ---- footer year ---- */
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
