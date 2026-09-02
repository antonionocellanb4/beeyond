/* BEEYOND - all site behaviour. Vanilla, no deps. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- fixed underlay navigation (osmo.supply resource, GSAP + CustomEase) ---- */
  function initFixedUnderlayNavigation() {
    CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");

    const toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
    const toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
    const toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
    const menuEl = document.querySelector("[data-underlay-nav-menu]");
    const largeItems = document.querySelectorAll("[data-reveal-l]");
    const smallItems = document.querySelectorAll("[data-reveal-s]");
    const menuBorder = document.querySelector(".underlay-nav__bottom-border");
    const mainEl = document.querySelector("[data-main]");
    const overlayEl = document.querySelector("[data-underlay-nav-overlay]");
    const darkEl = document.querySelector(".underlay-nav__dark");
    const corners = document.querySelectorAll(".underlay-nav__corner");
    const overlayBorders = document.querySelectorAll(".underlay-nav__border-row");

    if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

    const closedColor = getComputedStyle(toggleBtn).color;
    const openColor = getComputedStyle(menuEl).color;

    let isOpen = false;
    let tl;
    let enterEndTime = 0;

    const getMenuOffset = () => -menuEl.offsetWidth;

    gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
    gsap.set(darkEl, { autoAlpha: 0 });
    gsap.set(mainEl, { x: 0 });
    gsap.set(toggleLabels, { yPercent: 0 });
    gsap.set(toggleBars, { y: 0, rotation: 0 });
    gsap.set(menuBorder, { scaleX: 0 });
    gsap.set(overlayBorders[0], { yPercent: -100 });
    gsap.set(overlayBorders[1], { yPercent: 100 });
    gsap.set(corners, { scale: 0 });

    function buildTimeline() {
      tl = gsap.timeline({
        paused: true,
        defaults: { ease: "energy", easeReverse: "power2.inOut" }
      });

      tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);

      tl.to([mainEl, overlayEl], { x: getMenuOffset, duration: 0.7 }, 0)
        .to(darkEl, { autoAlpha: 1, duration: 0.5 }, 0)
        .to(corners, { scale: 1, duration: 0.5 }, 0)
        .to(overlayBorders, { yPercent: 0, duration: 0.5 }, 0)
        .to(toggleLabels, { yPercent: -100, duration: 0.4 }, 0)
        .to(toggleBtn, { color: openColor, duration: 0.4 }, 0)
        .to(toggleBars[0], {
          y: "0.25em", rotation: 45, duration: 0.35,
          ease: "back.out(1.4)", easeReverse: "power3.out"
        }, 0.05)
        .to(toggleBars[1], {
          y: "-0.25em", rotation: -45, duration: 0.35,
          ease: "back.out(1.4)", easeReverse: "power3.out"
        }, 0.05)
        .fromTo(largeItems,
          { autoAlpha: 0, xPercent: 25 },
          { autoAlpha: 1, xPercent: 0, duration: 0.7, stagger: 0.05 },
          0)
        .fromTo(smallItems,
          { autoAlpha: 0, yPercent: 100 },
          { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.03, ease: "power3.out" },
          0.3)
        .to(menuBorder, { scaleX: 1, duration: 0.5 }, "<");

      enterEndTime = tl.duration();

      tl.addPause();

      tl.to([largeItems, smallItems], { autoAlpha: 0, duration: 0.3 }, ">")
        .to([mainEl, overlayEl], { x: 0, duration: 0.6 }, "<")
        .to(darkEl, { autoAlpha: 0, duration: 0.35, ease: "power2.inOut" }, "<")
        .to(corners, { scale: 0, duration: 0.5 }, "<")
        .to(overlayBorders[0], { yPercent: -100, duration: 0.5 }, "<")
        .to(overlayBorders[1], { yPercent: 100, duration: 0.5 }, "<")
        .to(toggleBtn, { color: closedColor, duration: 0.25 }, "<")
        .to(toggleLabels, { yPercent: 0, duration: 0.25, ease: "power3.in" }, "<")
        .to(toggleBars, { y: 0, rotation: 0, duration: 0.25, ease: "power3.in" }, "<")
        .set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
    }

    function toggle() {
      isOpen = !isOpen;
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
      toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
      document.body.setAttribute("data-menu-status", isOpen ? "open" : "");

      if (isOpen) {
        tl.invalidate();
        if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
        else tl.timeScale(1).play();
      } else {
        if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
        else tl.timeScale(1).play();
      }
    }

    buildTimeline();

    toggleBtn.addEventListener("click", toggle);

    overlayEl.addEventListener("click", () => { if (isOpen) toggle(); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) { toggle(); toggleBtn.focus(); }
    });

    let resizeTimer;

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isOpen) gsap.set([mainEl, overlayEl], { x: getMenuOffset() });
        else tl.invalidate();
      }, 150);
    });
  }

  if (window.gsap && window.CustomEase) initFixedUnderlayNavigation();

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
