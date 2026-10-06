/* Stats charts — Chart.js renders reliably when canvas & data exist. */
(function () {
  'use strict';

  function renderAll() {
    var data = window.WN_STATS;
    if (!data || typeof Chart === 'undefined') return;

    var FONT = 'Inter, system-ui, sans-serif';
    function darkNow() {
      return document.documentElement.getAttribute('data-theme') !== 'light';
    }

    function baseOpts(dark) {
      var text = dark ? 'rgba(255,255,255,.75)' : 'rgba(18,18,20,.75)';
      var grid = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)';
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: text, font: { family: FONT, weight: 600 } } }
        },
        scales: {
          x: { ticks: { color: text, font: { family: FONT } }, grid: { color: grid } },
          y: { ticks: { color: text, font: { family: FONT } }, grid: { color: grid } },
        },
      };
    }

    function entries(obj) {
      return Object.keys(obj || {}).map(function (k) { return [k, obj[k]]; });
    }

    var c1 = document.getElementById('genreChart');
    if (c1 && !c1.dataset.rendered) {
      c1.dataset.rendered = 'true';
      var g = entries(data.genre_counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
      if (g.length) {
        new Chart(c1, {
          type: 'doughnut',
          data: {
            labels: g.map(function (x) { return x[0]; }),
            datasets: [{
              data: g.map(function (x) { return x[1]; }),
              backgroundColor: ['#e50914', '#d4a843', '#21d07a', '#3f78ff', '#b45fff', '#00b3a4', '#ff7849', '#5aa9e6'].slice(0, g.length),
              borderWidth: 2,
              borderColor: darkNow() ? '#141418' : '#ffffff',
              hoverOffset: 8,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: darkNow() ? 'rgba(255,255,255,.82)' : 'rgba(18,18,20,.82)',
                  font: { family: FONT, size: 12 },
                  boxWidth: 12,
                  padding: 10
                }
              },
            },
          },
        });
      }
    }

    var c2 = document.getElementById('ratingChart');
    if (c2 && !c2.dataset.rendered) {
      c2.dataset.rendered = 'true';
      var rd = data.ratings_distribution || {};
      var buckets = Object.keys(rd).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
      if (buckets.length) {
        new Chart(c2, {
          type: 'line',
          data: {
            labels: buckets,
            datasets: [{
              label: 'Titles Rated',
              data: buckets.map(function (b) { return rd[b]; }),
              borderColor: '#e50914',
              backgroundColor: 'rgba(229, 9, 20, 0.16)',
              fill: true,
              tension: 0.35,
              pointRadius: 4,
              pointBackgroundColor: '#e50914',
            }],
          },
          options: baseOpts(darkNow()),
        });
      }
    }

    var c3 = document.getElementById('monthlyChart');
    if (c3 && !c3.dataset.rendered) {
      c3.dataset.rendered = 'true';
      var mr = data.monthly_ratings || {};
      var months = Object.keys(mr).sort();
      if (months.length) {
        new Chart(c3, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [{
              label: 'Ratings Given',
              data: months.map(function (m) { return mr[m]; }),
              backgroundColor: '#d4a843',
              borderRadius: 4,
            }],
          },
          options: baseOpts(darkNow()),
        });
      }
    }
  }

  function tryInit() {
    if (typeof Chart !== 'undefined') {
      renderAll();
    } else {
      var count = 0;
      var interval = setInterval(function () {
        count++;
        if (typeof Chart !== 'undefined') {
          clearInterval(interval);
          renderAll();
        } else if (count > 25) {
          clearInterval(interval);
        }
      }, 120);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
    window.addEventListener('load', tryInit);
  } else {
    tryInit();
  }

  document.addEventListener('wn:themechange', function () {
    // Re-render on theme toggle to match canvas colors
    var canvases = document.querySelectorAll('#genreChart, #ratingChart, #monthlyChart');
    canvases.forEach(function (c) { delete c.dataset.rendered; });
    renderAll();
  });
})();