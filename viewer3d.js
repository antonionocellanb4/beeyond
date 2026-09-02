/* BEEYOND - lightweight 3D placeholders, driven by page scroll.
   Geometry is generated in code, so there is no model file to download.
   ponytail: procedural stand-in for the real machines. When the CAD/GLB
   arrives, load it in build() and delete mds()/wave().
   three.js is only fetched when a viewer scrolls into view. */
(function () {
  'use strict';
  var boxes = [].slice.call(document.querySelectorAll('[data-model]'));
  if (!boxes.length) return;

  var SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var waiting = [], loading = false;

  function withThree(cb) {
    if (window.THREE) return cb(window.THREE);
    waiting.push(cb);
    if (loading) return;
    loading = true;
    var s = document.createElement('script');
    s.src = SRC;
    s.onload = function () { waiting.forEach(function (f) { f(window.THREE); }); waiting = []; };
    s.onerror = function () { boxes.forEach(function (b) { b.classList.add('v3d-failed'); }); };
    document.head.appendChild(s);
  }

  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ramp = function (p, a, b) { return clamp((p - a) / (b - a)); };

  /* ---------- MDS: drum, ring stack, narrowing screw, end plate ---------- */
  function mds(T, g) {
    var steel = new T.MeshStandardMaterial({ color: 0xB9C2C4, metalness: .7, roughness: .38 });
    var dark = new T.MeshStandardMaterial({ color: 0x394346, metalness: .5, roughness: .6 });
    var amber = new T.MeshStandardMaterial({ color: 0xFFC400, metalness: .5, roughness: .3 });
    var glass = new T.MeshStandardMaterial({
      color: 0x4FD1C5, metalness: .1, roughness: .12,
      transparent: true, opacity: .16, side: T.DoubleSide
    });

    var shell = new T.Mesh(new T.CylinderGeometry(1.9, 1.9, 9, 48, 1, true), glass);
    shell.rotation.z = Math.PI / 2;
    g.add(shell);

    // fixed rings (steel) interlaminated with free rings (amber)
    var fixedGeo = new T.TorusGeometry(1.62, .07, 8, 44);
    var freeGeo = new T.TorusGeometry(1.44, .06, 8, 40);
    var rings = [], free = new T.Group();
    for (var i = 0; i < 25; i++) {
      var x = -4.15 + i * .345;
      var fx = new T.Mesh(fixedGeo, steel);
      fx.rotation.y = Math.PI / 2; fx.position.x = x;
      rings.push({ mesh: fx, x: x }); g.add(fx);
      var fr = new T.Mesh(freeGeo, amber);
      fr.rotation.y = Math.PI / 2; fr.position.x = x + .17;
      rings.push({ mesh: fr, x: x + .17 }); free.add(fr);
    }
    g.add(free);

    // screw: helix whose radius shrinks toward the end plate
    function Helix() { T.Curve.call(this); }
    Helix.prototype = Object.create(T.Curve.prototype);
    Helix.prototype.constructor = Helix;
    Helix.prototype.getPoint = function (t) {
      var a = t * Math.PI * 2 * 8, r = 1.32 - .48 * t;
      return new T.Vector3(-4.2 + t * 8.4, Math.sin(a) * r, Math.cos(a) * r);
    };
    var screw = new T.Group();
    screw.add(new T.Mesh(new T.TubeGeometry(new Helix(), 300, .12, 10, false), steel));
    var shaft = new T.Mesh(new T.CylinderGeometry(.3, .3, 8.8, 24), dark);
    shaft.rotation.z = Math.PI / 2;
    screw.add(shaft);
    g.add(screw);

    var plate = new T.Mesh(new T.CylinderGeometry(2.05, 2.05, .22, 40), amber);
    plate.rotation.z = Math.PI / 2; plate.position.x = 4.7;
    g.add(plate);

    var hop = new T.Mesh(new T.CylinderGeometry(1.05, .45, 1.5, 4), dark);
    hop.position.set(-3.1, 2.5, 0); hop.rotation.y = Math.PI / 4;
    g.add(hop);

    var base = new T.Mesh(new T.BoxGeometry(10, .25, 2.8), dark);
    base.position.y = -2.75; g.add(base);
    [-4, 4].forEach(function (x) {
      var leg = new T.Mesh(new T.BoxGeometry(.3, 1.6, 2.4), dark);
      leg.position.set(x, -1.95, 0); g.add(leg);
    });

    var cake = new T.Mesh(new T.ConeGeometry(1, .8, 18),
      new T.MeshStandardMaterial({ color: 0x8A7648, roughness: .95 }));
    cake.position.set(6.1, -2.2, 0); g.add(cake);

    return function (t, p) {
      var open = ramp(p, 0, .42);        // drum fades away
      var ex = ramp(p, .42, 1);          // ring stack spreads out
      screw.rotation.x = -t * 1.1;
      free.rotation.x = -t * 1.1;
      glass.opacity = .16 * (1 - open);
      shell.visible = glass.opacity > .002;
      for (var i = 0; i < rings.length; i++) rings[i].mesh.position.x = rings[i].x * (1 + .5 * ex);
      plate.position.x = 4.7 * (1 + .5 * ex);
      cake.position.x = 6.1 * (1 + .5 * ex);
      base.visible = ex < .5;
    };
  }

  /* ---------- Wave Separator: oval discs on parallel shafts ---------- */
  function wave(T, g) {
    var teal = new T.MeshStandardMaterial({ color: 0x4FD1C5, metalness: .55, roughness: .35 });
    var steel = new T.MeshStandardMaterial({ color: 0xB9C2C4, metalness: .7, roughness: .4 });
    var dark = new T.MeshStandardMaterial({ color: 0x394346, metalness: .5, roughness: .6 });

    var discGeo = new T.CylinderGeometry(.82, .82, .1, 30);
    var shaftGeo = new T.CylinderGeometry(.07, .07, 5.4, 12);
    var shafts = [];

    for (var i = 0; i < 9; i++) {
      var row = new T.Group();
      row.position.x = -3.2 + i * .8;
      var sh = new T.Mesh(shaftGeo, steel);
      sh.rotation.x = Math.PI / 2;
      row.add(sh);
      for (var j = 0; j < 7; j++) {
        var d = new T.Mesh(discGeo, i % 2 ? teal : steel);
        d.scale.set(1, 1, .6);          // circle -> oval
        d.rotation.x = Math.PI / 2;     // face the shaft axis
        d.position.z = -2.4 + j * .8;
        row.add(d);
      }
      shafts.push({ g: row, x: -3.2 + i * .8 });
      g.add(row);
    }

    [-3.1, 3.1].forEach(function (z) {
      var rail = new T.Mesh(new T.BoxGeometry(8.4, .22, .3), dark);
      rail.position.set(0, 0, z); g.add(rail);
    });
    var troughMat = new T.MeshStandardMaterial({
      color: 0x4FD1C5, transparent: true, opacity: .12, side: T.DoubleSide, roughness: .2
    });
    var trough = new T.Mesh(new T.BoxGeometry(8.4, 1.5, 6), troughMat);
    trough.position.y = -1.5; g.add(trough);
    var base = new T.Mesh(new T.BoxGeometry(9, .25, 6.4), dark);
    base.position.y = -2.4; g.add(base);

    var solidMat = new T.MeshStandardMaterial({ color: 0x8A7648, roughness: .95, transparent: true });
    var solids = new T.Mesh(new T.BoxGeometry(6.6, .3, 4.2), solidMat);
    solids.position.set(.2, .55, 0); g.add(solids);

    return function (t, p) {
      var clear = ramp(p, 0, .42);       // solids leave the deck
      var ex = ramp(p, .42, 1);          // shafts spread apart
      for (var i = 0; i < shafts.length; i++) {
        shafts[i].g.rotation.z = i * .35 + t * 1.4;
        shafts[i].g.position.x = shafts[i].x * (1 + .55 * ex);
      }
      solidMat.opacity = 1 - clear;
      solids.visible = solidMat.opacity > .02;
      solids.position.x = .2 + Math.sin(t * .8) * .25;
      troughMat.opacity = .12 * (1 - ex);
      trough.position.y = -1.5 - ex * 1.4;
      base.visible = ex < .5;
    };
  }

  /* ---------- card object: one static cube, stands in for the machine ---------- */
  function cubes(T, g, kind) {
    var body = new T.MeshStandardMaterial({ metalness: .3, roughness: .55 });
    var edge = new T.LineBasicMaterial({ color: kind === 'wave' ? 0x2FB3A6 : 0xC79A12 });
    var geo = new T.BoxGeometry(1.5, 1.5, 1.5);
    var solid = new T.Mesh(geo, body);
    var wire = new T.LineSegments(new T.EdgesGeometry(geo), edge);
    solid.position.y = wire.position.y = -.6;   // sits low, so the wordmark clears it
    g.add(solid); g.add(wire);

    body.color.set(token('--panel-ink', '#0C1011'));

    return function () { /* static */ };
  }

  /* ---------- viewer plumbing ---------- */
  var views = [], running = false;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function token(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function build(T, box) {
    var wrap = box.closest('.v3d-scroll') || box;
    var card = box.dataset.model.indexOf('cube') === 0;   // small object on a product card
    var isWave = box.dataset.model.indexOf('wave') >= 0;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, box.clientWidth / box.clientHeight, .1, 100);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(box.clientWidth, box.clientHeight);
    box.insertBefore(renderer.domElement, box.firstChild);

    var ground = card ? '--panel' : '--ink';
    var hemi = new T.HemisphereLight(0x9FD8FF, new T.Color(token(ground, '#0A0D0E')), .85);
    scene.add(hemi);
    var key = new T.DirectionalLight(0xFFFFFF, 1.05); key.position.set(6, 9, 7); scene.add(key);
    var fill = new T.DirectionalLight(0xFFC400, .45); fill.position.set(-7, -3, -5); scene.add(fill);

    var g = new T.Group();
    var tick = card ? cubes(T, g, isWave ? 'wave' : 'mds') : (isWave ? wave : mds)(T, g);
    scene.add(g);
    camera.position.set(0, card ? .5 : isWave ? 4.6 : 2.9, card ? 8.6 : isWave ? 11 : 13);
    camera.lookAt(0, 0, 0);

    var v = {
      box: box, wrap: wrap, scene: scene, camera: camera, renderer: renderer, group: g, tick: tick,
      isWave: isWave, card: card, hemi: hemi, ground: ground, visible: true, dirty: true,
      t: 0, dragX: 0, dragY: 0, drag: null, fast: false,
      steps: [].slice.call(box.querySelectorAll('.v3d-step')),
      bar: box.querySelector('.v3d-bar'), shown: -1
    };

    if (!card) {
      box.addEventListener('pointerdown', function (e) {
        v.drag = { x: e.clientX, y: e.clientY };
        box.setPointerCapture(e.pointerId);
      });
      box.addEventListener('pointermove', function (e) {
        if (!v.drag) return;
        v.dragX += (e.clientX - v.drag.x) * .008;
        v.dragY = Math.max(-.7, Math.min(.9, v.dragY + (e.clientY - v.drag.y) * .005));
        v.drag = { x: e.clientX, y: e.clientY };
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        box.addEventListener(ev, function () { v.drag = null; });
      });
    }

    views.push(v);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  // 0 while the sticky viewer enters, 1 when its wrapper is fully scrolled
  function progress(v) {
    var r = v.wrap.getBoundingClientRect();
    var span = r.height - v.box.offsetHeight;
    return span <= 0 ? 0 : clamp(-r.top / span);
  }

  var last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, .05); last = now;
    for (var i = 0; i < views.length; i++) {
      var v = views[i];
      if (!v.visible) continue;
      if (!still) v.t += dt * (v.fast ? 2.6 : 1);

      if (v.card) {                       // static placeholder: draw once, redraw on change
        if (!v.dirty) continue;
        v.group.rotation.set(.3, -.62, 0);
        v.renderer.render(v.scene, v.camera);
        v.dirty = false;
        continue;
      }

      var p = progress(v);
      v.tick(v.t, p);
      v.group.rotation.y = -.75 + p * 1.7 + v.dragX;
      v.group.rotation.x = (v.isWave ? .18 : .06) + p * .22 + v.dragY;
      v.camera.position.z = (v.isWave ? 11 : 13) - p * 2.2;
      v.camera.lookAt(0, 0, 0);

      var step = p < .34 ? 0 : p < .68 ? 1 : 2;
      if (step !== v.shown) {
        v.shown = step;
        v.steps.forEach(function (s, n) { s.classList.toggle('on', n === step); });
      }
      if (v.bar) v.bar.style.width = (p * 100).toFixed(1) + '%';

      v.renderer.render(v.scene, v.camera);
    }
  }

  function resize() {
    views.forEach(function (v) {
      v.camera.aspect = v.box.clientWidth / v.box.clientHeight;
      v.camera.updateProjectionMatrix();
      v.renderer.setSize(v.box.clientWidth, v.box.clientHeight);
      v.dirty = true;
    });
  }
  addEventListener('resize', resize);

  // load and render only while on screen
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = views.filter(function (x) { return x.box === e.target; })[0];
      if (v) { v.visible = e.isIntersecting; return; }
      if (!e.isIntersecting || e.target.dataset.init) return;
      e.target.dataset.init = '1';                    // one build per box
      withThree(function (T) { build(T, e.target); });
    });
  }, { rootMargin: '200px' });
  boxes.forEach(function (b) { io.observe(b); });
})();
