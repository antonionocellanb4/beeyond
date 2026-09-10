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
        .to(logoEl, { color: overDark, duration: 0.4 }, 0)
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
        .to(toggleBtn, { color: () => closedColor, duration: 0.25 }, "<")
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

      tl.invalidate();   // re-reads closedColor, which the band watcher moves

      if (isOpen) {
        if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
        else tl.timeScale(1).play();
      } else {
        if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
        else tl.timeScale(1).play();
      }
    }

    /* ---- header colour follows the band passing under it ---- */
    const bands = document.querySelectorAll("[data-nav-dark]");
    const onDark = new Set();
    let bandIO;

    function paintHeader() {
      closedColor = onDark.size ? overDark : overLight;
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


    // past 20% of the page, and out of the way once the footer is up
    var foot = $("footer");
    var gate = function () {
      var pct = scrollY / ((document.body.scrollHeight - innerHeight) || 1);
      var footUp = foot && foot.getBoundingClientRect().top < innerHeight;
      var show = pct > 0.2 && !footUp;
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
      var px = parseFloat(getComputedStyle(container).fontSize);
      var gap = px * 2;
      var cols = Math.floor((container.clientWidth + gap) / (px + gap));
      var rows = Math.floor((container.clientHeight + gap) / (px + gap));
      // a hole in the middle: that is where the logo sits
      var holeC = cols % 2 === 0 ? 4 : 3, holeR = rows % 2 === 0 ? 2 : 3;
      var c0 = (cols - holeC) / 2, r0 = (rows - holeR) / 2;
      for (var n = 0; n < cols * rows; n++) {
        var row = Math.floor(n / cols), col = n % cols;
        var d = document.createElement("div");
        d.className = "dot";
        d.style.setProperty("--dot-base", base);
        if (row >= r0 && row < r0 + holeR && col >= c0 && col < c0 + holeC) {
          d.style.visibility = "hidden";
          d._hole = true;
        } else {
          gsap.set(d, { x: 0, y: 0, backgroundColor: base });
          d._busy = false;
        }
        container.appendChild(d);
        dots.push(d);
      }
      requestAnimationFrame(function () {
        centers = dots.filter(function (d) { return !d._hole; }).map(function (d) {
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

    var track = function () {
      var r = lat.getBoundingClientRect();
      var travel = r.height - innerHeight;
      if (travel <= 0) return show(0);
      var p = Math.min(1, Math.max(0, -r.top / travel));
      show(Math.min(n - 1, Math.floor(p * n)));
    };

    // clicking an item scrolls to the slice of the section that owns it
    $$("[data-lat-go]", lat).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = +btn.dataset.latGo;
        var top = lat.getBoundingClientRect().top + scrollY;
        scrollTo({ top: top + (lat.offsetHeight - innerHeight) * (k + 0.5) / n, behavior: "smooth" });
      });
    });

    addEventListener("scroll", track, { passive: true });
    addEventListener("resize", track);
    track();
  });

  /* ---- footer year ---- */
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
