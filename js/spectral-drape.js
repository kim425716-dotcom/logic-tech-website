/**
 * Spectral Drape — Vanilla JS / Canvas port
 * ──────────────────────────────────────────
 * Faithfully re-implements the React Bits Pro "Spectral Drape" component
 * (https://pro.reactbits.dev/docs/components/spectral-drape) as a zero-
 * dependency, pure JavaScript + Canvas 2D animation.
 *
 * A glowing drape of dots that folds in 3D, with a mouse-responsive
 * interactive brush that pushes the drape away from the cursor.
 *
 * Props / Configuration (matches React Bits Pro API):
 *   dotColor        – hex/rgba  dot fill color         (default: "#c49e58" = amber-light)
 *   glowColor       – hex/rgba  radial glow behind dot (default: "rgba(196,158,88,0.18)")
 *   backgroundColor – hex/rgba  canvas background       (default: "transparent")
 *   strands         – int       columns of dots        (default: 24)
 *   rows            – int       rows of dots           (default: 14)
 *   amplitude       – float     peak z-displacement    (default: 80)
 *   tiltX           – degrees   global 3D tilt X-axis  (default: 28)
 *   tiltY           – degrees   global 3D tilt Y-axis  (default: 0)
 *   speed           – float     wave animation speed   (default: 0.8)
 *   brushRadius     – px        interactive brush size (default: 160)
 *   brushStrength   – 0–1       brush repulsion force  (default: 0.55)
 *   dotSize         – px        base dot radius        (default: 2.4)
 *   glowSize        – multiplier of dotSize            (default: 5)
 *   waveFrequency   – float     spatial wave tightness (default: 0.38)
 *   fadeEdges       – bool      fade dots near edges   (default: true)
 *
 * Usage:
 *   SpectralDrape.init('#spectral-drape-canvas', { speed: 1.2 });
 *   SpectralDrape.destroy();
 */

/* global window, document, requestAnimationFrame, cancelAnimationFrame */

var SpectralDrape = (function () {
  'use strict';

  /* private state */
  var _canvas, _ctx, _raf, _opts, _mouse, _dots, _t;
  var _resizeObs;

  /* helpers */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function deg2rad(d) { return d * Math.PI / 180; }

  function parseColor(str) {
    str = str.trim();
    var hex = str.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      var h = hex[1];
      if (h.length === 3 || h.length === 4) {
        h = h.split('').map(function (c) { return c + c; }).join('');
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
      };
    }
    var rgba = str.match(/rgba?\(([^)]+)\)/i);
    if (rgba) {
      var p = rgba[1].split(',').map(parseFloat);
      return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] !== undefined ? p[3] : 1 };
    }
    return { r: 196, g: 158, b: 88, a: 1 };
  }

  function rgba(c, alpha) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (alpha !== undefined ? alpha : c.a) + ')';
  }

  function buildDots(W, H, o) {
    var dots = [];
    var cols = o.strands, rows = o.rows;
    var padX = W * 0.07, padY = H * 0.1;
    var spacingX = (W - padX * 2) / (cols - 1);
    var spacingY = (H - padY * 2) / (rows - 1);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        dots.push({
          gx: padX + c * spacingX,
          gy: padY + r * spacingY,
          col: c,
          row: r,
          offsetZ: 0,
          phase: c * 0.41 + r * 0.23
        });
      }
    }
    return dots;
  }

  function project(dot, W, H, z, o) {
    var cx = W / 2, cy = H / 2;
    var dx = dot.gx - cx, dy = dot.gy - cy;
    var cosX = Math.cos(deg2rad(o.tiltX)), sinX = Math.sin(deg2rad(o.tiltX));
    var cosY = Math.cos(deg2rad(o.tiltY)), sinY = Math.sin(deg2rad(o.tiltY));
    var dy2 = dy * cosX - z * sinX;
    var dz2 = dy * sinX + z * cosX;
    var dx2 = dx * cosY + dz2 * sinY;
    var dz3 = -dx * sinY + dz2 * cosY;
    var fov = 700;
    var scale = fov / (fov + dz3);
    return { x: cx + dx2 * scale, y: cy + dy2 * scale, scale: scale, depth: dz3 };
  }

  function waveZ(dot, t, o) {
    var primary = Math.sin(dot.col * o.waveFrequency + t + dot.phase) *
                  Math.cos(dot.row * o.waveFrequency * 0.6 + t * 0.5) *
                  o.amplitude;
    var secondary = Math.sin(dot.col * o.waveFrequency * 0.4 + t * 0.7 - dot.phase * 0.3) *
                    o.amplitude * 0.35;
    return primary + secondary;
  }

  function frame() {
    var W = _canvas.width / (window.devicePixelRatio || 1);
    var H = _canvas.height / (window.devicePixelRatio || 1);
    var o = _opts;
    var dotCol = o._dotCol, glowCol = o._glowCol;

    _ctx.clearRect(0, 0, W * (window.devicePixelRatio || 1), H * (window.devicePixelRatio || 1));

    _t += 0.016 * o.speed;

    var sorted = _dots.slice().sort(function (a, b) {
      var zA = waveZ(a, _t, o) + a.offsetZ;
      var zB = waveZ(b, _t, o) + b.offsetZ;
      return project(a, W, H, zA, o).depth - project(b, W, H, zB, o).depth;
    });

    var mx = _mouse.x, my = _mouse.y, inside = _mouse.inside;

    sorted.forEach(function (dot) {
      var wz = waveZ(dot, _t, o);

      if (inside) {
        var dx = dot.gx - mx, dy = dot.gy - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < o.brushRadius) {
          var force = (1 - dist / o.brushRadius) * o.brushStrength;
          var targetZ = force * o.amplitude * 1.5;
          dot.offsetZ += (targetZ - dot.offsetZ) * 0.18;
        } else {
          dot.offsetZ *= 0.88;
        }
      } else {
        dot.offsetZ *= 0.88;
      }

      var z = wz + dot.offsetZ;
      var proj = project(dot, W, H, z, o);

      var alpha = 1;
      if (o.fadeEdges) {
        var ex = Math.min(proj.x / (W * 0.12), 1 - proj.x / (W * 0.88), 1);
        var ey = Math.min(proj.y / (H * 0.12), 1 - proj.y / (H * 0.88), 1);
        alpha = clamp(Math.min(ex, ey), 0, 1);
      }

      var depthAlpha = clamp(lerp(0.35, 1.0, (proj.scale - 0.55) / 0.55), 0, 1);
      var finalAlpha = alpha * depthAlpha;
      if (finalAlpha < 0.01) return;

      var r = o.dotSize * proj.scale;
      var glowR = r * o.glowSize;

      var grad = _ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowR);
      grad.addColorStop(0, rgba(glowCol, finalAlpha * 0.7));
      grad.addColorStop(1, rgba(glowCol, 0));
      _ctx.beginPath();
      _ctx.arc(proj.x, proj.y, glowR, 0, Math.PI * 2);
      _ctx.fillStyle = grad;
      _ctx.fill();

      _ctx.beginPath();
      _ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      _ctx.fillStyle = rgba(dotCol, finalAlpha);
      _ctx.fill();
    });

    _raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!_canvas) return;
    var parent = _canvas.parentElement;
    var W = parent ? parent.offsetWidth : window.innerWidth;
    var H = parent ? parent.offsetHeight : window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    _canvas.width  = W * dpr;
    _canvas.height = H * dpr;
    _canvas.style.width  = W + 'px';
    _canvas.style.height = H + 'px';
    _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _dots = buildDots(W, H, _opts);
  }

  function init(target, options) {
    destroy();

    _canvas = typeof target === 'string' ? document.querySelector(target) : target;
    if (!_canvas || _canvas.tagName !== 'CANVAS') {
      console.warn('[SpectralDrape] target must be a <canvas> element');
      return;
    }
    _ctx = _canvas.getContext('2d');

    _opts = Object.assign({
      dotColor:        '#c49e58',
      glowColor:       'rgba(196,158,88,0.22)',
      backgroundColor: 'transparent',
      strands:         26,
      rows:            15,
      amplitude:       90,
      tiltX:           30,
      tiltY:           0,
      speed:           0.75,
      brushRadius:     180,
      brushStrength:   0.6,
      dotSize:         2.6,
      glowSize:        5.5,
      waveFrequency:   0.35,
      fadeEdges:       true
    }, options || {});

    _opts._dotCol  = parseColor(_opts.dotColor);
    _opts._glowCol = parseColor(_opts.glowColor);

    _mouse = { x: -9999, y: -9999, inside: false };
    _t = Math.random() * 100;

    function onMove(e) {
      var rect = _canvas.getBoundingClientRect();
      _mouse.x = e.clientX - rect.left;
      _mouse.y = e.clientY - rect.top;
      _mouse.inside = true;
    }
    function onLeave() { _mouse.inside = false; }
    function onTouch(e) {
      if (!e.touches.length) return;
      var rect = _canvas.getBoundingClientRect();
      _mouse.x = e.touches[0].clientX - rect.left;
      _mouse.y = e.touches[0].clientY - rect.top;
      _mouse.inside = true;
    }

    _canvas.addEventListener('mousemove', onMove);
    _canvas.addEventListener('mouseleave', onLeave);
    _canvas.addEventListener('touchmove', onTouch, { passive: true });
    _canvas.addEventListener('touchend', onLeave);

    // Since the canvas has pointer-events:none (content sits on top),
    // we track mouse on document so the brush works across the whole page.
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('touchmove', onTouch, { passive: true });
    document.addEventListener('touchend', onLeave);

    _canvas._sdCleanup = function () {
      _canvas.removeEventListener('mousemove', onMove);
      _canvas.removeEventListener('mouseleave', onLeave);
      _canvas.removeEventListener('touchmove', onTouch);
      _canvas.removeEventListener('touchend', onLeave);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('touchmove', onTouch);
      document.removeEventListener('touchend', onLeave);
    };

    resize();

    if (window.ResizeObserver) {
      _resizeObs = new ResizeObserver(resize);
      _resizeObs.observe(_canvas.parentElement || document.body);
    } else {
      window.addEventListener('resize', resize);
    }

    _raf = requestAnimationFrame(frame);
  }

  function updateColors(dotColor, glowColor) {
    if (!_opts) return;
    if (dotColor)  { _opts.dotColor  = dotColor;  _opts._dotCol  = parseColor(dotColor); }
    if (glowColor) { _opts.glowColor = glowColor; _opts._glowCol = parseColor(glowColor); }
  }

  function destroy() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_canvas && _canvas._sdCleanup) { _canvas._sdCleanup(); }
    if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
    if (!window.ResizeObserver) { window.removeEventListener('resize', resize); }
    _canvas = _ctx = _opts = _mouse = _dots = null;
    _t = 0;
  }

  return { init: init, destroy: destroy, updateColors: updateColors };
}());
