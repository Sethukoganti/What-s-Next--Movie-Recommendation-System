// =====================================================
// TrailFlix — Premium Netflix-style Interactions
// =====================================================

(function () {
  "use strict";

  // ----------------------------------------------------
  // CUSTOM CURSOR
  // ----------------------------------------------------
  // CURSOR (normal cursor - disabled custom effects)
  // ----------------------------------------------------
  // Track pointer position for any CSS spotlight vars
  let pointerFrame = null;
  document.addEventListener("pointermove", (event) => {
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--pointer-x", event.clientX + "px");
      document.documentElement.style.setProperty("--pointer-y", event.clientY + "px");
      pointerFrame = null;
    });
  }, { passive: true });

  // ----------------------------------------------------
  // NAVIGATION BAR
  // ----------------------------------------------------
  const nav = document.getElementById("nav");
  let navTicking = false;

  window.addEventListener("scroll", () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle("scrolled", window.scrollY > 50);
      navTicking = false;
    });
  });

  // Search toggle
  const searchToggle = document.getElementById("searchToggle");
  const navSearchBar = document.getElementById("navSearchBar");
  const navSearchInput = document.getElementById("navSearchInput");
  const navDropdown = document.getElementById("navDropdown");

  if (searchToggle && navSearchBar) {
    searchToggle.addEventListener("click", () => {
      const isOpen = navSearchBar.classList.toggle("open");
      if (isOpen) {
        setTimeout(() => navSearchInput.focus(), 300);
      } else {
        navSearchInput.value = "";
        navDropdown.classList.remove("open");
      }
    });

    let searchTimer = null;
    navSearchInput.addEventListener("input", () => {
      const q = navSearchInput.value.trim();
      clearTimeout(searchTimer);
      if (q.length < 2) {
        navDropdown.classList.remove("open");
        return;
      }
      searchTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
          const results = await res.json();
          if (!results.length) {
            navDropdown.innerHTML = `<div class="nav-dropdown-empty">No results found</div>`;
          } else {
            navDropdown.innerHTML = results.slice(0, 8).map(m => `
              <div class="nav-dropdown-item" data-id="${m.TmdbID}" data-type="${m.MediaType}">
                ${m.Poster ? `<img src="${m.Poster}" alt="${m.Movie}">` : ''}
                <div>
                  <div class="dd-title">${m.Movie}${m.Year ? ` (${m.Year})` : ''}</div>
                  <div class="dd-meta">${m.TypeLabel}</div>
                </div>
              </div>
            `).join("");
            navDropdown.querySelectorAll(".nav-dropdown-item").forEach(item => {
              item.addEventListener("click", () => {
                openModal();
                loadTitleDetail(item.dataset.id, item.dataset.type);
                navSearchBar.classList.remove("open");
                navSearchInput.value = "";
                navDropdown.classList.remove("open");
              });
            });
          }
          navDropdown.classList.add("open");
        } catch (err) {
          navDropdown.classList.remove("open");
        }
      }, 250);
    });
  }

  // User menu
  const userMenu = document.getElementById("userMenu");
  if (userMenu) {
    const avatar = userMenu.querySelector(".user-avatar");
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenu.classList.toggle("open");
    });
    document.addEventListener("click", () => userMenu.classList.remove("open"));
  }

  // Close dropdowns on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-search-bar") && navDropdown) {
      navDropdown.classList.remove("open");
    }
  });

  // ----------------------------------------------------
  // ROW HORIZONTAL SCROLL (mouse wheel + drag)
  // ----------------------------------------------------
  document.querySelectorAll("[data-scroll-row]").forEach(row => {
    row.addEventListener("wheel", (e) => {
      if (row.scrollWidth <= row.clientWidth) return;
      e.preventDefault();
      // Use horizontal delta if present, otherwise vertical delta
      const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      row.scrollLeft += dx;
    }, { passive: false });

    let startX = 0, startScroll = 0, dragging = false;
    row.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX = e.clientX;
      startScroll = row.scrollLeft;
      dragging = false;
    });
    row.addEventListener("pointermove", (e) => {
      if (e.buttons !== 1) return;
      if (!dragging && Math.abs(e.clientX - startX) < 6) return;
      dragging = true;
      row.classList.add("dragging");
      row.scrollLeft = startScroll - (e.clientX - startX);
    });
    row.addEventListener("pointerup", () => { row.classList.remove("dragging"); dragging = false; });
    row.addEventListener("pointercancel", () => { row.classList.remove("dragging"); dragging = false; });

    // Arrow buttons
    const leftArrow = row.querySelector(".row-arrow-left");
    const rightArrow = row.querySelector(".row-arrow-right");
    if (leftArrow) leftArrow.addEventListener("click", () => row.scrollBy({ left: -400, behavior: "smooth" }));
    if (rightArrow) rightArrow.addEventListener("click", () => row.scrollBy({ left: 400, behavior: "smooth" }));
  });

  // ----------------------------------------------------
  // SCROLL-TRIGGERED REVEAL ANIMATIONS
  // ----------------------------------------------------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const row = entry.target;
        row.classList.add("revealed");
        // Staggered card reveal
        const cards = row.querySelectorAll(".card");
        cards.forEach((card, i) => {
          setTimeout(() => card.classList.add("revealed"), i * 60);
        });
        revealObserver.unobserve(row);
      }
    });
  }, { rootMargin: "60px", threshold: 0.05 });

  document.querySelectorAll(".reveal-row").forEach(row => revealObserver.observe(row));

  // Also observe standalone cards (grid layouts)
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        cardObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "80px", threshold: 0.1 });

  document.querySelectorAll(".watchlist-grid .card, .grid .card").forEach(card => cardObserver.observe(card));

  // ----------------------------------------------------
  // MODAL
  // ----------------------------------------------------
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalContent = document.getElementById("modalContent");
  const modalClose = document.getElementById("modalClose");

  function openModal() {
    modalBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ----------------------------------------------------
  // TRAILER PLAYER (embedded YouTube in modal)
  // ----------------------------------------------------
  function openTrailerModal(title, year) {
    const query = `${title || ""}${year ? ` (${year})` : ""}`;
    openModal();
    modalContent.innerHTML = `
      <div class="trailer-player">
        <div class="trailer-header">
          <h2 class="trailer-title">${title || "Trailer"}</h2>
          <span class="trailer-sub">${year ? year : "Official Trailer"}</span>
        </div>
        <div class="trailer-embed">
          <div class="trailer-loading">
            <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
            Loading trailer...
          </div>
        </div>
        <div class="trailer-foot">
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official trailer")}" target="_blank" rel="noopener" class="trailer-watch-url">Watch on YouTube</a>
        </div>
      </div>`;

    const embedEl = modalContent.querySelector(".trailer-embed");

    fetch(`/trailer?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        let src;
        if (data && data.video_id) {
          src = `https://www.youtube.com/embed/${data.video_id}?autoplay=1&rel=0&modestbranding=1`;
        } else {
          src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query + " official trailer")}&autoplay=1&rel=0&modestbranding=1`;
        }
        embedEl.innerHTML = `<iframe
            src="${src}"
            title="${title || "Trailer"} Trailer"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      })
      .catch(() => {
        embedEl.innerHTML = `<div class="trailer-loading">Couldn't load the trailer. <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official trailer")}" target="_blank" rel="noopener" style="color:var(--accent);">Watch on YouTube</a></div>`;
      });
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  async function loadTitleDetail(id, type) {
    modalContent.innerHTML = `<div class="modal-loading">
      <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
      Loading...
    </div>`;
    try {
      const res = await fetch(`/title/${type}/${id}`);
      const movie = await res.json();
      renderModal(movie);
    } catch (err) {
      modalContent.innerHTML = `<div class="modal-loading">Couldn't load this title.</div>`;
    }
  }

  function renderModal(movie) {
    const backdrop = movie.Backdrop || movie.Poster || "";
    const cast = (movie.Cast && movie.Cast.length) ? movie.Cast.join(", ") : "Cast info unavailable";

    const lengthLabel = movie.MediaType === "tv"
      ? (movie.Seasons ? `${movie.Seasons} season${movie.Seasons !== 1 ? "s" : ""}` : "")
      : (movie.Runtime ? `${movie.Runtime} min` : "");

    const ratingBadges = [
      movie.IMDbRating ? `<span class="badge badge-imdb">IMDb ${movie.IMDbRating}</span>` : "",
      movie.RTRating ? `<span class="badge badge-rt">🍅 ${movie.RTRating}</span>` : "",
      movie.Metacritic ? `<span class="badge badge-mc">MC ${movie.Metacritic}</span>` : "",
      movie.TMDBRating ? `<span class="badge badge-tmdb">★ ${movie.TMDBRating.toFixed(1)}</span>` : ""
    ].filter(Boolean).join("");

    let accountPanel = "";
    let premiumPrompt = "";

    if (movie.IsPremium) {
      accountPanel = `
        <div class="modal-account-panel">
          <button class="modal-action-btn ${movie.InWatchlist ? 'is-active' : ''}" id="watchlistBtn" title="Add to My List">
            ${movie.InWatchlist ? '✓' : '+'}
          </button>
          <div style="margin-top:16px;">
            <span class="rating-label">Your Rating</span>
            <div class="star-rating">
              ${[1,2,3,4,5].map(v => `<button type="button" class="rating-star ${Number(movie.MyRating) >= v ? 'is-selected' : ''}" data-rating="${v}">&#9733;</button>`).join("")}
            </div>
          </div>
          <form class="review-form" id="reviewForm">
            <label for="reviewText" class="rating-label">Your Experience</label>
            <textarea id="reviewText" maxlength="2000" placeholder="What stayed with you?">${movie.MyReview || ""}</textarea>
            <button type="submit" class="review-save-btn">Save</button>
            <span class="form-status" id="formStatus"></span>
          </form>
        </div>`;
    } else if (movie.IsPremium === false) {
      premiumPrompt = `
        <div class="premium-prompt">
          <strong>Unlock Premium Features</strong>
          <span>Save to watchlist, rate titles, and write your personal experience.</span>
          <a href="/premium">Learn More</a>
        </div>`;
    }

    modalContent.innerHTML = `
      ${backdrop ? `<img class="modal-hero-img" src="${backdrop}" alt="${movie.Movie}">` : ""}
      <div class="modal-body">
        <h2 class="modal-title">${movie.Movie}</h2>
        <div class="modal-meta">
          ${movie.Match ? `<span class="modal-match">${movie.Match}% Match</span>` : ""}
          ${movie.Year ? `<span>${movie.Year}</span>` : ""}
          ${lengthLabel ? `<span>${lengthLabel}</span>` : ""}
          <span class="badge badge-hd">HD</span>
        </div>
        ${ratingBadges ? `<div class="modal-badges">${ratingBadges}</div>` : ""}
        <div class="modal-actions">
          <button class="modal-play-btn" data-id="${movie.TmdbID}" data-type="${movie.MediaType}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            Play Trailer
          </button>
          ${movie.InWatchlist !== undefined ? `
            <button class="modal-action-btn ${movie.InWatchlist ? 'is-active' : ''}" id="modalWatchlistBtn" title="My List">
              ${movie.InWatchlist ? '✓' : '+'}
            </button>` : ""}
          <button class="modal-action-btn" title="Like">&#128077;</button>
        </div>
        <p class="modal-genres">${movie.Genre}</p>
        <p class="modal-overview">${movie.Overview || "No overview available."}</p>
        <p class="modal-cast"><strong>Cast: </strong>${cast}</p>
        ${accountPanel}
        ${premiumPrompt}
      </div>`;

    // Bind interactions
    if (movie.IsPremium) bindModalControls(movie);

    // Play button embeds YouTube trailer directly in the modal
    modalContent.querySelectorAll(".modal-play-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        openTrailerModal(movie.Movie, movie.Year);
      });
    });

    // Modal watchlist button
    const mwBtn = document.getElementById("modalWatchlistBtn");
    if (mwBtn && movie.IsPremium) {
      mwBtn.addEventListener("click", async () => {
        const endpoint = `/title/${movie.MediaType}/${movie.TmdbID}/watchlist`;
        const response = await fetch(endpoint, { method: "POST" });
        const data = await response.json();
        if (response.ok) {
          movie.InWatchlist = data.in_watchlist;
          mwBtn.textContent = data.in_watchlist ? "✓" : "+";
          mwBtn.classList.toggle("is-active", data.in_watchlist);
          const wBtn = document.getElementById("watchlistBtn");
          if (wBtn) {
            wBtn.textContent = data.in_watchlist ? "✓" : "+";
            wBtn.classList.toggle("is-active", data.in_watchlist);
          }
        }
      });
    }
  }

  function bindModalControls(movie) {
    const endpoint = `/title/${movie.MediaType}/${movie.TmdbID}`;
    const status = document.getElementById("formStatus");

    const setStatus = (msg, error = false) => {
      if (status) {
        status.textContent = msg;
        status.classList.toggle("is-error", error);
      }
    };

    const wBtn = document.getElementById("watchlistBtn");
    if (wBtn) {
      wBtn.addEventListener("click", async () => {
        const response = await fetch(`${endpoint}/watchlist`, { method: "POST" });
        const data = await response.json();
        if (!response.ok) return setStatus(data.error || "Could not update.", true);
        movie.InWatchlist = data.in_watchlist;
        wBtn.textContent = data.in_watchlist ? "✓" : "+";
        wBtn.classList.toggle("is-active", data.in_watchlist);
        setStatus(data.in_watchlist ? "Saved." : "Removed.");
      });
    }

    document.querySelectorAll(".rating-star").forEach(star => {
      star.addEventListener("click", async () => {
        const rating = Number(star.dataset.rating);
        const response = await fetch(`${endpoint}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating })
        });
        if (response.ok) {
          document.querySelectorAll(".rating-star").forEach(s => {
            s.classList.toggle("is-selected", Number(s.dataset.rating) <= rating);
          });
          setStatus("Rating saved.");
        }
      });
    });

    const reviewForm = document.getElementById("reviewForm");
    if (reviewForm) {
      reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const response = await fetch(`${endpoint}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experience: document.getElementById("reviewText").value })
        });
        const data = await response.json();
        setStatus(response.ok ? "Experience saved." : (data.error || "Couldn't save."), !response.ok);
      });
    }
  }

  // ----------------------------------------------------
  // CARD CLICK -> MODAL
  // ----------------------------------------------------
  document.addEventListener("click", async (e) => {
    // Handle panel play/expand buttons
    const panelBtn = e.target.closest(".panel-btn-play, .panel-expand");
    if (panelBtn) {
      e.stopPropagation();
      const id = panelBtn.dataset.id;
      const type = panelBtn.dataset.type;
      if (panelBtn.classList.contains("panel-btn-play")) {
        const card = panelBtn.closest(".card");
        const title = card ? card.querySelector("h3")?.textContent : "";
        const year = card ? card.querySelector(".card-subtitle")?.textContent.match(/\d{4}/)?.[0] : "";
        openTrailerModal(title, year);
      } else {
        openModal();
        loadTitleDetail(id, type);
      }
      return;
    }

    // Handle panel add to list
    const addBtn = e.target.closest(".panel-add");
    if (addBtn) {
      e.stopPropagation();
      // Toggle visual state
      addBtn.classList.toggle("is-active");
      return;
    }

    // Card click -> modal
    const card = e.target.closest(".card");
    if (!card) return;
    // Ignore if clicking a button inside the card
    if (e.target.closest("button")) return;

    const movieId = card.dataset.movieId;
    const mediaType = card.dataset.mediaType || "movie";
    openModal();
    loadTitleDetail(movieId, mediaType);
  });

  // ----------------------------------------------------
  // HERO BUTTONS
  // ----------------------------------------------------
  document.querySelectorAll(".hero-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      if (btn.classList.contains("hero-btn-play")) {
        const title = document.getElementById("heroTitle");
        const titleText = title ? title.textContent.trim() : "movie";
        const metaText = document.querySelector(".hero-meta") ? document.querySelector(".hero-meta").textContent : "";
        const year = metaText.match(/\b(19|20)\d{2}\b/)?.[0] || "";
        openTrailerModal(titleText, year);
      } else {
        openModal();
        loadTitleDetail(id, type);
      }
    });
  });

  // ----------------------------------------------------
  // PARALLAX ON HERO
  // ----------------------------------------------------
  const heroImg = document.getElementById("heroBgImg");
  if (heroImg) {
    window.addEventListener("scroll", () => {
      const scroll = window.scrollY;
      if (scroll < window.innerHeight) {
        heroImg.style.transform = `scale(${1 + scroll * 0.0001}) translateY(${scroll * 0.3}px)`;
      }
    }, { passive: true });
  }

  // ----------------------------------------------------
  // WATCHLIST PAGE: REMOVE EXPERIENCE
  // ----------------------------------------------------
  document.querySelectorAll(".remove-experience").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { tmdbId, mediaType } = btn.dataset;
      const response = await fetch(`/title/${mediaType}/${tmdbId}/review/delete`, { method: "POST" });
      if (response.ok) btn.closest(".experience-entry").remove();
    });
  });

  // ----------------------------------------------------
  // FORM ROUTING (homepage search)
  // ----------------------------------------------------
  const pickerForm = document.getElementById("pickerForm");
  const submitBtn = document.getElementById("submitBtn");
  const searchInput = document.getElementById("movie_search");
  const tmdbIdInput = document.getElementById("tmdb_id");
  const mediaTypeInput = document.getElementById("media_type");
  const dropdown = document.getElementById("dropdown");
  const typeSelect = document.getElementById("type");

  let searchTimer = null;
  let activeSuggestionIndex = -1;

  if (searchInput && dropdown) {
    searchInput.addEventListener("input", () => {
      tmdbIdInput.value = "";
      activeSuggestionIndex = -1;
      const query = searchInput.value.trim();
      clearTimeout(searchTimer);
      if (query.length < 2) {
        dropdown.classList.remove("open");
        dropdown.innerHTML = "";
        return;
      }
      searchTimer = setTimeout(() => runSearch(query), 250);
    });

    searchInput.addEventListener("keydown", (event) => {
      const items = dropdown.querySelectorAll(".dropdown-item");
      if (!items.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        activeSuggestionIndex = event.key === "ArrowDown"
          ? (activeSuggestionIndex + 1) % items.length
          : (activeSuggestionIndex - 1 + items.length) % items.length;
        items.forEach((item, index) => item.classList.toggle("is-keyboard-active", index === activeSuggestionIndex));
      }
      if (event.key === "Enter" && activeSuggestionIndex >= 0) {
        event.preventDefault();
        selectSuggestion(items[activeSuggestionIndex]);
      }
      if (event.key === "Escape") {
        dropdown.classList.remove("open");
        activeSuggestionIndex = -1;
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-field")) {
        dropdown.classList.remove("open");
      }
    });
  }

  async function runSearch(query) {
    try {
      const type = typeSelect ? typeSelect.value : "";
      const res = await fetch(`/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type || "all")}`);
      const results = await res.json();
      if (!results.length) {
        dropdown.innerHTML = `<div class="dropdown-empty">No titles match "${query}"</div>`;
        dropdown.classList.add("open");
        return;
      }
      dropdown.innerHTML = results.map((movie, index) => `
        <div class="dropdown-item" data-id="${movie.TmdbID}" data-type="${movie.MediaType}" data-title="${(movie.Movie || "").replace(/"/g, '&quot;')}">
          <span class="dropdown-title">${movie.Movie}${movie.Year ? ` (${movie.Year})` : ""}</span>
          <span class="dropdown-genre">${index === 0 ? "Closest match · " : ""}${movie.TypeLabel}</span>
        </div>
      `).join("");
      dropdown.classList.add("open");
      dropdown.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", () => selectSuggestion(item));
      });
    } catch (err) {
      dropdown.classList.remove("open");
    }
  }

  function selectSuggestion(item) {
    if (searchInput) searchInput.value = item.dataset.title;
    if (tmdbIdInput) tmdbIdInput.value = item.dataset.id;
    if (mediaTypeInput) mediaTypeInput.value = item.dataset.type;
    activeSuggestionIndex = -1;
    dropdown.classList.remove("open");
  }

  if (pickerForm) {
    pickerForm.addEventListener("submit", (e) => {
      const query = searchInput.value.trim();
      const year = document.getElementById("year").value;
      const genre = document.getElementById("genre").value;
      const language = document.getElementById("language").value;
      const type = typeSelect ? typeSelect.value : "";

      if (!tmdbIdInput.value && !query && !year && !genre && !language && !type) {
        e.preventDefault();
        searchInput.focus();
        searchInput.classList.add("shake");
        setTimeout(() => searchInput.classList.remove("shake"), 400);
        return;
      }

      pickerForm.classList.add("loading");
      if (submitBtn) submitBtn.disabled = true;

      if (tmdbIdInput.value) return;

      e.preventDefault();
      const topN = document.getElementById("top_n").value;
      const params = new URLSearchParams({ q: query, year, genre, language, type, top_n: topN });
      window.location.href = `/explore?${params.toString()}`;
    });
  }

})();
