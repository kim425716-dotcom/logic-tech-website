/**
 * Logic Tech — Landing Page Effects (v1.1)
 * Hero cosmic particle constellation system + smooth interactive animations
 */
(function () {
  'use strict';

  /* ─── Particle Canvas ──────────────────────────────────────────────── */
  var canvas = document.getElementById('heroParticleCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', function () { resize(); initParticles(); }, { passive: true });

  document.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  /* Particle palette: Gold, Sky Blue, Violet, Emerald, Soft White */
  var colors = [
    'rgba(201,164,92,',   /* champagne gold */
    'rgba(96,165,250,',   /* blue           */
    'rgba(167,139,250,',  /* violet         */
    'rgba(52,211,153,',   /* emerald green  */
    'rgba(255,255,255,',  /* diamond white  */
  ];

  function Particle() {
    this.reset();
  }

  Particle.prototype.reset = function () {
    this.x      = Math.random() * W;
    this.y      = Math.random() * H;
    this.r      = Math.random() * 1.8 + 0.5;
    this.color  = colors[Math.floor(Math.random() * colors.length)];
    this.alpha  = Math.random() * 0.5 + 0.12;
    this.vx     = (Math.random() - 0.5) * 0.38;
    this.vy     = (Math.random() - 0.5) * 0.38 - 0.08;
    this.life   = 1;
    this.decay  = Math.random() * 0.0004 + 0.0002;
  };

  Particle.prototype.update = function () {
    /* Gentle mouse repulsion */
    var dx = this.x - mouse.x;
    var dy = this.y - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 140) {
      var force = (140 - dist) / 140;
      this.vx += (dx / dist) * force * 0.6;
      this.vy += (dy / dist) * force * 0.6;
    }

    /* Velocity damping */
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;

    /* Torus wrapping */
    if (this.x < 0)  this.x = W;
    if (this.x > W)  this.x = 0;
    if (this.y < -5) this.y = H + 5;
    if (this.y > H + 5) this.y = -5;

    if (this.life <= 0) this.reset();
  };

  Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color + (this.alpha * this.life) + ')';
    ctx.fill();
  };

  function initParticles() {
    var count = Math.min(Math.floor((W * H) / 5500), 180);
    if (window.innerWidth < 768) {
      count = Math.min(count, 70);
    }
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }
  initParticles();

  /* Constellation connection lines */
  function drawConnections() {
    var maxDist = 155;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          var alpha = (1 - d / maxDist) * 0.16;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(201,164,92,' + alpha + ')';
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }
  animate();

  /* ─── Smooth Section Reveal Observer ────────────────────────────────── */
  var newRevEls = document.querySelectorAll('.metric-pill, .hero-metrics, .hero-terminal, .hero-trust-bar, .stat-card, .service-card, .step-card');
  if (newRevEls.length && 'IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    newRevEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ─── Tech chips mouse parallax ─────────────────────────────────────── */
  var techChips = document.querySelectorAll('.tech-chip');
  if (techChips.length && window.innerWidth > 900) {
    document.addEventListener('mousemove', function (e) {
      var normX = (e.clientX / window.innerWidth - 0.5) * 2;
      var normY = (e.clientY / window.innerHeight - 0.5) * 2;
      techChips.forEach(function (chip, idx) {
        var depth = (idx % 3 + 1) * 8;
        chip.style.setProperty('--chip-px', (normX * depth) + 'px');
        chip.style.setProperty('--chip-py', (normY * depth) + 'px');
      });
    }, { passive: true });
  }

})();
