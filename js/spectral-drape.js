/**
 * Spectral Drape — Vanilla JS / Canvas port
 * ──────────────────────────────────────────
 * Faithful, high-performance vanilla JS + Canvas 2D implementation of the
 * React Bits Pro "Spectral Drape" component:
 * https://pro.reactbits.dev/docs/components/spectral-drape
 *
 * A glowing drape of dots suspended in 3D that folds and ripples like liquid silk,
 * with an interactive pointer brush that smoothly displaces dots on hover/touch.
 *
 * Matches the official React Bits Pro API:
 *   colors          – [bodyColor, crestColor] (default: ['#c49e58', '#fae5b8'])
 *   backgroundColor – string / 'transparent'
 *   strands         – number of vertical flowing strands (default: 26)
 *   rows            – dots per strand (default: 18)
 *   amplitude       – lateral wave swing across drape (default: 1.0)
 *   depth           – 3D fold height in Z axis (default: 1.0)
 *   frequency       – wave ripple density along strand (default: 1.0)
 *   tilt            – rotation X in degrees (default: -32)
 *   turn            – rotation Y in degrees (default: -15)
 *   roll            – rotation Z in degrees (default: 8)
 *   dotSize         – base dot radius in px (default: 2.2)
 *   softness        – glow halo spread (default: 0.6)
 *   intensity       – dot brightness multiplier (default: 1.0)
 *   colorShift      – crest highlight transition (default: 0.5)
 *   speed           – wave cycle speed (default: 0.8)
 *   interactive     – pointer repulsion enabled (default: true)
 *   brush           – push strength multiplier (default: 1.0)
 *   brushRadius     – interactive brush radius in px (default: 180)
 *   fadeEdges       – smooth edge feathering (default: true)
 */

/* global window, document, requestAnimationFrame, cancelAnimationFrame */

var SpectralDrape = (function () {
  'use strict';

  var _canvas, _ctx, _raf, _opts, _mouse, _dots, _t;
  var _resizeObs;
  var _glowSpriteBody, _glowSpriteCrest;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function deg2rad(d) { return d * Math.PI / 180; }

  function parseColor(str) {
    if (!str || typeof str !== 'string') return { r: 196, g: 158, b: 88, a: 1 };
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

  function lerpColor(c1, c2, t) {
    return {
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t)),
      a: lerp(c1.a, c2.a, t)
    };
  }

  function rgba(c, alpha) {
    var a = alpha !== undefined ? alpha : c.a;
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + clamp(a, 0, 1) + ')';
  }

  /**
   * Pre-render a radial glow sprite onto an offscreen canvas for zero-GC,
   * GPU-accelerated drawImage blitting.
   */
  function createGlowSprite(color) {
    var size = 64;
    var cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    var ctx = cvs.getContext('2d');
    var half = size / 2;
    var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, rgba(color, 0.85));
    grad.addColorStop(0.35, rgba(color, 0.45));
    grad.addColorStop(0.7, rgba(color, 0.15));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return cvs;
  }

  function buildDots(W, H, o) {
    var dots = [];
    var cols = o.strands;
    var rows = o.rows;
    var padX = W * 0.04;
    var padY = H * 0.06;
    var spacingX = (W - padX * 2) / Math.max(1, cols - 1);
    var spacingY = (H - padY * 2) / Math.max(1, rows - 1);

    for (var r = 0; r < rows; r++) {
      var v = r / Math.max(1, rows - 1); // 0 (top) to 1 (bottom)
      for (var c = 0; c < cols; c++) {
        var u = c / Math.max(1, cols - 1); // 0 (left) to 1 (right)
        dots.push({
          baseX: padX + c * spacingX,
          baseY: padY + r * spacingY,
          col: c,
          row: r,
          u: u,
          v: v,
          phase: c * 0.42 + r * 0.18,
          offsetZ: 0,
          offsetX: 0,
          offsetY: 0,
          // cached projection per frame
          px: 0,
          py: 0,
          scale: 1,
          depth: 0,
          crestFactor: 0
        });
      }
    }
    return dots;
  }

  function projectPoint(x, y, z, W, H, o) {
    var cx = W / 2;
    var cy = H / 2;
    var dx = x - cx;
    var dy = y - cy;

    // Roll (Z axis rotation in plane)
    var rollRad = deg2rad(o.roll || 0);
    var cosR = Math.cos(rollRad), sinR = Math.sin(rollRad);
    var rx = dx * cosR - dy * sinR;
    var ry = dx * sinR + dy * cosR;

    // Tilt (X axis) & Turn (Y axis)
    var tiltRad = deg2rad(o.tilt);
    var turnRad = deg2rad(o.turn);
    var cosX = Math.cos(tiltRad), sinX = Math.sin(tiltRad);
    var cosY = Math.cos(turnRad), sinY = Math.sin(turnRad);

    var dy2 = ry * cosX - z * sinX;
    var dz2 = ry * sinX + z * cosX;

    var dx2 = rx * cosY + dz2 * sinY;
    var dz3 = -rx * sinY + dz2 * cosY;

    var fov = 750;
    var scale = fov / Math.max(80, fov + dz3);

    return {
      x: cx + dx2 * scale,
      y: cy + dy2 * scale,
      scale: scale,
      depth: dz3
    };
  }

  function frame() {
    if (!_canvas || !_ctx || !_opts) return;

    var dpr = window.devicePixelRatio || 1;
    var W = _canvas.width / dpr;
    var H = _canvas.height / dpr;
    var o = _opts;

    _ctx.clearRect(0, 0, W, H);

    _t += 0.015 * o.speed;

    var mx = _mouse.x;
    var my = _mouse.y;
    var hasPointer = _mouse.inside && o.interactive;

    var baseDepth = 85 * o.depth;
    var baseAmp = 45 * o.amplitude;

    // 1. Compute 3D waves & pointer displacement
    for (var i = 0; i < _dots.length; i++) {
      var dot = _dots[i];

      // Multi-frequency wave folds rippling through the drape
      var w1 = Math.sin(dot.v * Math.PI * 2.2 * o.frequency + dot.col * 0.48 + _t);
      var w2 = Math.cos(dot.v * Math.PI * 3.6 * o.frequency - dot.col * 0.32 + _t * 0.75);
      var w3 = Math.sin(dot.u * Math.PI * 1.8 + _t * 0.5);

      var foldZ = (w1 * 0.65 + w2 * 0.35 + w3 * 0.2) * baseDepth;
      var swingX = Math.sin(dot.v * Math.PI * 1.6 + dot.phase + _t * 0.7) * baseAmp;

      // Pointer interactive brush
      if (hasPointer) {
        var dx = dot.baseX - mx;
        var dy = dot.baseY - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var bRad = o.brushRadius;
        if (dist < bRad) {
          var tFactor = 1 - dist / bRad;
          var falloff = tFactor * tFactor * (3 - 2 * tFactor); // smoothstep
          var force = falloff * o.brush;
          var targetZ = force * baseDepth * 1.6;
          var targetX = (dx / (dist + 1)) * force * 50;
          var targetY = (dy / (dist + 1)) * force * 30;
          dot.offsetZ += (targetZ - dot.offsetZ) * 0.22;
          dot.offsetX += (targetX - dot.offsetX) * 0.22;
          dot.offsetY += (targetY - dot.offsetY) * 0.22;
        } else {
          dot.offsetZ *= 0.90;
          dot.offsetX *= 0.90;
          dot.offsetY *= 0.90;
        }
      } else {
        dot.offsetZ *= 0.90;
        dot.offsetX *= 0.90;
        dot.offsetY *= 0.90;
      }

      var worldX = dot.baseX + swingX + dot.offsetX;
      var worldY = dot.baseY + dot.offsetY;
      var worldZ = foldZ + dot.offsetZ;

      var proj = projectPoint(worldX, worldY, worldZ, W, H, o);
      dot.px = proj.x;
      dot.py = proj.y;
      dot.scale = proj.scale;
      dot.depth = proj.depth;

      // Crest factor: 0 in deep trough, 1 at peak crest
      var normZ = (worldZ + baseDepth) / Math.max(1, baseDepth * 2);
      dot.crestFactor = clamp(normZ, 0, 1);
    }

    // 2. Sort dots by depth (painter's algorithm: back to front)
    _dots.sort(function (a, b) {
      return a.depth - b.depth;
    });

    // 3. Render glowing dots & crest highlights
    var cBody = o._colBody;
    var cCrest = o._colCrest;
    var dotRadius = o.dotSize;
    var glowSpread = 8 * o.softness;
    var intensity = o.intensity;

    for (var j = 0; j < _dots.length; j++) {
      var d = _dots[j];
      var px = d.px;
      var py = d.py;
      var scale = d.scale;

      // Symmetrical edge feathering on all 4 viewport margins
      var alpha = 1;
      if (o.fadeEdges) {
        var edgeDistX = Math.min(px, W - px);
        var edgeDistY = Math.min(py, H - py);
        var fadeX = clamp(edgeDistX / (W * 0.08), 0, 1);
        var fadeY = clamp(edgeDistY / (H * 0.08), 0, 1);
        alpha = fadeX * fadeY;
      }

      // Depth perception alpha (nearer = brighter, farther = subtle)
      var depthAlpha = clamp(lerp(0.35, 1.0, (scale - 0.5) / 0.65), 0.2, 1.0);
      var finalAlpha = alpha * depthAlpha * intensity;
      if (finalAlpha <= 0.015) continue;

      // Interpolate color between body and crest highlight
      var crestBlend = clamp(d.crestFactor * (o.colorShift * 1.5), 0, 1);
      var dotColor = lerpColor(cBody, cCrest, crestBlend);

      var r = Math.max(0.8, dotRadius * scale * (1 + crestBlend * 0.35));
      var glowR = r * glowSpread;

      // Soft radial glow halo via pre-rendered sprite
      var sprite = crestBlend > 0.45 ? _glowSpriteCrest : _glowSpriteBody;
      if (sprite && glowR > 2) {
        _ctx.globalAlpha = finalAlpha * (0.45 + crestBlend * 0.4);
        _ctx.drawImage(sprite, px - glowR, py - glowR, glowR * 2, glowR * 2);
      }

      // Crisp luminous core dot
      _ctx.globalAlpha = finalAlpha;
      _ctx.fillStyle = rgba(dotColor, finalAlpha);
      _ctx.beginPath();
      _ctx.arc(px, py, r, 0, Math.PI * 2);
      _ctx.fill();
    }

    _ctx.globalAlpha = 1.0;
    _raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!_canvas || !_ctx) return;
    var parent = _canvas.parentElement;
    var W = parent ? parent.offsetWidth : window.innerWidth;
    var H = parent ? parent.offsetHeight : window.innerHeight;
    var dpr = window.devicePixelRatio || 1;

    _canvas.width = Math.round(W * dpr);
    _canvas.height = Math.round(H * dpr);
    _canvas.style.width = W + 'px';
    _canvas.style.height = H + 'px';

    _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (_opts) {
      _dots = buildDots(W, H, _opts);
    }
  }

  function init(target, options) {
    destroy();

    _canvas = typeof target === 'string' ? document.querySelector(target) : target;
    if (!_canvas || _canvas.tagName !== 'CANVAS') {
      console.warn('[SpectralDrape] Target must be a <canvas> element');
      return;
    }
    _ctx = _canvas.getContext('2d');

    // Default configuration matching React Bits Pro Spectral Drape spec
    _opts = Object.assign({
      colors:          ['#c49e58', '#f8e6bc'], // [body, crest]
      dotColor:        null,                   // backwards-compatible single color
      glowColor:       null,
      backgroundColor: 'transparent',
      strands:         28,                     // flowing vertical drape folds
      rows:            18,                     // dots per strand
      amplitude:       1.0,                    // lateral swing
      depth:           1.0,                    // 3D fold height in Z
      frequency:       1.0,                    // wave ripple density
      tilt:            -30,                    // X rotation (degrees)
      turn:            -12,                    // Y rotation (degrees)
      roll:            6,                      // Z in-plane rotation (degrees)
      dotSize:         2.4,                    // base dot radius in px
      softness:        0.65,                   // glow halo spread
      intensity:       1.0,                    // brightness
      colorShift:      0.5,                    // highlight crest transition
      speed:           0.75,                   // wave animation speed
      interactive:     true,                   // pointer push
      brush:           1.0,                    // push force
      brushRadius:     190,                    // brush radius in px
      fadeEdges:       true                    // edge feathering
    }, options || {});

    // Support legacy dotColor/glowColor or new colors array
    var bodyHex = (_opts.colors && _opts.colors[0]) || _opts.dotColor || '#c49e58';
    var crestHex = (_opts.colors && _opts.colors[1]) || _opts.glowColor || '#fae5b8';

    _opts._colBody = parseColor(bodyHex);
    _opts._colCrest = parseColor(crestHex);

    _glowSpriteBody = createGlowSprite(_opts._colBody);
    _glowSpriteCrest = createGlowSprite(_opts._colCrest);

    _mouse = { x: -9999, y: -9999, inside: false };
    _t = Math.random() * 50;

    function onMove(e) {
      var rect = _canvas.getBoundingClientRect();
      _mouse.x = e.clientX - rect.left;
      _mouse.y = e.clientY - rect.top;
      _mouse.inside = true;
    }
    function onLeave() {
      _mouse.inside = false;
    }
    function onTouch(e) {
      if (!e.touches.length) return;
      var rect = _canvas.getBoundingClientRect();
      _mouse.x = e.touches[0].clientX - rect.left;
      _mouse.y = e.touches[0].clientY - rect.top;
      _mouse.inside = true;
    }

    // Pointer events on document so interaction functions seamlessly through overlay content
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('touchmove', onTouch, { passive: true });
    document.addEventListener('touchend', onLeave);

    _canvas._sdCleanup = function () {
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

  function updateColors(bodyColor, crestColor) {
    if (!_opts) return;
    if (bodyColor) {
      _opts._colBody = parseColor(bodyColor);
      _glowSpriteBody = createGlowSprite(_opts._colBody);
    }
    if (crestColor) {
      _opts._colCrest = parseColor(crestColor);
      _glowSpriteCrest = createGlowSprite(_opts._colCrest);
    }
  }

  function destroy() {
    if (_raf) {
      cancelAnimationFrame(_raf);
      _raf = null;
    }
    if (_canvas && _canvas._sdCleanup) {
      _canvas._sdCleanup();
    }
    if (_resizeObs) {
      _resizeObs.disconnect();
      _resizeObs = null;
    }
    _canvas = _ctx = _opts = _mouse = _dots = null;
    _glowSpriteBody = _glowSpriteCrest = null;
    _t = 0;
  }

  return {
    init: init,
    destroy: destroy,
    updateColors: updateColors
  };
}());
