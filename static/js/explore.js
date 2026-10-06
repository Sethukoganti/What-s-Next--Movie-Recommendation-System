/* Explore page — URL-synced filters, dual-range sliders, load more. */
(function () {
  'use strict';
  var WN = window.WN;
  var doc = document;
  var bar = doc.getElementById('filterBar');
  if (!bar) return;

  var params = new URLSearchParams(window.location.search);
  var EXPLORE = '/explore';

  function base() {
    var b = {};
    ['q', 'media_type', 'sort_by', 'language', 'genres', 'year_from', 'year_to', 'rating_min', 'runtime_min', 'seasons_min']
      .forEach(function (k) {
        var v = params.get(k);
        if (v) b[k] = v;
      });
    return b;
  }

  function commit(overrides) {
    var b = base();
    Object.keys(overrides || {}).forEach(function (k) {
      var v = overrides[k];
      if (v === '' || v == null || v === '0' || (k === 'genres' && v === '')) delete b[k];
      else b[k] = v;
    });
    delete b.page;
    var qs = Object.keys(b).map(function (k) { return k + '=' + encodeURIComponent(b[k]); }).join('&');
    window.location = EXPLORE + (qs ? '?' + qs : '');
  }

  /* pills */
  bar.addEventListener('click', function (e) {
    var pill = e.target.closest('.pill[data-key]');
    if (!pill) return;
    var key = pill.dataset.key;
    var val = pill.dataset.value;
    if (key === 'genres') {
      var cur = (base().genres || '').split(',').filter(Boolean);
      var i = cur.indexOf(val);
      if (i >= 0) cur.splice(i, 1); else cur.push(val);
      commit({ genres: cur.join(',') });
      return;
    }
    commit({ [key]: val });
  });

  /* selects */
  var lang = doc.getElementById('filterLanguage');
  if (lang) lang.addEventListener('change', function () { commit({ language: lang.value }); });
  var seasons = doc.getElementById('filterSeasons');
  if (seasons) seasons.addEventListener('change', function () { commit({ seasons_min: seasons.value }); });

  /* chip removal */
  bar.addEventListener('click', function (e) {
    var x = e.target.closest('.chip__x');
    if (x && x.hasAttribute('data-remove')) {
      e.preventDefault();
      commit({ [x.dataset.remove]: '' });
    }
    if (x && x.hasAttribute('data-remove-genre')) {
      e.preventDefault();
      commit({ genres: (base().genres || '').split(',').filter(function (g) { return g !== x.dataset.removeGenre; }).join(',') });
    }
  });

  /* dual-range sliders */
  function pct(el, v) {
    var min = parseFloat(el.min), max = parseFloat(el.max);
    return ((v - min) / (max - min)) * 100;
  }
  bar.querySelectorAll('[data-dual]').forEach(function (group) {
    var key = group.dataset.dual;
    var lo = group.querySelector('input[data-lo]');
    var hi = group.querySelector('input[data-hi]');
    var fill = group.querySelector('[data-fill]');
    var label = doc.getElementById(key + 'Label');
    var min = parseFloat(group.dataset.min);
    var max = parseFloat(group.dataset.max);
    var single = group.classList.contains('dual-range--single');

    function render() {
      var loV = parseFloat(lo.value);
      var hiV = hi ? parseFloat(hi.value) : max;
      if (hi && !single && loV > hiV) { lo.value = hiV; loV = hiV; }
      if (hi && !single && hiV < loV) { hi.value = loV; hiV = loV; }
      var l = pct(lo, loV);
      var h = hi ? pct(hi, hiV) : max;
      if (fill) {
        fill.style.left = (single ? 0 : l) + '%';
        fill.style.width = Math.max(2, h - l) + '%';
      }
      if (label) {
        if (key === 'year') label.textContent = loV + ' \u2013 ' + hiV;
        else if (key === 'rating') label.textContent = loV + '+';
        else label.textContent = loV + '+ min';
      }
    }

    lo.addEventListener('input', function () {
      if (hi && !single && parseInt(lo.value) > parseInt(hi.value)) hi.value = lo.value;
      render();
    });
    hi.addEventListener('input', function () {
      if (lo && !single && parseInt(hi.value) < parseInt(lo.value)) lo.value = hi.value;
      render();
    });
    lo.addEventListener('change', function () {
      commit({ [key === 'year' ? 'year_from' : key === 'rating' ? 'rating_min' : 'runtime_min']: lo.value });
    });
    if (hi) hi.addEventListener('change', function () {
      commit({ [key === 'year' ? 'year_to' : key + '_min']: hi.value });
    });
    render();
  });

  /* Load More */
  var loadMoreBtn = doc.getElementById('loadMoreBtn');
  var spinner = doc.getElementById('loadMoreSpinner');
  var grid = doc.getElementById('resultsGrid');
  var initial = null;
  try { initial = JSON.parse(doc.getElementById('exploreInitial').textContent); } catch (e) { initial = null; }
  if (initial && initial.has_more) loadMoreBtn.hidden = false;

  var loading = false;
  var page = initial ? initial.page : 1;
  function loadMore() {
    if (loading || !initial || !initial.has_more) return;
    loading = true;
    loadMoreBtn.hidden = true;
    spinner.hidden = false;
    var b = base();
    b.page = page + 1;
    var qs = Object.keys(b).map(function (k) { return k + '=' + encodeURIComponent(b[k]); }).join('&');
    WN.api('/api/explore?' + qs, { method: 'GET' })
      .then(function (data) {
        var frag = doc.createDocumentFragment();
        (data.results || []).forEach(function (c) {
          var cell = doc.createElement('div');
          cell.className = 'grid-cell';
          cell.innerHTML = WN.cardHtml(c);
          frag.appendChild(cell);
        });
        grid.appendChild(frag);
        if (window.WN && WN.lazyObserver) grid.querySelectorAll('.is-lazy').forEach(function (img) {
          if (img.dataset.lazy && !img.__lazy) { img.__lazy = true; WN.lazyObserver.observe(img); }
        });
        page += 1;
        initial.has_more = !!data.has_more;
        if (data.total) {
          var tc = doc.getElementById('totalResults');
          if (tc) tc.textContent = data.total;
        }
        if (data.has_more) loadMoreBtn.hidden = false;
        else loadMoreBtn.hidden = true;
      })
      .catch(function () {
        WN.toast('Could not load more results.', 'error');
      })
      .then(function () {
        loading = false;
        spinner.hidden = true;
      });
  }
  loadMoreBtn.addEventListener('click', loadMore);
})();