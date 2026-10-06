/* Cinematic animations — 3D card tilt physics, hero rotation, scroll parallax, reveals, counters. */
(function () {
  'use strict';
  var doc = document;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     3D Smooth Mouse Parallax Tilt for Cinema Cards
     ========================================================= */
  function init3DCardTilt() {
    if (prefersReduced) return;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return; // disable on pure touch

    var activeCard = null;
    var rafId = null;
    var targetRotateX = 0;
    var targetRotateY = 0;
    var currentRotateX = 0;
    var currentRotateY = 0;
    var targetTranslateZ = 0;
    var currentTranslateZ = 0;

    function renderTilt() {
      if (!activeCard) {
        currentRotateX += (0 - currentRotateX) * 0.15;
        currentRotateY += (0 - currentRotateY) * 0.15;
        currentTranslateZ += (0 - currentTranslateZ) * 0.15;
        if (Math.abs(currentRotateX) < 0.05 && Math.abs(currentRotateY) < 0.05) {
          cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
      } else {
        currentRotateX += (targetRotateX - currentRotateX) * 0.18;
        currentRotateY += (targetRotateY - currentRotateY) * 0.18;
        currentTranslateZ += (targetTranslateZ - currentTranslateZ) * 0.18;
      }

      if (activeCard) {
        activeCard.style.transform = 'perspective(900px) rotateX(' + currentRotateX.toFixed(2) + 'deg) rotateY(' + currentRotateY.toFixed(2) + 'deg) translateZ(' + currentTranslateZ.toFixed(1) + 'px)';
      }

      rafId = requestAnimationFrame(renderTilt);
    }

    doc.addEventListener('mousemove', function (e) {
      var card = e.target.closest('.card:not(.card--skeleton)');
      if (!card) {
        if (activeCard) {
          activeCard.style.transform = '';
          activeCard = null;
        }
        return;
      }

      if (activeCard !== card) {
        if (activeCard) activeCard.style.transform = '';
        activeCard = card;
        targetTranslateZ = 12;
      }

      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2;
      var cy = rect.height / 2;

      // Pass cursor coordinates for holographic dynamic specular glare reflection
      card.style.setProperty('--glare-x', ((x / rect.width) * 100).toFixed(1) + '%');
      card.style.setProperty('--glare-y', ((y / rect.height) * 100).toFixed(1) + '%');

      // Max tilt: 10 degrees for smooth physical cinema feel
      var nx = (x - cx) / cx;
      var ny = (y - cy) / cy;
      targetRotateX = -ny * 9;
      targetRotateY = nx * 9;

      if (!rafId) {
        rafId = requestAnimationFrame(renderTilt);
      }
    }, { passive: true });

    doc.addEventListener('mouseleave', function () {
      if (activeCard) {
        activeCard.style.transform = '';
        activeCard = null;
      }
    });
  }

  /* =========================================================
     Hero Section — Rotation, Ken Burns, Parallax & CTAs
     ========================================================= */
  function initHero() {
    var hero = doc.getElementById('hero');
    if (!hero) return;

    var dataNode = doc.getElementById('heroData');
    var data = null;
    try {
      data = dataNode ? JSON.parse(dataNode.textContent) : null;
    } catch (e) {
      data = null;
    }

    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.hero__dot'));
    var elTitle = doc.getElementById('heroTitle');
    var elDesc = doc.getElementById('heroDesc');
    var elYear = doc.getElementById('heroYear');
    var elKind = doc.getElementById('heroKind');
    var elDur = doc.getElementById('heroDur');
    var elScore = doc.getElementById('heroScore');
    var playBtn = hero.querySelector('.hero__play');
    var infoBtn = hero.querySelector('.hero__info');

    /* Click ripple on hero CTA buttons (3D press micro-interaction) */
    hero.querySelectorAll('.hero__actions .btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var d = Math.max(rect.width, rect.height);
        var s = doc.createElement('span');
        s.className = 'ripple';
        s.style.width = s.style.height = d + 'px';
        s.style.left = (e.clientX - rect.left - d / 2) + 'px';
        s.style.top = (e.clientY - rect.top - d / 2) + 'px';
        btn.appendChild(s);
        setTimeout(function () { s.remove(); }, 650);
      });
    });

    var index = 0;
    var timer = null;

    function show(i) {
      if (!slides.length) return;
      if (i >= slides.length) i = 0;
      if (i < 0) i = slides.length - 1;
      index = i;

      slides.forEach(function (s, j) {
        s.classList.toggle('is-active', j === i);
      });
      dots.forEach(function (d, j) {
        d.classList.toggle('is-active', j === i);
      });

      if (data && data[i]) {
        var h = data[i];
        if (elTitle) {
          elTitle.classList.add('is-changing');
          setTimeout(function () {
            elTitle.textContent = h.Title || '';
            elTitle.classList.remove('is-changing');
          }, 180);
        }
        if (elDesc) elDesc.textContent = h.Overview || '';
        if (elYear) elYear.textContent = h.Year || '';
        if (elKind) elKind.textContent = (h.MediaType === 'tv' ? 'Series' : 'Movie');
        if (elDur) {
          if (h.MediaType === 'tv' && h.Seasons) {
            elDur.textContent = h.Seasons + ' Season' + (h.Seasons !== 1 ? 's' : '');
          } else if (h.Runtime) {
            elDur.textContent = h.Runtime + ' min';
          } else {
            elDur.textContent = '';
          }
        }
        if (elScore) {
          elScore.textContent = '★ ' + Number(h.Rating || 0).toFixed(1);
        }
        if (playBtn) {
          playBtn.dataset.id = h.TmdbID;
          playBtn.dataset.type = h.MediaType || 'movie';
          playBtn.dataset.title = h.Title || '';
          playBtn.dataset.year = h.Year || '';
        }
        if (infoBtn) {
          infoBtn.dataset.id = h.TmdbID;
          infoBtn.dataset.type = h.MediaType || 'movie';
        }
      }
    }

    function next() {
      show(index + 1);
    }

    function start() {
      if (slides.length < 2 || prefersReduced) return;
      if (timer) clearInterval(timer);
      timer = setInterval(next, 8000);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('touchstart', stop, { passive: true });
    hero.addEventListener('touchend', start, { passive: true });

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        show(parseInt(d.dataset.heroDot || '0', 10));
        stop();
        start();
      });
    });

    show(0);
    start();

    /* Parallax scroll on hero backdrop */
    if (!prefersReduced) {
      var stage = hero.querySelector('.hero__stage');
      var onScroll = function () {
        var sy = window.scrollY;
        if (sy < 800 && stage) {
          stage.style.transform = 'translate3d(0, ' + (sy * 0.3).toFixed(1) + 'px, 0)';
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* =========================================================
     Scroll Progress Indicator & Reveals
     ========================================================= */
  function initScrollProgress() {
    var prog = doc.getElementById('scrollProgress');
    if (!prog) return;
    var update = function () {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initScrollReveals() {
    var rows = Array.prototype.slice.call(doc.querySelectorAll('.reveal-row, [data-reveal]'));
    if (!rows.length) return;

    if (!('IntersectionObserver' in window) || prefersReduced) {
      rows.forEach(function (r) { r.classList.add('is-revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

    rows.forEach(function (r) { observer.observe(r); });
  }

  /* =========================================================
     Stat Counters
     ========================================================= */
  function initCounters() {
    var counters = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
    if (!counters.length) return;

    function animateCounter(el) {
      var target = parseFloat(el.dataset.count) || 0;
      var isDecimal = String(el.dataset.count).indexOf('.') >= 0;
      var dur = 1200;
      var t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        el.textContent = isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window) || prefersReduced) {
      counters.forEach(animateCounter);
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          animateCounter(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(function (c) { obs.observe(c); });
  }

  /* =========================================================
     Cinematic 3D Intro Sequence Orchestration
     ========================================================= */
  function initIntro() {
    var intro = doc.getElementById('cinematicIntro');
    if (!intro) return;

    var forceIntro = window.location.search.indexOf('intro=1') !== -1;
    var seen = false;
    try {
      seen = sessionStorage.getItem('wn:intro_seen');
    } catch (e) {
      seen = false;
    }

    if (seen && !forceIntro) {
      intro.remove();
      return;
    }

    if (prefersReduced) {
      intro.remove();
      return;
    }

    var dismissed = false;
    function dismissIntro() {
      if (dismissed) return;
      dismissed = true;
      try {
        sessionStorage.setItem('wn:intro_seen', '1');
      } catch (e) {}

      intro.classList.add('is-dismissed');
      setTimeout(function () {
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }, 760);
    }

    // Auto-dismiss after dramatic reveal (1.8s)
    var autoTimer = setTimeout(dismissIntro, 1800);

    // Skip button
    var skipBtn = doc.getElementById('introSkipBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearTimeout(autoTimer);
        dismissIntro();
      });
    }

    // Click anywhere on intro to dismiss
    intro.addEventListener('click', function () {
      clearTimeout(autoTimer);
      dismissIntro();
    });

    // Keyboard ESC or Space to dismiss
    function onKey(e) {
      if (e.key === 'Escape' || e.code === 'Space') {
        clearTimeout(autoTimer);
        dismissIntro();
        doc.removeEventListener('keydown', onKey);
      }
    }
    doc.addEventListener('keydown', onKey);
  }

  function init() {
    initIntro();
    init3DCardTilt();
    initHero();
    initScrollProgress();
    initScrollReveals();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();