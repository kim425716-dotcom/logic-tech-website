/**
 * Logic Tech — Landing Page Effects
 * Hero particle system + enhanced animations
 */
(function () {
  'use strict';

  /* ─── Particle Canvas ──────────────────────────────────────────────── */
  var canvas = document.getElementById('heroParticleCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', function () { resize(); initParticles(); });

  document.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  document.addEventListener('mouseleave', function () {
    mouse.x = -9999; mouse.y = -9999;
  });

  /* Particle palette */
  var colors = [
    'rgba(201,164,92,',   /* gold    */
    'rgba(96,165,250,',   /* blue    */
    'rgba(167,139,250,',  /* violet  */
    'rgba(52,211,153,',   /* green   */
    'rgba(255,255,255,',  /* white   */
  ];

  function Particle() {
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x      = Math.random() * W;
    this.y      = Math.random() * H;
    this.r      = Math.random() * 1.5 + 0.4;
    this.color  = colors[Math.floor(Math.random() * colors.length)];
    this.alpha  = Math.random() * 0.4 + 0.06;
    this.vx     = (Math.random() - 0.5) * 0.35;
    this.vy     = (Math.random() - 0.5) * 0.35 - 0.1;
    this.life   = 1;
    this.decay  = Math.random() * 0.0005 + 0.0002;
  };
  Particle.prototype.update = function () {
    /* Mouse repulsion */
    var dx = this.x - mouse.x;
    var dy = this.y - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      var force = (120 - dist) / 120;
      this.vx += dx / dist * force * 0.5;
      this.vy += dy / dist * force * 0.5;
    }
    /* Dampen velocity */
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;

    /* Wrap */
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
    var count = Math.min(Math.floor((W * H) / 7000), 140);
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }
  initParticles();

  /* Connection lines between nearby particles */
  function drawConnections() {
    var maxDist = 130;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          var alpha = (1 - d / maxDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(201,164,92,' + alpha + ')';
          ctx.lineWidth   = 0.5;
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

  /* ─── Terminal line stagger re-trigger on load ─────────────────────── */
  /* Lines already have animation-delay set via inline style */

  /* ─── Metric pill counter animations ──────────────────────────────── */
  /* handled by effects.js counter observer */

  /* ─── Smooth section reveal for new classes ───────────────────────── */
  var newRevEls = document.querySelectorAll('.metric-pill, .hero-metrics, .hero-terminal, .hero-trust-bar');
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

  /* ─── Section header underline draw on scroll ──────────────────────── */
  var h2s = document.querySelectorAll('.section-header h2');
  h2s.forEach(function (h2) {
    var div = document.createElement('div');
    div.className = 'section-divider';
    h2.parentElement.insertBefore(div, h2.nextSibling);
  });

  /* ─── Service card shimmer layer inject ───────────────────────────── */
  document.querySelectorAll('.service-card').forEach(function (card) {
    var shimmer = document.createElement('div');
    shimmer.className = 'card-shimmer';
    card.appendChild(shimmer);
  });

})();

