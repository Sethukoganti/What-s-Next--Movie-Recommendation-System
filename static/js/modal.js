/* Cinematic Spotlight Modal — rich metadata, triple rating gauges, embedded trailers, 10-star rating, social sharing, focus trapping. */
(function () {
  'use strict';
  var WN = window.WN;
  var doc = document;

  function el(id) {
    return doc.getElementById(id);
  }

  var shell = el('modalRoot');
  var content = el('modalContent');
  var openState = null;

  function fmtDate(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* Circular Progress Ring Generator */
  function circularGauge(label, score, max, unit, color) {
    if (score == null || score === '' || isNaN(parseFloat(score))) {
      return '<div class="rating-gauge rating-gauge--empty">' +
        '<div class="rating-gauge__circle"><span class="rating-gauge__val">—</span></div>' +
        '<span class="rating-gauge__label">' + WN.esc(label) + '</span>' +
      '</div>';
    }

    var num = parseFloat(score);
    var pct = Math.min(100, Math.max(0, (num / max) * 100));
    var radius = 22;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (pct / 100) * circumference;
    var strokeColor = color || (num >= max * 0.7 ? '#21d07a' : (num >= max * 0.5 ? '#d4a843' : '#db2360'));

    return '<div class="rating-gauge">' +
      '<div class="rating-gauge__circle">' +
        '<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">' +
          '<circle class="gauge-track" cx="28" cy="28" r="' + radius + '" fill="none" stroke-width="4"></circle>' +
          '<circle class="gauge-fill" cx="28" cy="28" r="' + radius + '" fill="none" stroke="' + strokeColor + '" stroke-width="4" stroke-linecap="round" ' +
            'style="stroke-dasharray:' + circumference + '; stroke-dashoffset:' + offset + '; transform:rotate(-90deg); transform-origin:50% 50%; transition:stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1);"></circle>' +
        '</svg>' +
        '<span class="rating-gauge__val">' + num + '<small>' + unit + '</small></span>' +
      '</div>' +
      '<span class="rating-gauge__label">' + WN.esc(label) + '</span>' +
    '</div>';
  }

  function metaHtml(c) {
    var parts = [];
    if (c.MediaType === 'tv') {
      if (c.Seasons) parts.push(c.Seasons + (c.Seasons === 1 ? ' Season' : ' Seasons'));
    } else if (c.Runtime) {
      parts.push(c.Runtime + ' min');
    }
    if (c.Year) parts.push(c.Year);

    var html = '<div class="modal__meta">';
    html += parts.map(function (p) { return '<span>' + p + '</span>'; }).join('<span class="meta-sep">&bull;</span>');
    html += '</div>';

    if (c.Genre) {
      html += '<div class="modal__genres">' +
        String(c.Genre).split(' \u00b7 ').map(function (g) {
          return '<span class="genre-pill">' + WN.esc(g) + '</span>';
        }).join('') +
      '</div>';
    }
    return html;
  }

  function castHtml(cast) {
    if (!cast || !cast.length) return '<p class="modal__empty">No cast details listed for this title.</p>';
    return '<div class="modal__cast-carousel">' + cast.map(function (a) {
      var href = a.id ? '/person/' + a.id : '#';
      return '<a class="cast-card glass-panel" href="' + href + '">' +
        (a.profile_path
          ? '<img class="cast-card__img is-lazy" data-lazy="' + WN.esc(a.profile_path) + '" alt="' + WN.esc(a.name) + '" loading="lazy">'
          : '<div class="cast-card__img cast-card__img--ph">' + WN.esc(String(a.name || '?').slice(0, 2).toUpperCase()) + '</div>') +
        '<div class="cast-card__info">' +
          '<div class="cast-card__name">' + WN.esc(a.name) + '</div>' +
          '<div class="cast-card__char">' + WN.esc(a.character || '') + '</div>' +
        '</div>' +
      '</a>';
    }).join('') + '</div>';
  }

  function reviewHtml(item) {
    if (!item || !item.experience) return '';
    var cls = item.spoiler ? ' is-spoiler' : '';
    var cls2 = item.my_vote === 1 ? ' is-active' : '';
    var cls3 = item.my_vote === -1 ? ' is-active' : '';

    return '<article class="review-card glass-panel" data-review="' + item.id + '">' +
      '<div class="review-card__head">' +
        '<img class="review-card__avatar" src="' + WN.esc(item.avatar_url || '/static/images/avatar-default.svg') + '" alt="">' +
        '<div class="review-card__user-info">' +
          '<a class="review-card__user" href="/user/' + encodeURIComponent(item.username) + '">' + WN.esc(item.username) + '</a>' +
          (item.rating ? ('<div class="review-card__score">&#9733; ' + Number(item.rating).toFixed(1) + ' / 5.0</div>') : '') +
          '<div class="review-card__date">' + fmtDate(item.created) + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="review-card__copy' + cls + '"' + (item.spoiler ? ' data-spoiler-tag="true"' : '') + '>' +
        WN.esc(item.experience) +
      '</p>' +
      (item.spoiler ? '<div class="spoiler-cue">⚠️ Review contains spoilers — click to reveal</div>' : '') +
      '<div class="review-card__actions">' +
        '<button class="review-card__vote' + cls2 + '" data-role="vote" data-review="' + item.id + '" data-value="1">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>' +
          '<span>Helpful (<strong data-vote-count="1">' + (item.helpful || 0) + '</strong>)</span>' +
        '</button>' +
        '<button class="review-card__vote' + cls3 + '" data-role="vote" data-review="' + item.id + '" data-value="-1">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>' +
          '<span>Not helpful (<strong data-vote-count="-1">' + (item.not_helpful || 0) + '</strong>)</span>' +
        '</button>' +
        (item.is_own ? '<button class="review-card__del" data-role="delete-review" data-tmdb-id="' + (shell ? shell.dataset.tmdbId : '') + '" data-media-type="' + (shell ? shell.dataset.mediaType : '') + '">Delete</button>' : '') +
      '</div>' +
    '</article>';
  }

  function reviewSection(c) {
    var html = '<section class="modal__panel" data-panel="reviews">';
    html += '<div class="modal__review-editor glass-panel">';
    if (!c.IsLoggedIn) {
      html += '<div class="modal__auth-prompt">' +
        '<p>Sign in to record your experience, share reviews, and rate titles.</p>' +
        '<a class="btn btn--gold" href="/login">Log In to Review</a>' +
      '</div>';
    } else if (!c.IsPremium) {
      html += '<div class="premium-prompt">' +
        '<p>Writing experiences and detailed ratings is a <strong>What\'s Next? Premium</strong> feature.</p>' +
        '<a class="btn btn--gold" href="/premium">Activate Premium</a>' +
      '</div>';
    } else {
      var myRate = c.MyRating ? parseFloat(c.MyRating) : 0;
      html += '<h3 class="modal__subtitle">Your Experience & Rating</h3>';
      html += '<div class="star-rating-10" id="starRating10" data-rating="' + myRate + '">' +
        '<span class="star-rating__label">Your Score: <strong id="starRatingValue">' + (myRate ? (myRate * 2).toFixed(1) + ' / 10' : 'Not rated') + '</strong></span>' +
        '<div class="star-rating__stars">';
      for (var i = 1; i <= 10; i++) {
        var active = (myRate * 2 >= i) ? ' is-active' : '';
        html += '<button type="button" class="star-btn' + active + '" data-star-val="' + (i / 2) + '" aria-label="' + (i / 2) + ' stars">&#9733;</button>';
      }
      html += '</div></div>';

      html += '<div class="review-input-wrap">' +
        '<textarea class="field-area" id="reviewText" rows="4" maxlength="2000" placeholder="What were your thoughts on this title? Write your personal review…">' + WN.esc(c.MyReview || '') + '</textarea>' +
        '<div class="review-input-foot">' +
          '<label class="check"><input type="checkbox" id="reviewSpoiler" ' + (c.MySpoiler ? 'checked' : '') + '> Contains spoilers</label>' +
          '<span class="char-count" id="reviewCharCount">' + (c.MyReview ? c.MyReview.length : 0) + ' / 2000</span>' +
        '</div>' +
      '</div>';

      html += '<div class="modal__editor-actions">' +
        '<button class="btn btn--gold" data-role="save-review">Save Experience</button>' +
        (c.MyReview ? '<button class="btn btn--ghost is-danger" data-role="delete-review" data-tmdb-id="' + c.TmdbID + '" data-media-type="' + c.MediaType + '">Remove Review</button>' : '') +
      '</div>';
    }
    html += '</div>';

    html += '<h3 class="modal__subtitle">Community Reviews</h3>';
    html += '<div class="modal__reviews">' +
      (c.Reviews && c.Reviews.length
        ? c.Reviews.map(reviewHtml).join('')
        : '<p class="modal__empty">No community reviews written yet. Be the first!</p>') +
    '</div>';
    return html + '</section>';
  }

  function similarHtml(c) {
    return '<section class="modal__panel" data-panel="similar">' +
      '<h3 class="modal__subtitle">Similar Titles You Might Like</h3>' +
      '<div class="modal__similar-grid">' +
        (c.Similar && c.Similar.length
          ? c.Similar.map(function (s) { return '<div class="grid-cell">' + WN.cardHtml(s) + '</div>'; }).join('')
          : '<p class="modal__empty">No similar titles found.</p>') +
      '</div>' +
    '</section>';
  }

  function providersHtml(c) {
    var list = c.WatchProviders || [];
    if (!list.length) {
      return '<div class="providers-block"><h4 class="modal__meta-title">Where to Watch</h4><p class="modal__empty-sm">No streaming providers listed for this region.</p></div>';
    }
    return '<div class="providers-block">' +
      '<h4 class="modal__meta-title">Where to Watch</h4>' +
      '<div class="modal__providers">' +
        list.map(function (p) {
          return '<span class="provider-chip" title="' + WN.esc(p.type) + ' on ' + WN.esc(p.name) + '">' +
            (p.logo ? '<img class="provider-chip__logo" src="' + WN.esc(p.logo) + '" alt="">' : '<span class="provider-chip__ph">' + WN.esc(p.name.slice(0, 1)) + '</span>') +
            '<span class="provider-chip__body"><strong>' + WN.esc(p.name) + '</strong><small>' + WN.esc(p.type) + '</small></span>' +
          '</span>';
        }).join('') +
      '</div></div>';
  }

  function renderContent(c) {
    var shellEl = shell;
    if (!shellEl) return;
    shellEl.dataset.tmdbId = c.TmdbID;
    shellEl.dataset.mediaType = c.MediaType;

    var shareUrl = window.location.origin + '/title/' + c.MediaType + '/' + c.TmdbID;
    var shareText = 'Check out ' + c.Movie + ' on What\'s Next!';
    var bg = c.Backdrop ? c.Backdrop : (c.Blur || '');

    var omdb = c.Ratings || {};
    var tmdbScore = c.TMDBRating ? Number(c.TMDBRating).toFixed(1) : null;
    var imdbScore = omdb.imdb ? parseFloat(omdb.imdb) : null;
    var rtScore = omdb.rt ? parseInt(omdb.rt, 10) : null;

    var html = '<div class="modal__hero" style="--backdrop-image:url(\'' + WN.esc(bg) + '\')">' +
      '<div class="modal__hero-veil"></div>' +
      '<div class="modal__hero-inner">' +
        '<span class="modal__type-pill modal__type-pill--' + c.MediaType + '">' + (c.TypeLabel || (c.MediaType === 'tv' ? 'Series' : 'Movie')) + '</span>' +
        '<h2 class="modal__title">' + WN.esc(c.Movie) + '</h2>' +
        metaHtml(c) +
        '<div class="modal__gauges">' +
          circularGauge('TMDB', tmdbScore, 10, '/10') +
          circularGauge('IMDb', imdbScore, 10, '/10') +
          circularGauge('Rotten Tomatoes', rtScore, 100, '%') +
        '</div>' +
        '<div class="modal__actions">' +
          '<button class="btn btn--gold modal__act" data-role="modal-play" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-title="' + WN.esc(c.Movie) + '">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Watch Trailer' +
          '</button>' +
          '<button class="btn btn--glass modal__act ' + (c.InWatchlist ? 'is-active' : '') + '" data-role="bookmark" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-added="' + !!c.InWatchlist + '">' +
            (c.InWatchlist ? '&#10003; In My List' : '+ My List') +
          '</button>' +
          '<button class="btn btn--glass modal__act ' + (c.LikedByMe ? 'is-active' : '') + '" data-role="like" data-id="' + c.TmdbID + '" data-type="' + c.MediaType + '" data-liked="' + !!c.LikedByMe + '">' +
            (c.LikedByMe ? '\u2665 Liked' : '\u2661 Like') +
          '</button>' +
          '<div class="modal__share-group">' +
            '<button class="btn btn--glass btn--icon modal__share-btn" id="modalShareCopy" title="Copy share link" data-url="' + WN.esc(shareUrl) + '">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            '</button>' +
            '<a class="btn btn--glass btn--icon modal__share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(shareUrl) + '" target="_blank" rel="noopener" title="Share on X">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    html += '<div class="modal__body">' +
      '<div class="modal__tabs" role="tablist">' +
        ['overview', 'cast', 'reviews', 'similar'].map(function (t, i) {
          return '<button class="modal__tab' + (i === 0 ? ' is-active' : '') + '" data-tab="' + t + '" role="tab">' + t[0].toUpperCase() + t.slice(1) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="modal__panels">' +
        '<section class="modal__panel is-active" data-panel="overview">' +
          '<div id="modalTrailerEmbed" class="modal__trailer-inline" hidden></div>' +
          '<p class="modal__overview">' + WN.esc(c.Overview || 'No overview description available.') + '</p>' +
          providersHtml(c) +
        '</section>' +
        '<section class="modal__panel" data-panel="cast">' + castHtml(c.CastFull) + '</section>' +
        reviewSection(c) +
        similarHtml(c) +
      '</div>' +
    '</div>';

    content.innerHTML = html;

    // Bind char count
    var txt = content.querySelector('#reviewText');
    var count = content.querySelector('#reviewCharCount');
    if (txt && count) {
      txt.addEventListener('input', function () {
        count.textContent = txt.value.length + ' / 2000';
      });
    }

    // Bind 10-star rating
    var starBox = content.querySelector('#starRating10');
    if (starBox) {
      var starBtns = starBox.querySelectorAll('.star-btn');
      var labelVal = content.querySelector('#starRatingValue');
      starBtns.forEach(function (btn) {
        btn.addEventListener('mouseenter', function () {
          var v = parseFloat(btn.dataset.starVal);
          starBtns.forEach(function (b) {
            b.classList.toggle('is-hover', parseFloat(b.dataset.starVal) <= v);
          });
          if (labelVal) labelVal.textContent = (v * 2).toFixed(1) + ' / 10';
        });
        btn.addEventListener('mouseleave', function () {
          starBtns.forEach(function (b) { b.classList.remove('is-hover'); });
          var cur = parseFloat(starBox.dataset.rating || '0');
          if (labelVal) labelVal.textContent = cur ? (cur * 2).toFixed(1) + ' / 10' : 'Not rated';
        });
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var v = parseFloat(btn.dataset.starVal);
          starBox.dataset.rating = v;
          starBtns.forEach(function (b) {
            b.classList.toggle('is-active', parseFloat(b.dataset.starVal) <= v);
          });
          if (labelVal) labelVal.textContent = (v * 2).toFixed(1) + ' / 10';
          WN.api('/title/' + c.MediaType + '/' + c.TmdbID + '/rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: v })
          }).then(function () {
            WN.toast('Rating recorded (' + (v * 2).toFixed(1) + '/10)', 'success');
          }).catch(function (err) {
            if (err.status === 401) window.location = '/login';
            else if (err.status === 402) WN.modalizeUpgrade();
            else WN.toast(err.message, 'error');
          });
        });
      });
    }

    // Bind share copy
    var shareCopy = content.querySelector('#modalShareCopy');
    if (shareCopy) {
      shareCopy.addEventListener('click', function (e) {
        e.preventDefault();
        var u = shareCopy.dataset.url;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(u).then(function () {
            WN.toast('Link copied to clipboard!', 'success');
          });
        } else {
          prompt('Copy link:', u);
        }
      });
    }

    // Lazy load inside modal
    content.querySelectorAll('.is-lazy').forEach(function (img) {
      WN.loadImage(img);
    });

    openState = { id: c.TmdbID, type: c.MediaType, openedAt: Date.now() };
    shellEl.classList.add('is-open');
    shellEl.hidden = false;
    doc.body.classList.add('has-modal');
  }

  function doVote(btn) {
    var reviewId = btn.dataset.review;
    var value = parseInt(btn.dataset.value, 10);
    var card = btn.closest('.review-card');
    var wasActive = btn.classList.contains('is-active');
    var newVal = wasActive ? 0 : value;
    var group = card.querySelectorAll('[data-role="vote"]');
    group.forEach(function (b) { b.classList.remove('is-active'); });
    if (newVal) btn.classList.add('is-active');

    WN.api('/api/reviews/' + reviewId + '/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal })
    }).then(function (data) {
      card.querySelector('[data-vote-count="1"]').textContent = data.helpful || 0;
      card.querySelector('[data-vote-count="-1"]').textContent = data.not_helpful || 0;
    }).catch(function (err) {
      if (err.status === 401) window.location = '/login';
      else WN.toast(err.message, 'error');
    });
  }

  function doSaveReview() {
    var txt = (content.querySelector('#reviewText').value || '').trim();
    var spoiler = content.querySelector('#reviewSpoiler').checked;
    if (!txt) {
      WN.toast('Please write something before saving.', 'error');
      return;
    }
    var btn = content.querySelector('[data-role="save-review"]');
    btn.classList.add('is-busy');

    var starBox = content.querySelector('#starRating10');
    var rating = starBox ? parseFloat(starBox.dataset.rating || '0') : null;

    var body = { experience: txt, spoiler: spoiler };
    if (rating) body.rating = rating;

    WN.api('/title/' + openState.type + '/' + openState.id + '/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function () {
      WN.toast('Your experience has been saved.', 'success');
      WN.reloadModal();
    }).catch(function (err) {
      btn.classList.remove('is-busy');
      if (err.status === 401) window.location = '/login';
      else if (err.status === 402) WN.modalizeUpgrade();
      else WN.toast(err.message, 'error');
    });
  }

  function open(id, type) {
    shell = shell || el('modalRoot');
    content = content || el('modalContent');
    if (!shell || !content) return;

    // Immediately stop any playing trailer
    stopTrailer();

    shell.classList.add('is-open');
    shell.hidden = false;
    content.innerHTML = '<div class="modal__loading"><div class="spinner"></div><p>Loading title details…</p></div>';
    doc.body.classList.add('has-modal');

    WN.api('/title/' + type + '/' + id, { method: 'GET' })
      .then(function (c) {
        renderContent(c);
      })
      .catch(function (err) {
        content.innerHTML = '<div class="modal__empty"><p>' + WN.esc(err.message || 'Could not load title details.') + '</p><button class="btn btn--glass" id="modalRetry">Retry</button></div>';
        var r = doc.getElementById('modalRetry');
        if (r) r.addEventListener('click', function () { open(id, type); });
      });
  }

  function stopTrailer() {
    if (!content) return;
    var iframes = content.querySelectorAll('iframe');
    iframes.forEach(function (f) { f.remove(); });
    var trailerBox = content.querySelector('#modalTrailerEmbed');
    if (trailerBox) {
      trailerBox.innerHTML = '';
      trailerBox.hidden = true;
    }
  }

  function close() {
    if (!shell) return;
    stopTrailer();
    shell.classList.remove('is-open');
    shell.hidden = true;
    doc.body.classList.remove('has-modal');

    if (openState) {
      var spent = Math.round((Date.now() - openState.openedAt) / 1000);
      if (spent >= 3) {
        WN.api('/title/' + openState.type + '/' + openState.id + '/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time_spent_seconds: spent })
        }).catch(function () { /* noop */ });
      }
      openState = null;
    }
  }

  function openTrailer(videoId, title) {
    if (!shell || !content) return;
    stopTrailer();
    shell.classList.add('is-open');
    shell.hidden = false;
    doc.body.classList.add('has-modal');
    content.innerHTML = '<div class="trailer-player">' +
      '<div class="trailer-header">' +
        '<h2 class="trailer-title">' + WN.esc(title || 'Trailer') + '</h2>' +
        '<button class="modal-close" data-trailer-close aria-label="Close trailer">&times;</button>' +
      '</div>' +
      '<div class="trailer-frame">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/' + WN.esc(videoId) + '?autoplay=1&rel=0&enablejsapi=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>' +
      '</div>' +
    '</div>';
    openState = null;
    var closeBtn = content.querySelector('[data-trailer-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  // Scrim & Close
  var scrim = el('modalScrim');
  if (scrim) scrim.addEventListener('click', close);
  var closeBtn = el('modalClose');
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Modal delegation
  doc.addEventListener('click', function (e) {
    if (!shell || !shell.classList.contains('is-open')) return;

    var tab = e.target.closest('.modal__tab');
    if (tab) {
      content.querySelectorAll('.modal__tab').forEach(function (t) { t.classList.remove('is-active'); });
      content.querySelectorAll('.modal__panel').forEach(function (p) { p.classList.remove('is-active'); });
      tab.classList.add('is-active');
      var panel = content.querySelector('[data-panel="' + tab.dataset.tab + '"]');
      if (panel) panel.classList.add('is-active');
      return;
    }

    var playAct = e.target.closest('[data-role="modal-play"]');
    if (playAct) {
      e.preventDefault();
      var id = playAct.dataset.id;
      var type = playAct.dataset.type;
      var title = playAct.dataset.title;
      WN.toast('Loading trailer…', 'info');
      WN.api('/trailer/' + type + '/' + id, { method: 'GET' })
        .then(function (data) {
          if (data && data.video_id) {
            var trailerBox = content.querySelector('#modalTrailerEmbed');
            if (trailerBox) {
              trailerBox.hidden = false;
              trailerBox.innerHTML = '<div class="trailer-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + WN.esc(data.video_id) + '?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>';
              trailerBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              openTrailer(data.video_id, title);
            }
          } else {
            WN.toast('No trailer found for this title.', 'error');
          }
        })
        .catch(function () {
          WN.toast('Could not load trailer right now.', 'error');
        });
      return;
    }

    var btn = e.target.closest('[data-role]');
    if (!btn) return;
    var role = btn.getAttribute('data-role');

    if (role === 'save-review') { e.preventDefault(); doSaveReview(); return; }
    if (role === 'vote') { e.preventDefault(); doVote(btn); return; }
    if (role === 'bookmark') {
      e.preventDefault();
      WN.api('/title/' + btn.dataset.type + '/' + btn.dataset.id + '/watchlist', { method: 'POST' })
        .then(function (data) {
          WN.setWatchedFlag(btn, !!data.in_watchlist);
          btn.classList.toggle('is-active', !!data.in_watchlist);
          btn.innerHTML = data.in_watchlist ? '&#10003; In My List' : '+ My List';
          WN.toast(data.in_watchlist ? 'Added to My List.' : 'Removed from My List.', 'success');
        })
        .catch(function (err) {
          if (err.status === 401) window.location = '/login';
          else if (err.status === 402) WN.modalizeUpgrade();
          else WN.toast(err.message, 'error');
        });
      return;
    }
    if (role === 'like') {
      e.preventDefault();
      WN.api('/title/' + btn.dataset.type + '/' + btn.dataset.id + '/like', { method: 'POST' })
        .then(function (data) {
          btn.classList.toggle('is-active', !!data.liked);
          btn.innerHTML = data.liked ? '\u2665 Liked' : '\u2661 Like';
          WN.toast(data.liked ? 'Added to your favorites.' : 'Removed like.', data.liked ? 'success' : 'info');
        })
        .catch(function (err) {
          if (err.status === 401) window.location = '/login';
          else if (err.status === 402) WN.modalizeUpgrade();
          else WN.toast(err.message, 'error');
        });
      return;
    }
  });

  // Focus trap & Escape key
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && shell && shell.classList.contains('is-open')) {
      close();
    }
    if (e.key === 'Tab' && shell && shell.classList.contains('is-open')) {
      var focusables = content.querySelectorAll('button:not([disabled]), [href], input, textarea, iframe');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Mobile drag-to-dismiss bottom sheet gesture
  var sheet = el('modalSheet');
  if (sheet) {
    var touchStartY = 0;
    var currentY = 0;
    var isDraggingSheet = false;

    sheet.addEventListener('touchstart', function (e) {
      if (sheet.scrollTop <= 0) {
        touchStartY = e.touches[0].clientY;
        isDraggingSheet = true;
      }
    }, { passive: true });

    sheet.addEventListener('touchmove', function (e) {
      if (!isDraggingSheet) return;
      currentY = e.touches[0].clientY - touchStartY;
      if (currentY > 0) {
        sheet.style.transform = 'translateY(' + (currentY * 0.7) + 'px)';
      }
    }, { passive: true });

    sheet.addEventListener('touchend', function () {
      if (!isDraggingSheet) return;
      isDraggingSheet = false;
      if (currentY > 120) {
        close();
      }
      sheet.style.transform = '';
      currentY = 0;
    }, { passive: true });
  }

  WN.openModal = open;
  WN.closeModal = close;
  WN.openTrailer = openTrailer;
  WN.modalizeUpgrade = function () {
    WN.toast('Premium membership required.', 'error');
    window.location.href = '/premium';
  };
  WN.reloadModal = function () {
    if (openState) open(openState.id, openState.type);
  };
})();