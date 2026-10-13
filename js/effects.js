/**
 * Logic Tech — Visual Effects & Micro-Animations
 * ================================================
 * - Floating ambient orbs (hero background)
 * - Rich scroll-reveal with stagger & direction variants
 * - Counter animation on stat numbers
 * - Card spotlight / cursor-follow glow
 * - Parallax hero text on mouse-move
 * - Custom cursor glow trail
 * - Page-enter transition
 * - Magnetic buttons
 * - Text shimmer on section headers
 */

(function () {
  'use strict';

  /* ─── Page-enter transition ──────────────────────────────────────── */
  function revealPage() {
    document.documentElement.classList.remove('page-entering');
    document.documentElement.classList.add('page-entered');
  }

  if (document.readyState === 'complete') {
    revealPage();
  } else {
    document.documentElement.classList.add('page-entering');
    window.addEventListener('load', function () {
      requestAnimationFrame(revealPage);
    });
    // Fallback safeguard so page is never stuck hidden
    setTimeout(revealPage, 600);
  }

  // Intercept internal links for exit transition
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
    if (link.getAttribute('target') === '_blank') return;
    e.preventDefault();
    document.documentElement.classList.remove('page-entered');
    document.documentElement.classList.add('page-exiting');
    setTimeout(function () { window.location.href = href; }, 300);
  });

  /* ─── Ambient floating orbs in hero ─────────────────────────────── */
  var heroSection = document.getElementById('hero') || document.querySelector('.hero-section');
  if (heroSection) {
    var heroBg = heroSection.querySelector('.hero-bg') || heroSection;
    var orbContainer = document.createElement('div');
    orbContainer.className = 'hero-orbs';
    heroBg.appendChild(orbContainer);

    var orbDefs = [
      { size: 420, x: 15,  y: 20,  dur: 18, delay: 0,   opacity: 0.12 },
      { size: 280, x: 75,  y: 60,  dur: 22, delay: -4,  opacity: 0.09 },
      { size: 350, x: 55,  y: 10,  dur: 26, delay: -8,  opacity: 0.07 },
      { size: 200, x: 10,  y: 70,  dur: 14, delay: -2,  opacity: 0.10 },
      { size: 160, x: 85,  y: 25,  dur: 20, delay: -6,  opacity: 0.08 },
    ];

    orbDefs.forEach(function (o, i) {
      var orb = document.createElement('div');
      orb.className = 'hero-orb';
      orb.style.cssText = [
        'width:' + o.size + 'px',
        'height:' + o.size + 'px',
        'left:' + o.x + '%',
        'top:' + o.y + '%',
        'opacity:' + o.opacity,
        'animation-duration:' + o.dur + 's',
        'animation-delay:' + o.delay + 's',
        'animation-name:orbFloat' + (i % 3),
      ].join(';');
      orbContainer.appendChild(orb);
    });
  }

  /* ─── Advanced scroll-reveal observer ───────────────────────────── */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = parseFloat(el.getAttribute('data-reveal-delay') || '0');
          setTimeout(function () {
            el.classList.add('revealed');
          }, delay * 1000);
          revealObs.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* ─── Counter animation ──────────────────────────────────────────── */
  function animateCounter(el) {
    var text = el.textContent.trim();
    // Extract prefix, number, suffix
    var match = text.match(/^([^0-9]*)([0-9][0-9,.]*)([^0-9]*)$/);
    if (!match) return;
    var prefix = match[1];
    var numStr  = match[2].replace(/,/g, '');
    var suffix  = match[3];
    var isFloat = numStr.includes('.');
    var target  = parseFloat(numStr);
    if (isNaN(target) || target === 0) return;

    var duration = 2000;
    var startTime = null;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased    = easeOut(progress);
      var current  = target * eased;

      var display;
      if (isFloat) {
        display = current.toFixed(2);
      } else if (target >= 1000) {
        display = Math.round(current).toLocaleString();
      } else {
        display = Math.round(current).toString();
      }

      el.textContent = prefix + display + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  var counterEls = document.querySelectorAll('.stat-value');
  if (counterEls.length) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterEls.forEach(function (el) { counterObs.observe(el); });
  }

  /* ─── Card spotlight glow (mouse-follow within card) ─────────────── */
  function attachSpotlight(cards) {
    cards.forEach(function (card) {
      card.classList.add('spotlight-card');
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--spot-x', x + 'px');
        card.style.setProperty('--spot-y', y + 'px');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--spot-x', '-999px');
        card.style.setProperty('--spot-y', '-999px');
      });
    });
  }

  attachSpotlight(document.querySelectorAll('.service-card, .stat-card, .step-card, .case-card, .team-card, .value-card, .tech-card'));

  /* ─── Magnetic buttons ───────────────────────────────────────────── */
  document.querySelectorAll('.btn-primary, .btn-lg').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var rect = btn.getBoundingClientRect();
      var dx = (e.clientX - rect.left - rect.width  / 2) * 0.25;
      var dy = (e.clientY - rect.top  - rect.height / 2) * 0.25;
      btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translateY(-2px)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  });

  /* ─── Hero parallax on mouse-move ───────────────────────────────── */
  var heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth  - 0.5) * 18;
      var y = (e.clientY / window.innerHeight - 0.5) * 12;
      heroContent.style.transform = 'translate(' + (-x * 0.4) + 'px,' + (-y * 0.4) + 'px)';
    });
  }

  /* ─── Custom cursor glow ─────────────────────────────────────────── */
  // Only on non-touch devices
  if (!window.matchMedia('(pointer: coarse)').matches) {
    var cursor = document.createElement('div');
    cursor.id = 'ltCursor';
    document.body.appendChild(cursor);

    var cursorDot = document.createElement('div');
    cursorDot.id = 'ltCursorDot';
    document.body.appendChild(cursorDot);

    var cx = 0, cy = 0, tx = 0, ty = 0;
    var isHovering = false;

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      cursorDot.style.left = tx + 'px';
      cursorDot.style.top  = ty + 'px';
    });

    function animateCursor() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      cursor.style.left = cx + 'px';
      cursor.style.top  = cy + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Scale on interactive elements
    var interactables = 'a, button, input, textarea, select, [role="button"], .chatbox-chip, .faq-q';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(interactables)) {
        cursor.classList.add('lt-cursor-hover');
        isHovering = true;
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(interactables)) {
        cursor.classList.remove('lt-cursor-hover');
        isHovering = false;
      }
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('lt-cursor-click'); });
    document.addEventListener('mouseup',   function () { cursor.classList.remove('lt-cursor-click'); });
  }

  /* ─── Section header shimmer on scroll into view ─────────────────── */
  var sectionHeaders = document.querySelectorAll('.section-header h2');
  var shimmerObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('shimmer-once');
        shimmerObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  sectionHeaders.forEach(function (el) { shimmerObs.observe(el); });

  /* ─── Stagger existing .animate-on-scroll elements with delay ────── */
  var aosEls = document.querySelectorAll('.animate-on-scroll');
  aosEls.forEach(function (el, i) {
    var siblings = Array.from(el.parentElement.children).filter(function (c) { return c.classList.contains('animate-on-scroll'); });
    var sibIdx = siblings.indexOf(el);
    if (sibIdx > 0) {
      el.style.transitionDelay = (sibIdx * 0.08) + 's';
    }
  });

  /* ─── IntersectionObserver to reveal .animate-on-scroll elements ─── */
  if (aosEls.length) {
    var aosObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          aosObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    aosEls.forEach(function (el) { aosObs.observe(el); });
  }

  /* ─── Tilt effect on testimonial cards ──────────────────────────── */
  document.querySelectorAll('.testimonial-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width  - 0.5;
      var y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = 'perspective(600px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 6) + 'deg) scale(1.02)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });

})();
