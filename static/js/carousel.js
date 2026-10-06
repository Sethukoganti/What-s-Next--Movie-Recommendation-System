/* Horizontal carousel arrows + momentum drag for [data-scroll-row] cinema rows. */
(function () {
  'use strict';
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-row]'));

  function trackOf(row) {
    return row.querySelector('.carousel__track') || row.querySelector('.carousel-track') || row;
  }
  function prevBtn(row) {
    return row.querySelector('[data-arrow="-1"]') || row.querySelector('[data-scroll-prev]');
  }
  function nextBtn(row) {
    return row.querySelector('[data-arrow="1"]') || row.querySelector('[data-scroll-next]');
  }

  function scrollBy(row, dir) {
    var track = trackOf(row);
    var amount = Math.round(track.clientWidth * 0.92);
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  rows.forEach(function (row) {
    var track = trackOf(row);
    var prev = prevBtn(row);
    var next = nextBtn(row);

    function update() {
      var atStart = track.scrollLeft <= 4;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (prev) {
        prev.hidden = atStart;
        prev.disabled = atStart;
      }
      if (next) {
        next.hidden = atEnd;
        next.disabled = atEnd;
      }
      row.classList.toggle('is-at-start', atStart);
      row.classList.toggle('is-at-end', atEnd);
    }

    if (prev) prev.addEventListener('click', function () { scrollBy(row, -1); });
    if (next) next.addEventListener('click', function () { scrollBy(row, 1); });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    /* momentum drag (mouse + touch) */
    var isOverflowing = function () { return track.scrollWidth > track.clientWidth + 2; };

    var state = null;
    function startDrag(pageX) {
      if (!isOverflowing()) return;
      var offset = track.scrollLeft;
      state = {
        pageX: pageX,
        scrollLeft: offset,
        dragging: false,
        lastX: pageX,
        lastT: Date.now(),
        vx: 0,
        moved: 0,
      };
    }
    function moveDrag(pageX) {
      if (!state) return;
      var dx = pageX - state.pageX;
      var now = Date.now();
      var dt = Math.max(1, now - state.lastT);
      state.vx = 0.8 * state.vx + 0.2 * ((pageX - state.lastX) / dt);
      state.lastX = pageX;
      state.lastT = now;
      if (Math.abs(dx) > 6) state.dragging = true;
      if (state.dragging) {
        track.scrollLeft = state.scrollLeft - dx;
        row.classList.add('is-dragging');
      }
    }
    function endDrag() {
      if (!state) return;
      if (state.dragging) {
        row.classList.remove('is-dragging');
        var vel = Math.min(Math.max(state.vx * 14, -1800), 1800);
        if (Math.abs(vel) > 60) {
          track.scrollBy({ left: -vel * 14, behavior: 'smooth' });
        }
      }
      state = null;
    }

    track.addEventListener('mousedown', function (e) {
      startDrag(e.pageX);
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) { moveDrag(e.pageX); });
    window.addEventListener('mouseup', endDrag);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });

    track.addEventListener('touchstart', function (e) {
      startDrag(e.touches[0].pageX);
    }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      moveDrag(e.touches[0].pageX);
    }, { passive: true });
    track.addEventListener('touchend', endDrag, { passive: true });

    /* keyboard: arrow keys scroll the focused row */
    row.setAttribute('tabindex', '0');
    row.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { scrollBy(row, -1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { scrollBy(row, 1); e.preventDefault(); }
    });
  });
})();