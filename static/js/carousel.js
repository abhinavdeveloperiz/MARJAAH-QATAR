// ─── Vanilla Carousel ─────────────────────────────────────────────────────────
(function () {
  document.querySelectorAll('[data-carousel]').forEach(function(carousel) {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = track ? Array.from(track.children) : [];
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    if (!track || slides.length === 0) return;

    let current = 0;
    const getVisible = () => {
      const w = carousel.offsetWidth;
      if (w >= 1280) return 4;
      if (w >= 1024) return 3;
      if (w >= 640) return 2;
      return 1;
    };

    function goTo(index) {
      const visible = getVisible();
      const max = Math.max(0, slides.length - visible);
      current = Math.min(Math.max(index, 0), max);
      const pct = (100 / visible) * current;
      track.style.transform = `translateX(-${pct}%)`;
    }

    if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });

    // Auto-play for hero banners
    if (carousel.dataset.autoplay) {
      setInterval(function() { goTo((current + 1) % Math.max(1, slides.length - getVisible() + 1)); }, 4000);
    }

    // Touch swipe
    let startX = 0;
    carousel.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', function(e) {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
    });
  });

  // Flash deals countdown
  const countdowns = document.querySelectorAll('[data-countdown]');
  if (countdowns.length) {
    function pad(n) { return String(n).padStart(2, '0'); }
    setInterval(function() {
      countdowns.forEach(function(el) {
        let secs = parseInt(el.dataset.countdown || '0');
        secs = Math.max(0, secs - 1);
        el.dataset.countdown = secs;
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        const hEl = el.querySelector('[data-cd-h]');
        const mEl = el.querySelector('[data-cd-m]');
        const sEl = el.querySelector('[data-cd-s]');
        if (hEl) hEl.textContent = pad(h);
        if (mEl) mEl.textContent = pad(m);
        if (sEl) sEl.textContent = pad(s);
      });
    }, 1000);
  }
})();
