/* Core app JS — helpers, navigation, toasts, lazy images, global card actions. */
(function () {
  'use strict';

  window.WN = window.WN || {};

  var WN = window.WN;
  var doc = document;

  function dismissCinematicIntro() {
    var intro = doc.getElementById('cinematicIntro');
    if (!intro) return;
    window.setTimeout(function () {
      intro.classList.add('is-dismissed');
      window.setTimeout(function () { intro.remove(); }, 850);
    }, 1750);
  }

  dismissCinematicIntro();

  WN.csrf = function () {
    var m = doc.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
  };

  WN.esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  WN.api = function (url, opts) {
    opts = opts || {};
    if (opts.method && opts.method.toUpperCase() !== 'GET') {
      opts.headers = Object.assign({ 'X-CSRFToken': WN.csrf() }, opts.headers || {});
    }
    return fetch(url, Object.assign({ credentials: 'same-origin' }, opts)).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          err.data = data || {};
          throw err;
        }
        return data;
      });
    });
  };

  WN.toast = function (message, kind) {
    kind = kind || 'info';
    var box = doc.getElementById('toastContainer');
    if (!box) return;
    var el = doc.createElement('div');
    el.className = 'toast toast--' + kind;
    var icon = kind === 'success' ? '&#10003;' : kind === 'error' ? '&#33;' : '&#8505;';
    el.innerHTML = '<span class="toast__icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="toast__msg">' + WN.esc(message) + '</span>' +
      '<button class="toast__close" aria-label="Dismiss">&times;</button>';
    box.appendChild(el);
    var kill = function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 420);
    };
    el.querySelector('.toast__close').addEventListener('click', kill);
    setTimeout(kill, 4600);
  };

  /* Stars rendered from a 0.5-step rating */
  WN.stars = function (rating, cls) {
    var html = '<div class="star-row' + (cls ? ' ' + cls : '') + '" aria-label="' + WN.esc(rating) + ' out of 5">';
    var full = Math.floor(rating);
    var half = ((rating - full) >= 0.5);
    for (var i = 1; i <= 5; i++) {
      if (i <= full) html += '<span class="star is-full">&#9733;</span>';
      else if (i === full + 1 && half) html += '<span class="star is-half">&#9733;</span>';
      else html += '<span class="star">&#9733;</span>';
    }
    return html + '</div>';
  };

  WN.genreIds = function (card) {
    return (card && Array.isArray(card.GenreIds)) ? card.GenreIds : [];
  };

  WN.ringColor = function (score) {
    if (score >= 7) return '#21d07a';
    if (score >= 5) return '#d4a843';
    return '#db2360';
  };

  /* Card markup mirror of components/_card.html */
  WN.cardHtml = function (c) {
    var score = c.TMDBRating || 0;
    var gids = WN.genreIds(c);
    var genres = String(c.Genre || '').split(' \u00b7 ').filter(Boolean);
    var watched = '';
    if (typeof c.Watched === 'boolean') watched = ' data-watched="' + c.Watched + '"';
    var html = '<div class="card glass-card" data-movie-id="' + c.TmdbID + '" data-media-type="' + c.MediaType + '"' + watched + '>';

    html += '<div class="card__poster">';
    if (c.PosterCard || c.Poster) {
      html += '<img class="card__blur" src="' + WN.esc(!c.Blur ? (c.PosterSmall || '') : c.Blur) + '" alt="" aria-hidden="true" loading="eager" decoding="async">';
      html += '<img class="card__img is-lazy" src="' + WN.esc(c.PosterSmall || '') + '" data-lazy="' + WN.esc(c.PosterCard || c.Poster) + '" alt="' + WN.esc(c.Movie) + '" loading="lazy" decoding="async">';
    } else {
      html += '<div class="card__fallback" aria-hidden="true"><span>' + WN.esc(String(c.Movie || '?').slice(0, 1).toUpperCase()) + '</span></div>';
    }
    html += '<span class="card__type-pill card__type-pill--' + (c.MediaType === 'tv' ? 'series' : 'movie') + '">' + WN.esc(c.TypeLabel || (c.MediaType === 'tv' ? 'Series' : 'Movie')) + '</span>';
    html += '<button class="card__bookmark ' + (c.InWatchlist ? 'is-active' : '') + '" type="button" data-role="bookmark" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-added="' + !!c.InWatchlist + '" aria-label="Toggle watchlist"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/></svg></button>';

    if (score) {
      var pct = Math.round(score * 10);
      html += '<div class="card__rating" title="TMDB score: ' + score.toFixed(1) + '">' +
        '<svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true">' +
        '<circle class="ring-track" cx="17" cy="17" r="15.5" pathLength="100"></circle>' +
        '<circle class="ring-fill" cx="17" cy="17" r="15.5" pathLength="100" stroke="' + WN.ringColor(score) + '" stroke-dasharray="' + pct + ',100"></circle></svg>' +
        '<span class="card__rating-score" style="--score-color:' + WN.ringColor(score) + '">' + score.toFixed(1) + '</span></div>';
    }
    html += '</div>';

    html += '<div class="card__hover"><div class="card__hover-actions">' +
      '<button class="card__act card__act--play" data-role="play" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-title="' + WN.esc(c.Movie) + '" data-year="' + WN.esc(c.Year || '') + '" aria-label="Play trailer"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></button>' +
      '<button class="card__act ' + (c.InWatchlist ? 'is-active' : '') + '" data-role="bookmark" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-added="' + !!c.InWatchlist + '" aria-label="Toggle watchlist"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/></svg></button>' +
      '<button class="card__act ' + (c.LikedByMe ? 'is-active' : '') + '" data-role="like" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-liked="' + !!c.LikedByMe + '" aria-label="Like"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.95 2.56l-1.82 7a2 2 0 0 1-1.96 1.44H8a1 1 0 0 1-1-1V10.35a1 1 0 0 1 .3-.7l4.36-4.36A2 2 0 0 1 13 4.28c.4 0 .77.2.98.58z"/></svg></button>' +
      '<button class="card__act card__act--more" data-role="more" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" aria-label="More info"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></button>' +
      '</div><div class="card__hover-meta">';
    if (typeof c.Match === 'number' || typeof c.Match === 'string') html += '<span class="card__match">' + c.Match + '% Match</span>';
    if (c.Year) html += '<span class="card__year">' + WN.esc(c.Year) + '</span>';
    if (c.MediaType === 'tv' && c.Seasons) html += '<span class="card__dur">' + c.Seasons + ' season' + (c.Seasons !== 1 ? 's' : '') + '</span>';
    else if (c.Runtime) html += '<span class="card__dur">' + c.Runtime + 'm</span>';
    html += '</div><div class="card__genre-list">';
    genres.slice(0, 3).forEach(function (g, i) {
      var gid = gids[i] ? gids[i] : 0;
      html += '<a class="card__genre" href="/genre/' + gid + '">' + WN.esc(g) + '</a>';
    });
    html += '</div>';
    if (c.Overview) html += '<p class="card__overview">' + WN.esc(c.Overview.slice(0, 160)) + '</p>';
    html += '<button class="card__morelink" data-role="more" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '">More Info <span aria-hidden="true">&rarr;</span></button>';
    html += '</div>';

    html += '<div class="card__caption"><h3 class="card__title" title="' + WN.esc(c.Movie) + '">' + WN.esc(c.Movie) + '</h3><p class="card__sub">';
    if (c.Year) html += WN.esc(c.Year) + ' \u00b7 ';
    if (c.MediaType === 'tv' && c.Seasons) html += c.Seasons + ' Season' + (c.Seasons !== 1 ? 's' : '') + 's';
    else if (genres[0]) html += WN.esc(genres[0]);
    html += '</p></div></div>';
    return html;
  };

  WN.cellHtml = function (c) {
    return '<div class="grid-cell" data-cell>' + WN.cardHtml(c) + '</div>';
  };

  /* ---------- lazy images ---------- */
  function hydrateLazy(root) {
    var imgs = Array.prototype.slice.call((root || doc).querySelectorAll('.is-lazy'));
    if (!('IntersectionObserver' in window)) {
      imgs.forEach(function (img) { WN.loadImage(img); });
      return;
    }
    imgs.forEach(function (img) {
      if (img.dataset.lazy && img.dataset.lazy !== img.src && !img.__lazy) {
        img.__lazy = true;
        WN.lazyObserver.observe(img);
      }
    });
  }

  WN.loadImage = function (img) {
    var src = img.getAttribute('data-lazy');
    if (!src) { img.classList.add('is-loaded'); return; }
    var copy = new Image();
    copy.onload = function () {
      img.src = src;
      img.onload = function () { img.classList.add('is-loaded'); };
      if (img.complete) img.classList.add('is-loaded');
    };
    copy.onerror = function () { img.classList.add('is-loaded'); };
    copy.src = src;
  };

  WN.lazyObserver = window.IntersectionObserver
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            WN.lazyObserver.unobserve(img);
            WN.loadImage(img);
          }
        });
      }, { rootMargin: '300px 0px' })
    : null;

  /* ---------- toggles ---------- */
  function busy(btn, on) {
    if (!btn) return;
    btn.classList.add('is-busy');
    if (on) btn.setAttribute('disabled', 'disabled');
  }
  function idle(btn) {
    if (!btn) return;
    btn.classList.remove('is-busy');
    btn.removeAttribute('disabled');
  }

  WN.setWatchedFlag = function (btn, added) {
    var card = btn.closest('.card');
    if (card) card.dataset.added = added ? 'true' : 'false';
    var all = doc.querySelectorAll('[data-role="bookmark"][data-id="' + btn.dataset.id + '"][data-type="' + btn.dataset.type + '"]');
    all.forEach(function (b) {
      b.classList.toggle('is-active', !!added);
      b.setAttribute('data-added', added ? 'true' : 'false');
      b.setAttribute('title', added ? 'Remove from My List' : 'Add to My List');
    });
  };

  function handleError(err, btn) {
    idle(btn);
    if (err.status === 401) {
      window.location = '/login?next=' + encodeURIComponent(location.pathname + location.search);
    } else if (err.status === 402) {
      WN.modalizeUpgrade();
    } else {
      WN.toast(err.message || 'Something went wrong.', 'error');
      if (window.WN && WN.reloadModal) WN.reloadModal();
    }
  }

  function doWatchlist(btn) {
    busy(btn, true);
    WN.api('/title/' + btn.dataset.type + '/' + btn.dataset.id + '/watchlist', { method: 'POST' })
      .then(function (data) {
        WN.setWatchedFlag(btn, !!data.in_watchlist);
        WN.toast(data.in_watchlist ? 'Added to My List.' : 'Removed from My List.', 'success');
        filterWatchlistDOM();
      })
      .catch(function (err) { handleError(err, btn); })
      .then(function () { idle(btn); });
  }

  function doLike(btn) {
    busy(btn, true);
    WN.api('/title/' + btn.dataset.type + '/' + btn.dataset.id + '/like', { method: 'POST' })
      .then(function (data) {
        var liked = !!data.liked;
        doc.querySelectorAll('[data-role="like"][data-id="' + btn.dataset.id + '"][data-type="' + btn.dataset.type + '"]')
          .forEach(function (b) {
            b.classList.toggle('is-active', liked);
            b.setAttribute('data-liked', liked);
          });
        WN.toast(liked ? 'You liked this title.' : 'Like removed.', liked ? 'success' : 'info');
      })
      .catch(function (err) { handleError(err, btn); })
      .then(function () { idle(btn); });
  }

  function doPlay(btn) {
    var id = btn.dataset.id, type = btn.dataset.type, title = btn.dataset.title || '';
    WN.toast('Finding trailer for ' + title + '…', 'info');
    WN.api('/trailer/' + type + '/' + id, { method: 'GET' }).then(function (data) {
      if (data && data.video_id) {
        WN.openTrailer(data.video_id, title);
      } else {
        WN.toast('No trailer found for this title.', 'error');
      }
    }).catch(function () {
      WN.toast('Could not load trailer right now.', 'error');
    });
  }

  function doMore(btn) {
    WN.openModal(btn.dataset.id, btn.dataset.type);
  }

  function doDeleteReview(btn) {
    var id = btn.dataset.tmdbId, type = btn.dataset.mediaType;
    if (!window.confirm('Delete your experience and rating for this title?')) return;
    busy(btn, true);
    WN.api('/title/' + type + '/' + id + '/review/delete', { method: 'POST' })
      .then(function () {
        WN.toast('Experience removed.', 'success');
        if (window.WN && WN.reloadModal) WN.reloadModal();
        var entry = btn.closest('[data-experience]');
        if (entry) entry.remove();
      })
      .catch(function (err) { handleError(err, btn); })
      .then(function () { idle(btn); });
  }

  function doDeleteList(btn) {
    var id = btn.dataset.id;
    if (!window.confirm('Delete this list permanently?')) return;
    busy(btn, true);
    WN.api('/api/lists/' + id + '/delete', { method: 'POST' })
      .then(function () {
        WN.toast('List deleted.', 'success');
        var card = btn.closest('[data-list-card]');
        if (card) card.remove();
      })
      .catch(function (err) { handleError(err, btn); })
      .then(function () { idle(btn); });
  }

  doc.addEventListener('click', function (ev) {
    var t = ev.target;
    var btn = t.closest ? t.closest('[data-role]') : null;
    if (!btn) {
      if (t.closest && t.closest('.review-card__copy.is-spoiler, .experience-entry__copy.is-spoiler')) {
        t.closest('.is-spoiler').classList.add('is-visible');
      }
      return;
    }
    var role = btn.getAttribute('data-role');
    if (role === 'bookmark') doWatchlist(btn);
    else if (role === 'like') doLike(btn);
    else if (role === 'play' || role === 'hero-play') doPlay(btn);
    else if (role === 'more' || role === 'hero-info') doMore(btn);
    else if (role === 'delete-review') doDeleteReview(btn);
    else if (role === 'delete-list') doDeleteList(btn);
  });

  /* ---------- navigation ---------- */
  function toggleNavState() {
    var scrolled = window.scrollY > 8;
    document.getElementById('siteNav').classList.toggle('is-scrolled', scrolled);
    var bar = document.getElementById('scrollProgress');
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', toggleNavState, { passive: true });
  toggleNavState();

  function closeOverlays() {
    var menus = ['navBurger', 'mobileMenu', 'navSearch', 'userMenu', 'navDropdown'];
    menus.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        if (el.classList.contains('user-dropdown') || el.classList.contains('mobile-menu')) el.classList.remove('is-open');
        if (id === 'navBurger') el.setAttribute('aria-expanded', 'false');
      }
    });
    var ns = document.getElementById('navSearch');
    if (ns) ns.classList.remove('is-open');
    var dd = document.getElementById('navDropdown');
    if (dd) dd.innerHTML = '';
  }

  var burger = document.getElementById('navBurger');
  if (burger) burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    var menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('is-open', !open);
  });

  var userAvatar = document.getElementById('userAvatar');
  if (userAvatar) userAvatar.addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('userMenu').classList.toggle('is-open');
  });

  var searchToggle = document.getElementById('searchToggle');
  if (searchToggle) searchToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var ns = document.getElementById('navSearch');
    ns.classList.toggle('is-open');
    searchToggle.setAttribute('aria-expanded', ns.classList.contains('is-open'));
    if (ns.classList.contains('is-open')) document.getElementById('navSearchInput').focus();
  });

  var bnavSearch = document.getElementById('bnavSearch');
  if (bnavSearch) {
    bnavSearch.addEventListener('click', function (e) {
      e.preventDefault();
      var ns = document.getElementById('navSearch');
      if (ns) ns.classList.add('is-open');
      var inp = document.getElementById('navSearchInput');
      if (inp) {
        inp.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* Card hover prefetch (after 200ms) */
  var prefetchTimer = null;
  var prefetched = new Set();
  doc.addEventListener('mouseover', function (e) {
    var card = e.target.closest('.card[data-movie-id]');
    if (!card) {
      if (prefetchTimer) clearTimeout(prefetchTimer);
      return;
    }
    var id = card.dataset.movieId;
    var type = card.dataset.mediaType || 'movie';
    var key = type + ':' + id;
    if (prefetched.has(key)) return;

    if (prefetchTimer) clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(function () {
      prefetched.add(key);
      fetch('/title/' + type + '/' + id, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).catch(function () {});
    }, 200);
  });

  doc.addEventListener('click', function (e) {
    if (!e.target.closest('#userMenu')) {
      var um = document.getElementById('userMenu');
      if (um) um.classList.remove('is-open');
    }
    if (!e.target.closest('#navSearch')) closeOverlays();
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeOverlays();
  });

  var bnavSearch = doc.getElementById('bnavSearch');
  if (bnavSearch) bnavSearch.addEventListener('click', function () {
    var ns = doc.getElementById('navSearch');
    var inp = doc.getElementById('navSearchInput');
    if (ns) ns.classList.add('is-open');
    if (inp) inp.focus();
    if (ns && ns.scrollIntoView) ns.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ---------- notifications ---------- */
  function loadNotifications() {
    var bell = document.getElementById('notifBell');
    if (!bell || bell.hidden) return;
    WN.api('/api/notifications', { method: 'GET' }).then(function (data) {
      var dot = document.getElementById('notifDot');
      if (dot) dot.hidden = !data.unread;
      var panel = document.getElementById('notifPanel');
      if (!panel) return;
      if (!data.notifications.length) {
        panel.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      } else {
        panel.innerHTML = data.notifications.map(function (n) {
          var cls = n.read ? '' : ' is-unread';
          var link = n.link ? (' href="' + WN.esc(n.link) + '"') : ' href="/"';
          return '<a class="notif-item' + cls + '"' + link + '>' + WN.esc(n.message) + '</a>';
        }).join('');
      }
    }).catch(function () { /* noop */ });
  }
  var bell = document.getElementById('notifBell');
  if (bell) bell.addEventListener('click', function (e) {
    e.stopPropagation();
    var panel = document.getElementById('notifPanel');
    if (panel.hidden === false) { panel.hidden = true; return; }
    panel.hidden = false;
    loadNotifications();
    WN.api('/api/notifications/read', { method: 'POST' }).catch(function () { /* noop */ });
  });
  if (bell && !bell.hidden) loadNotifications();

  /* ---------- theme radio on profile ---------- */
  var themeRadios = document.querySelectorAll('input[name="theme"]');
  if (themeRadios.length) themeRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      var map = { auto: WN.theme.resolved(), dark: 'dark', light: 'light' };
      WN.theme.apply(map[r.value]);
    });
  });

  /* ---------- spoiler toggle cue ---------- */
  doc.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest('.is-spoiler') : null;
    if (el) el.classList.add('is-visible');
  });

  /* ---------- misc page scriptlets ---------- */
  var bioToggle = document.getElementById('personBioToggle');
  if (bioToggle) bioToggle.addEventListener('click', function () {
    var bio = document.getElementById('personBio');
    bio.classList.toggle('is-expanded');
    bioToggle.textContent = bio.classList.contains('is-expanded') ? 'Read less' : 'Read more';
  });

  var fgType = document.getElementById('fgType');
  var fgYear = document.getElementById('fgYear');
  var fgGrid = document.getElementById('filmographyGrid');
  function applyFilmographyFilter() {
    if (!fgGrid) return;
    var type = fgType ? fgType.querySelector('.pill.is-active').dataset.value : '';
    var year = fgYear ? fgYear.value : '';
    fgGrid.querySelectorAll('[data-cell]').forEach(function (cell) {
      var t = cell.dataset.creditType || '';
      var y = cell.dataset.creditYear || '';
      var ok = (!type || t === type) && (!year || y === year);
      cell.hidden = !ok;
    });
  }
  if (fgType) fgType.addEventListener('click', function (e) {
    var pill = e.target.closest('.pill');
    if (!pill) return;
    fgType.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('is-active'); });
    pill.classList.add('is-active');
    applyFilmographyFilter();
  });
  if (fgYear) fgYear.addEventListener('change', applyFilmographyFilter);

  var deleteAccount = document.getElementById('deleteAccount');
  if (deleteAccount) deleteAccount.addEventListener('click', function () {
    var handle = document.querySelector('.profile-side h2') ? null : null;
    var name = prompt('Type your username to confirm deletion:');
    if (!name) return;
    if (!window.confirm('This permanently deletes your account, list, ratings and reviews. Continue?')) return;
    WN.api('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: name }) })
      .then(function () { window.location = '/'; })
      .catch(function (err) {
        if (err.status === 401) window.location = '/login';
        else WN.toast(err.message, 'error');
      });
  });

  /* ---------- watchlist sort / filter / view ---------- */
  var wlGrid = document.getElementById('watchlistGrid');
  function watchlistState() {
    var sort = document.getElementById('wlSort'); 
    var ft = document.getElementById('wlFilterType');
    var fs = document.getElementById('wlFilterStatus');
    var fg = document.getElementById('wlFilterGenre');
    return {
      sort: sort ? sort.value : 'added',
      type: ft ? ft.value : '',
      status: fs ? fs.value : '',
      genre: fg ? fg.value : ''
    };
  }
  function cardValue(cell, key) {
    var card = cell.querySelector('.card');
    if (!card) return null;
    if (key === 'title') return (card.querySelector('.card__title') || {}).textContent || '';
    if (key === 'rating') return parseFloat((card.querySelector('.card__rating-score') || {}).textContent) || 0;
    if (key === 'year') {
      var sub = (card.querySelector('.card__sub') || {}).textContent || '';
      return parseInt(sub, 10) || 0;
    }
    return null;
  }
  function filterWatchlistDOM() {
    if (!wlGrid) return;
    var st = watchlistState();
    Array.prototype.slice.call(wlGrid.children).forEach(function (cell) {
      var card = cell.querySelector('.card');
      if (!card) return;
      var show = true;
      if (st.type && card.dataset.mediaType !== st.type) show = false;
      if (show && st.status) {
        var watched = card.dataset.watched === 'true';
        if (st.status === 'watched' && !watched) show = false;
        if (st.status === 'unwatched' && watched) show = false;
      }
      if (show && st.genre) {
        var genres = Array.prototype.map.call(card.querySelectorAll('.card__genre'), function (a) { return (a.textContent || '').trim(); });
        if (genres.indexOf(st.genre) === -1) show = false;
      }
      cell.hidden = !show;
    });
  }
  function sortWatchlistDOM() {
    if (!wlGrid) return;
    var st = watchlistState();
    var cells = Array.prototype.slice.call(wlGrid.children);
    if (st.sort === 'title') {
      cells.sort(function (a, b) { return String(cardValue(a, 'title')).localeCompare(String(cardValue(b, 'title'))); });
    } else if (st.sort === 'rating') {
      cells.sort(function (a, b) { return cardValue(b, 'rating') - cardValue(a, 'rating'); });
    } else if (st.sort === 'year') {
      cells.sort(function (a, b) { return cardValue(b, 'year') - cardValue(a, 'year'); });
    }
    var frag = doc.createDocumentFragment();
    cells.forEach(function (c) { frag.appendChild(c); });
    wlGrid.appendChild(frag);
  }
  ['wlSort', 'wlFilterType', 'wlFilterStatus', 'wlFilterGenre'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { sortWatchlistDOM(); filterWatchlistDOM(); });
  });

  var wlToolbar = document.getElementById('watchlistToolbar');
  if (wlToolbar) wlToolbar.addEventListener('click', function (e) {
    var pill = e.target.closest ? e.target.closest('[data-view]') : null;
    if (!pill) return;
    wlToolbar.querySelectorAll('[data-view]').forEach(function (p) { p.classList.remove('is-active'); });
    pill.classList.add('is-active');
    if (wlGrid) wlGrid.classList.toggle('results-grid--list', pill.dataset.view === 'list');
  });

  /* ---------- search page tabs ---------- */
  var tabs = document.getElementById('searchTypeTabs');
  var input = document.getElementById('searchPageInput');
  var go = document.getElementById('searchGo');
  function searchParams() {
    var active = tabs ? tabs.querySelector('.tab.is-active') : null;
    var mt = active ? active.dataset.value : '';
    var q = encodeURIComponent((input && input.value || '').trim());
    return '/search?q=' + q + '&media_type=' + mt;
  }
  if (tabs) tabs.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('is-active'); });
    tab.classList.add('is-active');
  });
  if (go && input) go.addEventListener('click', function () { window.location = searchParams(); });
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.location = searchParams(); });

  var trending = doc.querySelector('[data-trending]');
  if (trending) trending.addEventListener('click', function (e) {
    var pill = e.target.closest('[data-trending-term]');
    if (!pill) return;
    window.location = '/search?q=' + encodeURIComponent(pill.dataset.trendingTerm);
  });

  /* ---------- discover form spinner ---------- */
  var pickerForm = document.getElementById('pickerForm');
  if (pickerForm) pickerForm.addEventListener('submit', function () {
    var btn = document.getElementById('submitBtn');
    if (btn) btn.classList.add('is-loading');
  });

  hydrateLazy(doc);
  var rows = doc.querySelectorAll('.star-row[data-stars]');
  Array.prototype.forEach.call(rows, function (row) {
    row.innerHTML = WN.stars(parseFloat(row.dataset.stars || 0), 'star-row--flat');
    row.classList.remove('star-row--flat');
  });
})();