/**
 * Logic Tech — 3D Section Flip Deck Controller
 * ==============================================
 * Enables smooth 3D perspective section flipping when scrolling down or up.
 * Supports:
 * - Mousewheel & Trackpad with momentum damping
 * - Full Touch & Swipe support on mobile devices
 * - Arrow keys, Page Up/Down navigation
 * - Smart inner-scroll detection (sections taller than viewport scroll before flipping)
 * - Side floating HUD with dot indicators & section labels
 * - Navbar anchor link synchronization
 * - Classic continuous scroll mode toggle
 */

(function () {
  'use strict';

  var deckWrapper = document.getElementById('flipDeck');
  if (!deckWrapper) return;

  var sections = Array.from(deckWrapper.querySelectorAll('.deck-section'));
  if (sections.length === 0) return;

  var currentIndex = 0;
  var isAnimating = false;
  var ANIMATION_DURATION = 850;
  var lastScrollTime = 0;

  var sectionMeta = [
    { id: 'hero', title: 'Enterprise Overview' },
    { id: 'stats', title: 'Impact & SLA Metrics' },
    { id: 'services', title: 'Core IT Solutions' },
    { id: 'how-it-works', title: '4-Step Framework' },
    { id: 'team', title: 'Leadership & Advisors' },
    { id: 'testimonials', title: 'Client Trust' },
    { id: 'faq', title: 'Frequently Asked Questions' },
    { id: 'contact', title: 'Consultation & Footer' },
  ];

  // Check saved mode (flip or classic)
  var isClassicMode = localStorage.getItem('lt-flip-mode') === 'classic';
  if (isClassicMode) {
    document.body.classList.add('classic-scroll-mode');
  }

  /* ── 1. Render Floating HUD & Controls ───────────────────────── */
  var hud = document.getElementById('deckHud');
  var hudDots = document.getElementById('deckHudDots');
  var hudCurrent = document.getElementById('hudCurrent');
  var hudTotal = document.getElementById('hudTotal');
  var nextBtn = document.getElementById('deckNextBtn');
  var modeToggle = document.getElementById('deckModeToggle');

  if (hudTotal) hudTotal.textContent = String(sections.length).padStart(2, '0');

  if (hudDots) {
    hudDots.innerHTML = '';
    sections.forEach(function (sec, idx) {
      var meta = sectionMeta[idx] || { title: 'Section ' + (idx + 1) };
      var li = document.createElement('li');
      li.className = 'deck-hud-dot-item' + (idx === 0 ? ' active' : '');
      li.innerHTML = [
        '<button class="deck-hud-dot" aria-label="Go to ' + meta.title + '"></button>',
        '<div class="deck-hud-tooltip">' + String(idx + 1).padStart(2, '0') + ' &bull; ' + meta.title + '</div>'
      ].join('');

      li.querySelector('.deck-hud-dot').addEventListener('click', function () {
        goToSection(idx);
      });

      hudDots.appendChild(li);
    });
  }

  /* ── 2. Fold & Flip Section Transition Engine ───────────────── */
  var allFoldClasses = [
    'active',
    'fold-up-exit',
    'fold-up-enter',
    'fold-down-exit',
    'fold-down-enter',
    'folded-top',
    'folded-bottom'
  ];

  function clearFoldClasses(el) {
    allFoldClasses.forEach(function (cls) { el.classList.remove(cls); });
  }

  function updateSectionStates(targetIdx, direction, prevIdx) {
    var outgoingSec = typeof prevIdx === 'number' && sections[prevIdx] ? sections[prevIdx] : null;
    var incomingSec = sections[targetIdx];

    if (!direction || direction === 'none' || !outgoingSec) {
      // Direct placement (initial load)
      sections.forEach(function (sec, idx) {
        clearFoldClasses(sec);
        if (idx === targetIdx) {
          sec.classList.add('active');
          triggerSectionAnimations(sec);
        } else if (idx < targetIdx) {
          sec.classList.add('folded-top');
        } else {
          sec.classList.add('folded-bottom');
        }
      });
    } else if (direction === 'down') {
      // Fold Up Sequence
      // 1. Outgoing folds upward along top hinge
      clearFoldClasses(outgoingSec);
      outgoingSec.classList.add('fold-up-exit');

      // 2. Incoming prepares at bottom hinge and unfolds
      clearFoldClasses(incomingSec);
      incomingSec.classList.add('fold-up-enter');
      incomingSec.scrollTop = 0;

      // Force layout reflow then snap to active
      void incomingSec.offsetWidth;
      requestAnimationFrame(function () {
        incomingSec.classList.remove('fold-up-enter');
        incomingSec.classList.add('active');
        triggerSectionAnimations(incomingSec);
      });

      // Update remaining idle sections
      sections.forEach(function (sec, idx) {
        if (idx !== targetIdx && idx !== prevIdx) {
          clearFoldClasses(sec);
          if (idx < targetIdx) sec.classList.add('folded-top');
          else sec.classList.add('folded-bottom');
        }
      });
    } else if (direction === 'up') {
      // Fold Down Sequence
      // 1. Outgoing folds downward along bottom hinge
      clearFoldClasses(outgoingSec);
      outgoingSec.classList.add('fold-down-exit');

      // 2. Incoming prepares at top hinge and unfolds
      clearFoldClasses(incomingSec);
      incomingSec.classList.add('fold-down-enter');
      if (incomingSec.scrollHeight > incomingSec.clientHeight) {
        incomingSec.scrollTop = incomingSec.scrollHeight - incomingSec.clientHeight;
      }

      // Force layout reflow then snap to active
      void incomingSec.offsetWidth;
      requestAnimationFrame(function () {
        incomingSec.classList.remove('fold-down-enter');
        incomingSec.classList.add('active');
        triggerSectionAnimations(incomingSec);
      });

      // Update remaining idle sections
      sections.forEach(function (sec, idx) {
        if (idx !== targetIdx && idx !== prevIdx) {
          clearFoldClasses(sec);
          if (idx < targetIdx) sec.classList.add('folded-top');
          else sec.classList.add('folded-bottom');
        }
      });
    }

    // Update HUD
    if (hudCurrent) hudCurrent.textContent = String(targetIdx + 1).padStart(2, '0');
    if (hudDots) {
      var dotItems = hudDots.querySelectorAll('.deck-hud-dot-item');
      dotItems.forEach(function (dot, i) {
        dot.classList.toggle('active', i === targetIdx);
      });
    }

    // Toggle last slide indicator
    if (targetIdx === sections.length - 1) {
      deckWrapper.classList.add('is-last-slide');
    } else {
      deckWrapper.classList.remove('is-last-slide');
    }
    deckWrapper.setAttribute('data-active-index', targetIdx);

    // Update navbar shadow depending on active section
    var navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.style.boxShadow = targetIdx > 0
        ? '0 4px 30px rgba(0,0,0,0.45)'
        : 'none';
    }

    // Update hash without jump
    var activeSec = sections[targetIdx];
    if (activeSec && activeSec.id) {
      history.replaceState(null, '', '#' + activeSec.id);
    }
  }

  function triggerSectionAnimations(sec) {
    var animEls = sec.querySelectorAll('.animate-on-scroll:not(.visible), [data-reveal]:not(.revealed)');
    animEls.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('visible', 'revealed');
      }, i * 60);
    });
  }

  function goToSection(targetIdx) {
    if (isClassicMode) return;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    if (targetIdx === currentIndex && sections[currentIndex].classList.contains('active')) return;

    var prevIdx = currentIndex;
    var direction = targetIdx > currentIndex ? 'down' : 'up';
    isAnimating = true;
    currentIndex = targetIdx;

    updateSectionStates(currentIndex, direction, prevIdx);

    setTimeout(function () {
      isAnimating = false;
      // Settle outgoing section into idle folded class
      if (sections[prevIdx] && !sections[prevIdx].classList.contains('active')) {
        clearFoldClasses(sections[prevIdx]);
        if (prevIdx < currentIndex) sections[prevIdx].classList.add('folded-top');
        else sections[prevIdx].classList.add('folded-bottom');
      }
    }, ANIMATION_DURATION);
  }

  /* ── 3. Wheel & Trackpad Momentum Detection ─────────────────── */
  function onWheel(e) {
    if (isClassicMode) return;

    var now = Date.now();
    var delta = e.deltaY;

    var currentSec = sections[currentIndex];
    if (!currentSec) return;

    // Check if inner content of current section has vertical scroll
    var isScrollable = currentSec.scrollHeight > currentSec.clientHeight + 4;

    if (isScrollable) {
      var atTop = currentSec.scrollTop <= 3;
      var atBottom = Math.ceil(currentSec.scrollTop + currentSec.clientHeight) >= currentSec.scrollHeight - 3;

      if (delta > 0 && !atBottom) {
        // Allow user to scroll down within section
        return;
      }
      if (delta < 0 && !atTop) {
        // Allow user to scroll up within section
        return;
      }
    }

    // When at boundary or not scrollable, prevent default page jump and flip
    if (Math.abs(delta) < 18) return;

    e.preventDefault();

    if (isAnimating || now - lastScrollTime < 700) return;

    lastScrollTime = now;

    if (delta > 0) {
      goToSection(currentIndex + 1);
    } else {
      goToSection(currentIndex - 1);
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false });

  /* ── 4. Touch & Swipe Gestures (Mobile/Tablet) ───────────────── */
  var touchStartY = 0;
  var touchStartX = 0;
  var touchStartTime = 0;

  window.addEventListener('touchstart', function (e) {
    if (isClassicMode || !e.touches || !e.touches[0]) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
  }, { passive: true });

  window.addEventListener('touchend', function (e) {
    if (isClassicMode || !e.changedTouches || !e.changedTouches[0]) return;
    var touchEndY = e.changedTouches[0].clientY;
    var touchEndX = e.changedTouches[0].clientX;
    var diffY = touchStartY - touchEndY;
    var diffX = touchStartX - touchEndX;
    var duration = Date.now() - touchStartTime;

    // Must be predominantly vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY)) return;
    if (Math.abs(diffY) < 45 || duration > 900) return;

    var currentSec = sections[currentIndex];
    if (currentSec) {
      var isScrollable = currentSec.scrollHeight > currentSec.clientHeight + 4;
      if (isScrollable) {
        var atTop = currentSec.scrollTop <= 3;
        var atBottom = Math.ceil(currentSec.scrollTop + currentSec.clientHeight) >= currentSec.scrollHeight - 3;

        if (diffY > 0 && !atBottom) return; // scrolling down inside
        if (diffY < 0 && !atTop) return;    // scrolling up inside
      }
    }

    if (diffY > 0) {
      goToSection(currentIndex + 1);
    } else {
      goToSection(currentIndex - 1);
    }
  }, { passive: true });

  /* ── 5. Keyboard Navigation ─────────────────────────────────── */
  window.addEventListener('keydown', function (e) {
    if (isClassicMode) return;

    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault();
      goToSection(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault();
      goToSection(currentIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSection(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSection(sections.length - 1);
    }
  });

  /* ── 6. Floating Bottom Button ──────────────────────────────── */
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      goToSection(currentIndex + 1);
    });
  }

  /* ── 7. Flip Mode Switcher (3D Flip vs Classic Continuous) ──── */
  if (modeToggle) {
    modeToggle.addEventListener('click', function () {
      isClassicMode = !isClassicMode;
      document.body.classList.toggle('classic-scroll-mode', isClassicMode);
      localStorage.setItem('lt-flip-mode', isClassicMode ? 'classic' : 'flip');

      var label = modeToggle.querySelector('.deck-mode-label');
      if (label) {
        label.textContent = isClassicMode ? 'Scroll' : '3D Flip';
      }

      if (window.showToast) {
        window.showToast(isClassicMode ? 'Switched to Classic Scroll' : '3D Section Flip Deck Active', 'success');
      }

      if (!isClassicMode) {
        goToSection(currentIndex);
      }
    });
  }

  /* ── 8. Navbar Anchor Clicks Synchronization ────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;

      var targetId = href.replace('#', '');
      var targetIdx = sections.findIndex(function (s) { return s.id === targetId; });

      if (targetIdx !== -1) {
        e.preventDefault();
        // Close mobile menu if open
        document.getElementById('mobileMenu')?.classList.remove('open');
        document.getElementById('menuIcon')?.classList.replace('fa-xmark', 'fa-bars');

        goToSection(targetIdx);
      }
    });
  });

  /* ── 9. Initial Load on Hash or Default ──────────────────────── */
  var initialHash = (window.location.hash || '').replace('#', '');
  var initialIdx = 0;
  if (initialHash) {
    var foundIdx = sections.findIndex(function (s) { return s.id === initialHash; });
    if (foundIdx !== -1) initialIdx = foundIdx;
  }

  updateSectionStates(initialIdx, 'none');
  currentIndex = initialIdx;

})();
