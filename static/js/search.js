/* Enhanced Search — nav typeahead, recent searches, keyboard navigation, enter-to-go. */
(function () {
  'use strict';
  var WN = window.WN;
  var doc = document;
  var RECENT_KEY = 'wn:recent_searches_v2';
  var MAX_RECENTS = 10;

  var TRENDING_SUGGESTIONS = [
    'Inception', 'Breaking Bad', 'Interstellar', 'The Dark Knight',
    'Stranger Things', 'Oppenheimer', 'Game of Thrones', 'Dune'
  ];

  function recent() {
    try {
      var r = JSON.parse(localStorage.getItem(RECENT_KEY));
      return Array.isArray(r) ? r : [];
    } catch (e) {
      return [];
    }
  }

  function addRecent(q) {
    q = String(q || '').trim();
    if (!q) return;
    var r = recent().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    r.unshift(q);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, MAX_RECENTS)));
    } catch (e) { /* noop */ }
  }

  function removeRecent(q) {
    var r = recent().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(r));
    } catch (e) { /* noop */ }
  }

  WN.addRecentSearch = addRecent;

  var input = doc.getElementById('navSearchInput');
  var dd = doc.getElementById('navDropdown');
  var clearBtn = doc.getElementById('searchClear');
  var activeIndex = -1;

  function escapeReg(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, q) {
    if (!q) return WN.esc(text);
    var re = new RegExp('(' + escapeReg(q) + ')', 'ig');
    return WN.esc(text).replace(re, '<mark>$1</mark>');
  }

  function updateActiveHighlight(items) {
    items.forEach(function (el, idx) {
      el.classList.toggle('is-highlighted', idx === activeIndex);
      if (idx === activeIndex) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function renderDropdownResults(items, q) {
    if (!dd) return;
    activeIndex = -1;
    if (!items.length) {
      dd.innerHTML =
        '<div class="search-dd__empty">' +
          '<p>No titles found for \u201c<strong>' + WN.esc(q) + '</strong>\u201d</p>' +
          '<small class="muted">Try searching with different keywords or browse categories.</small>' +
        '</div>' +
        '<div class="search-dd__footer">' +
          '<a class="search-dd__all" href="/explore">Browse All Titles &rarr;</a>' +
        '</div>';
      dd.classList.add('is-open');
      return;
    }

    var html = '<div class="search-dd__header"><span class="search-dd__title">Titles</span><span class="search-dd__count">' + items.length + ' matches</span></div>';
    html += '<div class="search-dd__list" role="listbox">';
    html += items.map(function (r, i) {
      var title = r.Movie || r.name || 'Untitled';
      var score = r.TMDBRating ? Number(r.TMDBRating).toFixed(1) : null;
      var typePill = (r.MediaType === 'tv' ? 'SERIES' : 'MOVIE');
      var pillClass = r.MediaType === 'tv' ? 'pill-tv' : 'pill-movie';

      return '<button type="button" class="search-dd__item" role="option" data-search-hit="' + r.TmdbID + '" data-search-type="' + r.MediaType + '" data-search-title="' + WN.esc(title) + '" data-index="' + i + '">' +
        '<span class="search-dd__thumb">' +
          (r.PosterSmall
            ? '<img src="' + WN.esc(r.PosterSmall) + '" alt="" loading="lazy">'
            : '<span class="search-dd__ph">' + WN.esc(title.slice(0, 1).toUpperCase()) + '</span>') +
        '</span>' +
        '<span class="search-dd__text">' +
          '<strong class="search-dd__name">' + highlight(title, q) + '</strong>' +
          '<span class="search-dd__meta">' +
            (r.Year ? '<span>' + WN.esc(r.Year) + '</span>' : '') +
            '<span class="search-dd__type ' + pillClass + '">' + typePill + '</span>' +
            (score ? '<span class="search-dd__score">&#9733; ' + score + '</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="search-dd__go"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg></span>' +
      '</button>';
    }).join('');
    html += '</div>';
    html += '<div class="search-dd__footer">' +
      '<a class="search-dd__all" href="/search?q=' + encodeURIComponent(q) + '">See all results for \u201c' + WN.esc(q) + '\u201d &rarr;</a>' +
    '</div>';

    dd.innerHTML = html;
    dd.classList.add('is-open');
  }

  function renderEmptyDropdown() {
    if (!dd) return;
    activeIndex = -1;
    var recs = recent();
    var html = '';

    if (recs.length) {
      html += '<div class="search-dd__section">';
      html += '<div class="search-dd__label"><span>Recent Searches</span><button type="button" class="search-dd__clear-recents" id="clearAllRecents">Clear all</button></div>';
      html += '<div class="search-dd__recents">';
      html += recs.slice(0, 6).map(function (q) {
        return '<div class="search-dd__recent-row">' +
          '<button type="button" class="search-dd__recent-btn" data-search-recent="' + WN.esc(q) + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '<span>' + WN.esc(q) + '</span>' +
          '</button>' +
          '<button type="button" class="search-dd__recent-del" data-del-recent="' + WN.esc(q) + '" aria-label="Remove search">&times;</button>' +
        '</div>';
      }).join('');
      html += '</div></div>';
    }

    html += '<div class="search-dd__section">';
    html += '<div class="search-dd__label"><span>Popular Suggestions</span></div>';
    html += '<div class="search-dd__trending-chips">';
    html += TRENDING_SUGGESTIONS.map(function (s) {
      return '<button type="button" class="search-chip" data-search-recent="' + WN.esc(s) + '">' + WN.esc(s) + '</button>';
    }).join('');
    html += '</div></div>';

    dd.innerHTML = html;
    dd.classList.add('is-open');
  }

  var debounceTimer = null;
  var pendingCtrl = null;
  function onInput() {
    var q = (input.value || '').trim();
    if (clearBtn) {
      clearBtn.classList.toggle('is-visible', !!q);
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    if (pendingCtrl) pendingCtrl.abort();
    if (!q) {
      renderEmptyDropdown();
      return;
    }
    debounceTimer = setTimeout(function () {
      pendingCtrl = new AbortController();
      WN.api('/api/search?q=' + encodeURIComponent(q), {
        method: 'GET',
        signal: pendingCtrl.signal,
      })
        .then(function (data) {
          renderDropdownResults((data.results || []).slice(0, 7), q);
        })
        .catch(function (err) {
          if (err.name === 'AbortError') return;
          if (dd) dd.classList.remove('is-open');
        });
    }, 300);
  }

  if (input) {
    input.addEventListener('input', onInput);
    input.addEventListener('focus', function () {
      if (!(input.value || '').trim()) renderEmptyDropdown();
      else onInput();
    });

    input.addEventListener('keydown', function (e) {
      var items = dd ? Array.prototype.slice.call(dd.querySelectorAll('.search-dd__item, .search-dd__recent-btn')) : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items.length) return;
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveHighlight(items);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault();
          items[activeIndex].click();
          return;
        }
        var q = (input.value || '').trim();
        if (q) {
          addRecent(q);
          window.location = '/search?q=' + encodeURIComponent(q);
        }
      } else if (e.key === 'Escape') {
        if (dd) dd.classList.remove('is-open');
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        input.value = '';
        clearBtn.classList.remove('is-visible');
        renderEmptyDropdown();
        input.focus();
      });
    }
  }

  doc.addEventListener('click', function (e) {
    if (!dd) return;
    if (e.target.closest('#navSearch')) return;
    dd.classList.remove('is-open');
  });

  if (dd) {
    dd.addEventListener('click', function (e) {
      var delBtn = e.target.closest('[data-del-recent]');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        removeRecent(delBtn.dataset.delRecent);
        renderEmptyDropdown();
        return;
      }

      var clearAll = e.target.closest('#clearAllRecents');
      if (clearAll) {
        e.preventDefault();
        e.stopPropagation();
        try { localStorage.removeItem(RECENT_KEY); } catch (err) {}
        renderEmptyDropdown();
        return;
      }

      var hit = e.target.closest('[data-search-hit]');
      if (hit) {
        e.preventDefault();
        addRecent(hit.dataset.searchTitle);
        dd.classList.remove('is-open');
        if (window.WN && WN.openModal) {
          WN.openModal(hit.dataset.searchHit, hit.dataset.searchType);
        }
        return;
      }

      var rec = e.target.closest('[data-search-recent]');
      if (rec) {
        e.preventDefault();
        var val = rec.dataset.searchRecent;
        if (input) input.value = val;
        addRecent(val);
        window.location = '/search?q=' + encodeURIComponent(val);
      }
    });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && input) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
        e.preventDefault();
        var ns = doc.getElementById('navSearch');
        if (ns) ns.classList.add('is-open');
        input.focus();
      }
    }
  });
})();