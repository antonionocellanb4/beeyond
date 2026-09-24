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

    const logoEl = document.querySelector(".underlay-nav__logo");
    const rootStyle = getComputedStyle(document.documentElement);
    const overDark = rootStyle.getPropertyValue("--inv-fg").trim();   // cream, for dark bands
    const overLight = getComputedStyle(toggleBtn).color;              // near-black, for light ones
    const openColor = getComputedStyle(menuEl).color;

    /* the header reads whatever band is under it, so its colour is not a constant */
    let closedColor = overLight;

    // the panel is fixed to the right and never moves: on a narrow screen it reaches
    // under the logo, where cream on cream disappears. Ask the geometry, not a breakpoint.
    const openLogoColor = () =>
      logoEl.getBoundingClientRect().right > menuEl.getBoundingClientRect().left ? overLight : overDark;

    let isOpen = false;
    let tl;
    let enterEndTime = 0;
    var CLOSE_SPEED = 1.6;

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
        .to(logoEl, { color: openLogoColor, duration: 0.4 }, 0)
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

      tl.to([largeItems, smallItems], { autoAlpha: 0, duration: 0.3 }, "<")
        .to([mainEl, overlayEl], { x: 0, duration: 0.6 }, "<")
        .to(darkEl, { autoAlpha: 0, duration: 0.35, ease: "power2.inOut" }, "<")
        .to(corners, { scale: 0, duration: 0.5 }, "<")
        .to(overlayBorders[0], { yPercent: -100, duration: 0.5 }, "<")
        .to(overlayBorders[1], { yPercent: 100, duration: 0.5 }, "<")
        .to(toggleBtn, { color: () => closedColor, duration: 0.25 }, "<+=0.1")
        .to(logoEl, { color: () => closedColor, duration: 0.25 }, "<")
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
        // CLOSE_SPEED is the one knob: 1 is the reference pace, higher is quicker.
        // It scales whichever way out runs, so both feel the same.
        if (tl.time() < enterEndTime) tl.timeScale(CLOSE_SPEED).reverse();
        else tl.timeScale(CLOSE_SPEED).play();
      }
    }

    /* ---- header colour follows the band passing under it ---- */
    const bands = document.querySelectorAll("[data-nav-dark]");
    const onDark = new Set();
    let bandIO;

    const headerEl = document.querySelector(".underlay-nav__header");
    function paintHeader() {
      closedColor = onDark.size ? overDark : overLight;
      headerEl.dataset.tone = onDark.size ? "dark" : "light";   // the frosted halo follows the band too
      if (!isOpen) {
        gsap.to([toggleBtn, logoEl], { color: closedColor, duration: 0.35, ease: "power2.out" });
      }
    }

    function watchBands() {
      if (bandIO) bandIO.disconnect();
      const line = Math.round(toggleBtn.getBoundingClientRect().top + toggleBtn.offsetHeight / 2);
      // a one-pixel band at the height of the toggle: an element "intersects" only while it crosses it
      bandIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) onDark.add(e.target); else onDark.delete(e.target);
        });
        paintHeader();
      }, { rootMargin: -line + "px 0px " + (-innerHeight + line + 1) + "px 0px" });
      bands.forEach(function (b) { bandIO.observe(b); });
    }

    watchBands();

    /* ---- once the page moves, logo and toggle get a frosted halo so they read over anything ---- */
    const markScroll = () => headerEl.classList.toggle("is-scrolled", scrollY > 40);
    addEventListener("scroll", markScroll, { passive: true });
    markScroll();

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
        watchBands();   // the observer band is pinned to a pixel height
      }, 150);
    });
  }

  if (window.gsap && window.CustomEase) initFixedUnderlayNavigation();

  /* mark the page you are on so the menu can show it. Done here rather than in the
     markup: the nav is copied into six files, and one stale hand-typed flag is worse
     than none. Normalised so it holds both for local .html files and for the
     extensionless URLs Cloudflare Pages serves. */
  (function () {
    var norm = function (s) {
      return (s.split("#")[0].split("?")[0].split("/").pop() || "index").replace(/\.html$/, "");
    };
    var here = norm(location.pathname);
    $$(".underlay-nav__link-large").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) === "#") return;   // an anchor on this page is not a page of its own
      if (norm(href) === here) a.setAttribute("aria-current", "page");
    });
  })();

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
        // first click sorts up, a second click on the same header sorts down
        var asc = !(th.classList.contains('sorted') && th.classList.contains('asc'));
        $$('th', table).forEach(function (o) { o.classList.remove('sorted', 'asc'); });
        th.classList.add('sorted');
        if (asc) th.classList.add('asc');
        $$('td.is-sorted', body).forEach(function (td) { td.classList.remove('is-sorted'); });
        $$('tr', body).forEach(function (tr) { tr.children[col].classList.add('is-sorted'); });
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
    // ?product=Wave lands here from a product page, so preselect it
    var wanted = (new URLSearchParams(location.search).get('product') || '').toLowerCase();
    if (wanted) {
      $$('#technology option').forEach(function (o) {
        if (o.textContent.toLowerCase().indexOf(wanted) > -1) o.selected = true;
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form), l = [];
      d.forEach(function (v, k) { l.push(k.toUpperCase() + ': ' + v); });
      location.href = 'mailto:info@ecoimpiantisud.it?subject=' +
        encodeURIComponent('Enquiry - ' + (d.get('technology') || 'Beeyond')) +
        '&body=' + encodeURIComponent(l.join('\n'));
    });
  }


  /* ---- hotspots: a dot and its card light each other up. On a wide screen the scroll
          walks them one at a time, zooming the render onto each point and back out ---- */
  $$('[data-hotspots]').forEach(function (box) {
    var dots = $$('.hs-dot', box);
    var ns = dots.map(function (d) { return d.dataset.hs; });
    var active = null;   // what the scroll has reached; hover borrows the light and gives it back
    var owned = false;   // true while the scroll drives the light, so hover must keep out
    var paint = function (n) {
      $$('[data-hs]', box).forEach(function (el) { el.classList.toggle('on', el.dataset.hs === n); });
    };
    $$('[data-hs]', box).forEach(function (el) {
      ['mouseenter', 'focus'].forEach(function (e) {
        el.addEventListener(e, function () { if (!owned) paint(el.dataset.hs); });
      });
      ['mouseleave', 'blur'].forEach(function (e) {
        el.addEventListener(e, function () { if (!owned) paint(active); });
      });
    });

    var track = box.closest('[data-hs-track]');
    if (!track || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    track.style.setProperty('--hs-steps', ns.length);
    var go = function (n) { if (n !== active) { active = n; paint(n); } };

    gsap.matchMedia().add({
      // every width gets the held walk; only reduced motion keeps the plain stacked list
      wide: '(prefers-reduced-motion: no-preference)',
      narrow: '(prefers-reduced-motion: reduce)'
    }, function (ctx) {
      if (ctx.conditions.wide) {
        // the zoom sweeps dots under a pointer that is resting while the wheel turns, and
        // mouseenter then stole the card from the scroll - 3 wrong cards in 249 samples
        owned = true;
        var stage = $('.hs-stage', box);
        var layer = $('.hs-zoom', box);
        var Z = 2.2;
        // CSS sticky holds the block; this only has to know where it sits. Centred under
        // the nav, and the same number feeds both the sticky top and the trigger bounds.
        var top = function () {
          var nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
          return nav + Math.max(0, (innerHeight - nav - box.offsetHeight) / 2);
        };
        track.style.setProperty('--hs-top', top() + 'px');
        go(ns[0]);   // one card is always showing, so the column is never empty on the way in

        var tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: track,
            start: function () { return 'top ' + top(); },
            end: function () { return 'bottom ' + (top() + box.offsetHeight); },
            scrub: 0.6,
            onRefresh: function () { track.style.setProperty('--hs-top', top() + 'px'); },
            onUpdate: function (st) {
              go(ns[Math.min(ns.length - 1, Math.floor(st.progress * ns.length))]);
            },
            onLeaveBack: function () { go(ns[0]); }
          }
        });
        // every point gets the same three beats - in, hold, out - so step k occupies exactly
        // the k-th slice of the scroll, which is what onUpdate reads to pick the card
        dots.forEach(function (d) {
          var px = parseFloat(d.style.getPropertyValue('--x')) / 100;
          var py = parseFloat(d.style.getPropertyValue('--y')) / 100;
          // the layer moves, the stage carries --z: dots shrink by it and the mask closes on it
          tl.to(layer, { scale: Z, xPercent: (0.5 - px * Z) * 100, yPercent: (0.5 - py * Z) * 100, duration: 1 })
            .to(stage, { "--z": Z, duration: 1 }, "<")
            .to(layer, { duration: 0.6 })
            .to(layer, { scale: 1, xPercent: 0, yPercent: 0, duration: 0.7 })
            .to(stage, { "--z": 1, duration: 0.7 }, "<");
        });
        // scroll owns the light while this layout is on; give hover back when it turns off
        return function () { owned = false; };
      } else {
        // stacked: no holding, each card lights its point as it crosses the reading line
        $$('.adv li', box).forEach(function (li) {
          ScrollTrigger.create({
            trigger: li, start: 'top 62%', end: 'bottom 62%',
            onToggle: function (st) { if (st.isActive) go(li.dataset.hs); }
          });
        });
      }
    });
  });

  /* ---- see applications: the pill opens its machine's sectors in a modal; a click on the
          backdrop or the cross closes it, Esc comes with <dialog> ---- */
  $$('[data-apps]').forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.apps);
    if (!dlg || !dlg.showModal) return;
    btn.addEventListener('click', function () { dlg.showModal(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  /* ---- the play badge opens the film: the file is only fetched on the first press, and closing
          stops it and rewinds, so reopening starts from the beginning ---- */
  $$('[data-video]').forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.video);
    var film = dlg && $('video', dlg);
    if (!film || !dlg.showModal) return;
    btn.addEventListener('click', function () {
      if (!film.src) film.src = film.dataset.src;
      dlg.showModal();
      film.play().catch(function () {});   // a browser that blocks autoplay leaves the controls
    });
    dlg.addEventListener('close', function () { film.pause(); film.currentTime = 0; });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  /* ---- coverage: a held scroll pulls back from one photo to the mosaic around it. Measured on
          the reference: scale falls 1 -> .51 evenly, gaps open early, and only at the end does the
          whole thing lift a quarter screen, the claim with it, so the bottom row arrives whole ---- */
  $$('[data-cov]').forEach(function (sec) {
    var track = $('.cov-track', sec), grid = $('.cov-grid', sec), claim = $('.cov-claim', sec);
    var words = $$('span', claim);
    var held = matchMedia('(prefers-reduced-motion: no-preference)'), raf = 0;
    var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
    var paint = function (p) {
      var s = 1 - 0.49 * p;
      var lift = -25 * Math.pow(p, 5);          // svh; stays near zero until the last third
      var half = 6 * clamp(p / 0.25);           // half the on-screen gap, px
      grid.style.transform = 'translateY(' + lift + 'svh) scale(' + s + ')';
      sec.style.setProperty('--cov-in', (half / s) + 'px');
      sec.style.setProperty('--cov-r', (half * 1.7 / s) + 'px');
      claim.style.transform = 'translateY(' + lift + 'svh)';
      claim.style.opacity = clamp((p - 0.04) / 0.08);
      words.forEach(function (w, i) {
        w.style.opacity = 0.22 + 0.78 * clamp((p - (0.12 + 0.4 * i / (words.length - 1))) / 0.07);
      });
    };
    var tick = function () {
      raf = 0;
      var run = track.offsetHeight - innerHeight;
      if (run > 0) paint(clamp(-track.getBoundingClientRect().top / run));
    };
    var onScroll = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var bind = function () {
      if (held.matches) {
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', onScroll);
        tick();
      } else {
        // back to the stylesheet: the finished mosaic, nothing held
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', onScroll);
        grid.style.transform = claim.style.transform = claim.style.opacity = '';
        sec.style.removeProperty('--cov-in');
        sec.style.removeProperty('--cov-r');
        words.forEach(function (w) { w.style.opacity = ''; });
      }
    };
    held.addEventListener('change', bind);
    bind();
  });

  /* ---- applications: a held scroll walks the sectors, one slice of scroll each. The wheel,
          the machine and its card follow; a sector name jumps straight to its slice ---- */
  $$('[data-apx]').forEach(function (sec) {
    var track = $('.apx-track', sec), stage = $('.apx-stage', sec), view = $('.apx-view', sec);
    var card = $('.apx-card', sec), ring = $('.apx-ring', sec), svg = $('.apx-line', sec), line = $('line', svg);
    var wheel = $('.apx-wheel ul', sec), count = $('.apx-count b', sec), row = $('.apx-tabs', sec);
    var names = $$('.apx-wheel li', sec), tabs = $$('.apx-tabs button', sec), icons = $$('.apx-ic', sec);
    var arrows = $$('.apx-arrow', sec);
    var N = tabs.length, cur = 0, raf = 0, wait = 0, aim = null;
    var held = matchMedia('(prefers-reduced-motion: no-preference)');

    // dotted line from the ring's edge to the card's top edge, redrawn once the ring has landed
    // phones centre the render above the card, whose height changes with the machine
    var fit = function () { view.style.setProperty('--ct', card.offsetTop + 'px'); };
    var draw = function () {
      fit();
      var v = view.getBoundingClientRect(), a = ring.getBoundingClientRect(), c = card.getBoundingClientRect();
      var ax = a.left + a.width / 2 - v.left, ay = a.top + a.height / 2 - v.top;
      var bx = c.left - v.left + Math.min(60, c.width / 3), by = c.top - v.top;
      var d = Math.hypot(bx - ax, by - ay) || 1, r = a.width / 2;
      line.setAttribute('x1', ax + (bx - ax) * r / d); line.setAttribute('y1', ay + (by - ay) * r / d);
      line.setAttribute('x2', bx); line.setAttribute('y2', by);
      svg.classList.remove('is-moving');
    };
    var show = function (i) {
      if (i === cur) return;
      var moved = tabs[i].dataset.m !== tabs[cur].dataset.m;
      cur = i;
      stage.dataset.m = tabs[i].dataset.m;
      fit();
      wheel.style.setProperty('--i', i);
      names.forEach(function (n, k) { n.className = k === i ? 'on' : Math.abs(k - i) === 1 ? 'near' : ''; });
      tabs.forEach(function (t, k) { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      icons.forEach(function (c, k) { c.classList.toggle('on', k === i); });
      count.textContent = (i < 9 ? '0' : '') + (i + 1);
      // the names are one sliding row: centre the current one without moving the page
      row.scrollTo({ left: tabs[i].offsetLeft - (row.clientWidth - tabs[i].offsetWidth) / 2, behavior: 'smooth' });
      arrows[0].disabled = i === 0; arrows[1].disabled = i === N - 1;
      if (aim === i) aim = null;
      if (moved) { svg.classList.add('is-moving'); clearTimeout(wait); wait = setTimeout(draw, 950); }
    };

    var tick = function () {
      raf = 0;
      var run = track.offsetHeight - innerHeight;
      if (run <= 0) return;
      var p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / run));
      show(Math.min(N - 1, Math.floor(p * N)));
    };
    var onScroll = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var bind = function () {
      if (held.matches) { addEventListener('scroll', onScroll, { passive: true }); tick(); }
      else removeEventListener('scroll', onScroll);
    };
    held.addEventListener('change', bind);
    bind();

    // held: a sector is a slice of scroll, so going to one means scrolling to the middle of its slice
    var go = function (k) {
      if (!held.matches) return show(k);
      aim = k;
      var run = track.offsetHeight - innerHeight;
      scrollTo({ top: track.getBoundingClientRect().top + scrollY + run * (k + 0.5) / N, behavior: 'smooth' });
    };
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    // quick clicks count from where the page is heading, not from the sector it has reached so far
    arrows.forEach(function (a) {
      a.addEventListener('click', function () {
        go(Math.max(0, Math.min(N - 1, (aim === null ? cur : aim) + Number(a.dataset.step))));
      });
    });
    addEventListener('resize', draw);
    addEventListener('load', draw);
    draw();
  });

  /* ---- applications page hero: an intro slice, then one slice of held scroll per sector. The list
          keeps the open sector in view; the machine, the card, the ring and the pills follow ---- */
  $$('[data-ind]').forEach(function (sec) {
    var track = $('.ind-track', sec), stage = $('.ind-stage', sec), panel = $('.ind-panel', sec), list = $('.ind-list', sec);
    var rows = $$('.ind-list li', sec), card = $('.ind-card', sec), ring = $('.ind-ring', sec);
    var svg = $('.ind-line', sec), line = $('line', svg);
    var N = rows.length, cur = 0, raf = 0, wait = 0;
    var held = matchMedia('(prefers-reduced-motion: no-preference)');

    // dotted line from the ring's edge to the card's left edge, redrawn once the ring has landed
    var draw = function () {
      var v = stage.getBoundingClientRect(), a = ring.getBoundingClientRect(), c = card.getBoundingClientRect();
      if (!a.width || !c.width) return;
      var ax = a.left + a.width / 2 - v.left, ay = a.top + a.height / 2 - v.top;
      var bx = c.left - v.left, by = c.top - v.top + c.height * 0.55;
      var d = Math.hypot(bx - ax, by - ay) || 1, r = a.width / 2;
      line.setAttribute('x1', ax + (bx - ax) * r / d); line.setAttribute('y1', ay + (by - ay) * r / d);
      line.setAttribute('x2', bx); line.setAttribute('y2', by);
      svg.classList.remove('is-moving');
    };
    // closed rows are all one height, so where the open one sits is known before the animation ends:
    // keep it a fifth of the way down the panel, never scrolling past the end of the list
    var place = function () {
      // measured on the button, not the row: a row still closing is taller than it is about to be
      var rowH = $('button', rows[0]).offsetHeight + 1;   // + the 1px rule between rows
      var media = $('.ind-media > div', rows[cur]).scrollHeight;
      var room = panel.clientHeight;
      var y = Math.max(0, Math.min(cur * rowH - room * 0.2, N * rowH - 1 + media - room));
      list.style.transform = 'translateY(' + -y + 'px)';
    };
    var show = function (i) {   // -1 is the intro
      var phase = i < 0 ? 'intro' : 'walk';
      if (stage.dataset.phase !== phase) stage.dataset.phase = phase;
      if (i < 0) { if (stage.dataset.m !== 'both') stage.dataset.m = 'both'; return; }
      var moved = stage.dataset.m !== rows[i].dataset.m;
      stage.dataset.m = rows[i].dataset.m;
      if (i !== cur) {
        cur = i;
        rows.forEach(function (r, k) {
          r.classList.toggle('on', k === i);
          $('button', r).setAttribute('aria-expanded', String(k === i));
        });
      }
      place();
      if (moved) { svg.classList.add('is-moving'); clearTimeout(wait); wait = setTimeout(draw, 1050); }
    };

    var tick = function () {
      raf = 0;
      var run = track.offsetHeight - innerHeight;
      if (run <= 0) return;
      var p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / run));
      show(Math.min(N, Math.floor(p * (N + 1))) - 1);
    };
    var onScroll = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var bind = function () {
      if (held.matches) { addEventListener('scroll', onScroll, { passive: true }); tick(); }
      else { removeEventListener('scroll', onScroll); show(cur); }
    };
    held.addEventListener('change', bind);
    bind();

    rows.forEach(function (r, k) {
      $('button', r).addEventListener('click', function () {
        if (!held.matches) return show(k);
        var run = track.offsetHeight - innerHeight;
        scrollTo({ top: track.getBoundingClientRect().top + scrollY + run * (k + 1.5) / (N + 1), behavior: 'smooth' });
      });
    });
    addEventListener('resize', function () { place(); draw(); });
    addEventListener('load', draw);
  });

  /* ---- section pill: built from the sections themselves ---- */
  $$("[data-pilot]").forEach(function (pilot) {
    var panel = $(".pilot-panel", pilot);
    var btn = $(".pilot-btn", pilot);
    var here = $(".pilot-here", pilot);

    // every section carrying a bracket label is worth an entry
    var stops = $$("main section").filter(function (s) { return $(".blabel", s); });
    if (stops.length < 2) { pilot.remove(); return; }

    var open = function (want) {
      pilot.toggleAttribute("data-open", want);
      btn.setAttribute("aria-expanded", want);
      if (want) panel.hidden = false;
      else setTimeout(function () {
        if (!pilot.hasAttribute("data-open")) panel.hidden = true;
      }, 400);
    };

    stops.forEach(function (s, n) {
      var name = $(".blabel", s).textContent.trim();
      if (!s.id) s.id = "s-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      var a = document.createElement("a");
      a.href = "#" + s.id;
      var num = document.createElement("span");
      num.className = "pilot-n";
      num.textContent = ("0" + (n + 1)).slice(-2);
      a.appendChild(num);
      a.appendChild(document.createTextNode(name));
      a.addEventListener("click", function () { open(false); });
      panel.appendChild(a);
    });

    var links = $$("a", panel);

    btn.addEventListener("click", function () { open(!pilot.hasAttribute("data-open")); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });
    document.addEventListener("click", function (e) { if (!pilot.contains(e.target)) open(false); });


    // past 20% of the page, and out of the way once the footer is up.
    // The mobile URL bar slides innerHeight by 60-100px while you scroll. Against a
    // single threshold the pill flips every time the bar moves, so the answer to
    // "show" and the answer to "hide" are kept a band apart.
    var foot = $("footer");
    var gate = function () {
      var shown = pilot.hasAttribute("data-shown");
      var pct = scrollY / ((document.documentElement.scrollHeight - innerHeight) || 1);
      var footTop = foot ? foot.getBoundingClientRect().top : Infinity;
      var show = shown
        ? pct > 0.16 && footTop > innerHeight - 90
        : pct > 0.20 && footTop > innerHeight + 90;
      pilot.toggleAttribute("data-shown", show);
      if (!show) open(false);
    };
    addEventListener("scroll", gate, { passive: true });
    addEventListener("resize", gate);
    gate();

    // name the section you are in
    var seen = new Map();
    var mark = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      var cur = stops.filter(function (s) { return seen.get(s); })[0];
      links.forEach(function (a, n) {
        var on = cur === stops[n];
        a.toggleAttribute("aria-current", on);
        if (on) here.textContent = $(".blabel", stops[n]).textContent.trim();
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    stops.forEach(function (s) { mark.observe(s); });
  });

  /* ---- dots field (osmo.supply resource, GSAP + InertiaPlugin) ---- */
  $$("[data-dots-container-init]").forEach(function (container) {
    if (!window.gsap || !window.InertiaPlugin) return;
    gsap.registerPlugin(InertiaPlugin);

    var css = getComputedStyle(document.documentElement);
    var base = getComputedStyle(container).getPropertyValue("--dot-base").trim();
    var active = getComputedStyle(container).getPropertyValue("--dot-active").trim();
    var threshold = 230, speedThreshold = 100, shockRadius = 325, shockPower = 5, maxSpeed = 5000;
    var dots = [], centers = [];

    var build = function () {
      container.innerHTML = "";
      dots = []; centers = [];
      var cs = getComputedStyle(container);
      var px = parseFloat(cs.fontSize);
      var gap = parseFloat(cs.gap);   // CSS owns the gap: a second copy here put every column in the wrong place
      var cell = px + gap;
      var cols = Math.floor((container.clientWidth + gap) / cell);
      var rows = Math.floor((container.clientHeight + gap) / cell);
      for (var n = 0; n < cols * rows; n++) {
        var d = document.createElement("div");
        d.className = "dot";
        d.style.setProperty("--dot-base", base);
        gsap.set(d, { x: 0, y: 0, backgroundColor: base });
        d._busy = false;
        container.appendChild(d);
        dots.push(d);
      }
      requestAnimationFrame(function () {
        centers = dots.map(function (d) {
          var r = d.getBoundingClientRect();
          return { el: d, x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2 };
        });
      });
    };

    var fling = function (el, pushX, pushY) {
      el._busy = true;
      gsap.to(el, {
        inertia: { x: pushX, y: pushY, resistance: 750 },
        onComplete: function () {
          gsap.to(el, { x: 0, y: 0, duration: 1.5, ease: "elastic.out(1,0.75)" });
          el._busy = false;
        }
      });
    };

    var lastT = 0, lastX = 0, lastY = 0;
    addEventListener("mousemove", function (e) {
      var now = performance.now(), dt = now - lastT || 16;
      var vx = (e.pageX - lastX) / dt * 1000, vy = (e.pageY - lastY) / dt * 1000;
      var speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) { var k = maxSpeed / speed; vx *= k; vy *= k; speed = maxSpeed; }
      lastT = now; lastX = e.pageX; lastY = e.pageY;
      requestAnimationFrame(function () {
        centers.forEach(function (c) {
          var dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
          var t = Math.max(0, 1 - dist / threshold);
          t = t * t * (3 - 2 * t);   // smoothstep: no hard edge where the glow ends
          gsap.set(c.el, { backgroundColor: gsap.utils.interpolate(base, active, t) });
          if (speed > speedThreshold && dist < threshold && !c.el._busy) {
            fling(c.el, (c.x - e.pageX) + vx * 0.005, (c.y - e.pageY) + vy * 0.005);
          }
        });
      });
    }, { passive: true });

    addEventListener("click", function (e) {
      centers.forEach(function (c) {
        var dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
        if (dist < shockRadius && !c.el._busy) {
          var f = Math.max(0, 1 - dist / shockRadius);
          fling(c.el, (c.x - e.pageX) * shockPower * f, (c.y - e.pageY) * shockPower * f);
        }
      });
    });

    var t;
    addEventListener("resize", function () { clearTimeout(t); t = setTimeout(build, 150); });
    build();
  });

  /* ---- pinned list: scroll position picks the live item ---- */
  $$("[data-lat]").forEach(function (lat) {
    var items = $$(".lat-list li", lat);
    var panels = $$(".lat-panel", lat);
    var seg = $(".lat-rail i", lat);
    var n = items.length;
    if (!n) return;
    var at = -1;

    seg.style.setProperty("--seg", (100 / n) + "%");

    var show = function (k) {
      if (k === at) return;
      at = k;
      items.forEach(function (li, j) { li.toggleAttribute("data-on", j === k); });
      panels.forEach(function (p, j) { p.toggleAttribute("data-on", j === k); });
      seg.style.setProperty("--segY", (k * 100 / n) + "%");
    };

    // On a phone the panel cannot sit beside the list, so every reason carries a copy
    // of its own caption and a tap opens it. Both layouts stay in the DOM; CSS picks.
    items.forEach(function (li, j) {
      var cap = panels[j] && $("figcaption", panels[j]);
      if (cap) li.appendChild(cap.cloneNode(true));
    });

    var track = function () {
      var r = lat.getBoundingClientRect();
      var travel = r.height - innerHeight;
      if (travel <= 0) return;   // not pinned: taps drive it, and scrolling must not fight them
      var p = Math.min(1, Math.max(0, -r.top / travel));
      show(Math.min(n - 1, Math.floor(p * n)));
    };

    $$("[data-lat-go]", lat).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = +btn.dataset.latGo;
        // pinned: scroll to the slice of the section that owns it. Otherwise open it in place
        if (lat.offsetHeight - innerHeight <= 0) return show(k);
        var top = lat.getBoundingClientRect().top + scrollY;
        scrollTo({ top: top + (lat.offsetHeight - innerHeight) * (k + 0.5) / n, behavior: "smooth" });
      });
    });

    addEventListener("scroll", track, { passive: true });
    addEventListener("resize", track);
    show(0);
    track();
  });

  /* ---- reel photos through WebGL: cards bend and wave with the track's speed and ripple
          under the pointer. The <img> stays underneath and hides only once its texture is
          on the GPU; no WebGL or reduced motion leaves the plain photos ---- */
  $$('[data-reel-gl]').forEach(function (reel) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var host = $('.reel-sticky', reel);
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true });
    if (!gl || !host) return;

    var VS = 'attribute vec2 p;uniform vec4 uRect;uniform vec2 uView;uniform float uBend;varying vec2 vUv;' +
      'void main(){vUv=p;vec2 xy=uRect.xy+p*uRect.zw;xy.x+=sin(p.y*3.14159)*uBend;' +
      'gl_Position=vec4(xy/uView*2.-1.,0.,1.);gl_Position.y*=-1.;}';
    var FS = 'precision mediump float;uniform sampler2D uTex;uniform vec2 uSize,uCover,uMouse;' +
      'uniform float uVel,uHover,uRipple,uTime;varying vec2 vUv;' +
      'void main(){vec2 uv=vUv;' +
      // ripple rings running out from the pointer while it moves, fading with distance
      'vec2 d=(uv-uMouse)*vec2(uSize.x/uSize.y,1.);float r=length(d);' +
      'uv+=d/(r+1e-4)*sin(r*22.-uTime*4.)*.015*uRipple*smoothstep(.6,0.,r);' +
      // a slow wave through the photo while the track moves
      'uv.y+=sin(uv.x*6.2832+uTime*1.5)*.012*uVel;' +
      // object-fit:cover, a small push-in on hover, a faint colour split with speed
      'vec2 c=(uv-.5)*uCover*(1.-.03*uHover)+.5;float s=.0025*uVel;' +
      'vec3 col=vec3(texture2D(uTex,c+vec2(s,0.)).r,texture2D(uTex,c).g,texture2D(uTex,c-vec2(s,0.)).b);' +
      // 12px rounded corners, matching .reel-img
      'vec2 q=abs(vUv-.5)*uSize-uSize*.5+12.;float a=clamp(12.5-length(max(q,0.)),0.,1.);' +
      'gl_FragColor=vec4(col*a,a);}';
    var shader = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    canvas.className = 'reel-gl';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    // a 20x20 grid, so the bend is a curve and not a skewed rectangle
    var N = 20, verts = [];
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var x0 = i / N, x1 = (i + 1) / N, y0 = j / N, y1 = (j + 1) / N;
      verts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uRect', 'uView', 'uBend', 'uSize', 'uCover', 'uMouse', 'uVel', 'uHover', 'uRipple', 'uTime'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var dead = false;   // set when the browser refuses the photos to WebGL
    var cards = $$('.reel-img', reel).map(function (box) {
      var card = { box: box, img: $('img', box), tex: null, hover: 0, ripple: 0, mx: 0.5, my: 0.5 };
      var upload = function () {
        if (dead) return;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, card.img);
        } catch (err) {
          // the page opened from file:// (or photos on another origin): the upload throws and
          // an empty texture draws as a black card over the photo. Drop the canvas instead,
          // so every card shows its plain <img>
          gl.deleteTexture(tex);
          dead = true;
          canvas.remove();
          return;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        card.tex = tex;
        box.classList.add('is-gl');
      };
      if (card.img.complete && card.img.naturalWidth) upload(); else card.img.addEventListener('load', upload);
      return card;
    });
    if (!cards.length || dead) return;

    var mouse = null, lastMouse = null, energy = 0, lastX = null, vel = 0, running = false, t0 = performance.now();
    host.addEventListener('pointermove', function (e) { mouse = [e.clientX, e.clientY]; });
    host.addEventListener('pointerleave', function () { mouse = null; });

    var frame = function (now) {
      if (!running || dead) return;
      requestAnimationFrame(frame);
      var hr = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(hr.width * dpr), h = Math.round(hr.height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uView, hr.width, hr.height);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      // track speed from the first card's travel: the same number for scroll and swipe
      var left = cards[0].box.getBoundingClientRect().left;
      if (lastX !== null) vel += ((left - lastX) - vel) * 0.12;
      lastX = left;
      var v = Math.max(-1, Math.min(1, vel / 60));   // full effect only at a fast flick
      // pointer energy: jumps with every move and dies out in about half a second once the
      // mouse rests, so a still pointer leaves the photo flat
      var moved = mouse && lastMouse ? Math.hypot(mouse[0] - lastMouse[0], mouse[1] - lastMouse[1]) : 0;
      energy = Math.max(energy * 0.92, Math.min(1, moved / 30));
      lastMouse = mouse;
      cards.forEach(function (c) {
        var r = c.box.getBoundingClientRect();
        var over = !!mouse && mouse[0] >= r.left && mouse[0] <= r.right && mouse[1] >= r.top && mouse[1] <= r.bottom;
        c.hover += ((over ? 1 : 0) - c.hover) * 0.08;
        c.ripple += ((over ? energy : 0) - c.ripple) * 0.2;
        if (over) {
          c.mx += ((mouse[0] - r.left) / r.width - c.mx) * 0.2;
          c.my += ((mouse[1] - r.top) / r.height - c.my) * 0.2;
        }
        if (!c.tex || r.right < hr.left - 80 || r.left > hr.right + 80) return;
        var a = r.width / r.height, ia = c.img.naturalWidth / c.img.naturalHeight;
        gl.bindTexture(gl.TEXTURE_2D, c.tex);
        gl.uniform4f(U.uRect, r.left - hr.left, r.top - hr.top, r.width, r.height);
        gl.uniform2f(U.uSize, r.width, r.height);
        gl.uniform2f(U.uCover, a > ia ? 1 : a / ia, a > ia ? ia / a : 1);
        gl.uniform1f(U.uBend, -v * 22);   // moving left, the middle of the card lags to the right
        gl.uniform1f(U.uVel, v);
        gl.uniform1f(U.uHover, c.hover);
        gl.uniform1f(U.uRipple, c.ripple);
        gl.uniform2f(U.uMouse, c.mx, c.my);
        gl.drawArrays(gl.TRIANGLES, 0, N * N * 6);
      });
    };
    // draw only while the reel is on screen
    new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting;
      if (on && !running) { lastX = null; running = true; requestAnimationFrame(frame); }
      running = on;
    }).observe(reel);
  });

  /* ---- home product cards: the render leans toward the pointer (GSAP quickTo). Fine
          pointers only - touch and reduced motion keep the plain CSS lift ---- */
  if (window.gsap && matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    $$('.pcard--render').forEach(function (card) {
      var stage = $('.pcard-stage', card), img = $('img.pcard-obj', card);
      if (!stage || !img) return;
      card.classList.add('is-tracked');
      gsap.set(img, { transformPerspective: 900 });
      var q = function (prop, d) { return gsap.quickTo(img, prop, { duration: d, ease: 'power3' }); };
      var x = q('x', 0.6), y = q('y', 0.6), rx = q('rotationX', 0.9), ry = q('rotationY', 0.9);
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        x(nx * 30); y(ny * 20 - 6); ry(nx * 12); rx(-ny * 9);
      });
      stage.addEventListener('pointerleave', function () { x(0); y(0); rx(0); ry(0); });
    });
  }

  /* ---- case history: the figures count up once they are in view, and on a mouse the
          plant photo follows the cursor along the closed rows ---- */
  if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('[data-count]').forEach(function (el) {
      var to = parseFloat(el.dataset.count), final = el.textContent;
      // the final text carries the shape: a sign where there is one, grouped thousands where there are any
      var sign = /^[+−-]/.test(final) ? final.charAt(0) : '';
      var group = final.indexOf(',') >= 0;
      var fmt = function (v) {
        var n = Math.round(Math.abs(v));
        return sign + (group ? n.toLocaleString('en-GB') : String(n));
      };
      new IntersectionObserver(function (es, io) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        el.textContent = fmt(0);   // only now: a figure that never comes into view keeps its real value
        var o = { v: 0 };
        gsap.to(o, {
          v: to, duration: 1.8, ease: 'power3.out',
          onUpdate: function () { el.textContent = fmt(o.v); },
          onComplete: function () { el.textContent = final; }
        });
      }, { threshold: 0.35 }).observe(el);
    });
  }
  if (window.gsap && matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    $$('[data-cases]').forEach(function (list) {
      var peek = document.createElement('div');
      peek.className = 'ch-peek';
      peek.setAttribute('aria-hidden', 'true');
      peek.innerHTML = '<img alt="">';
      list.appendChild(peek);
      var img = peek.firstChild, on = null, tx = 0;
      gsap.set(peek, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.8 });
      var x = gsap.quickTo(peek, 'x', { duration: 0.55, ease: 'power3' });
      var y = gsap.quickTo(peek, 'y', { duration: 0.55, ease: 'power3' });
      var show = function (d) {
        if (d === on) return;
        on = d;
        if (d) img.src = $('.ch-pics img', d).getAttribute('src');
        gsap.to(peek, { autoAlpha: d ? 1 : 0, scale: d ? 1 : 0.8, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      };
      // the photos load on the first visit to the list, not with the page
      list.addEventListener('pointerenter', function () {
        $$('.ch-pics img:first-child', list).forEach(function (i) { new Image().src = i.getAttribute('src'); });
      }, { once: true });
      list.addEventListener('pointermove', function (e) {
        var r = list.getBoundingClientRect(), half = peek.offsetWidth / 2;
        tx = Math.min(Math.max(e.clientX - r.left, half), r.width - half);   // held inside the list: no sideways overflow
        x(tx);
        y(e.clientY - r.top);
        var s = e.target.closest('summary');
        show(s && !s.parentElement.open ? s.parentElement : null);
      });
      list.addEventListener('pointerleave', function () { show(null); });
      // an open row shows its photos in place, so the floating one steps aside
      list.addEventListener('toggle', function (e) { if (e.target === on && on.open) show(null); }, true);
      // a slight lean while it catches up with the cursor
      gsap.ticker.add(function () {
        if (on) gsap.set(peek, { rotation: gsap.utils.clamp(-8, 8, (tx - gsap.getProperty(peek, 'x')) * 0.06) });
      });
    });
  }

  /* ---- footer year ---- */
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
