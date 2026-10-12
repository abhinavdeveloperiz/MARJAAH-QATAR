// ─── Scroll to Top + IntersectionObserver Animations ─────────────────────────
(function () {
  // Scroll-to-top button
  const btn = document.getElementById('scroll-to-top');
  if (btn) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 400) {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
        btn.style.pointerEvents = 'auto';
      } else {
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(10px)';
        btn.style.pointerEvents = 'none';
      }
    }, { passive: true });
    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Scroll-driven fade-in animations
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate]').forEach(function(el) {
    observer.observe(el);
  });

  // Hero parallax on scroll
  const heroImg = document.getElementById('hero-parallax');
  if (heroImg) {
    window.addEventListener('scroll', function() {
      const y = window.scrollY;
      heroImg.style.transform = `translate3d(0, ${y * 0.2}px, 0) scale(1.08)`;
    }, { passive: true });
  }

  // Hero mouse parallax
  const heroSection = document.getElementById('hero-section');
  if (heroSection && heroImg) {
    heroSection.addEventListener('mousemove', function(e) {
      const rect = heroSection.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      heroImg.style.transform = `translate3d(${x * 20}px, ${y * 15}px, 0) scale(1.08)`;
      const glow = document.getElementById('hero-glow');
      if (glow) glow.style.transform = `translate(calc(-50% + ${-x * 35}px), calc(-50% + ${-y * 35}px))`;
    });
    heroSection.addEventListener('mouseleave', function() {
      heroImg.style.transform = 'translate3d(0, 0, 0) scale(1.08)';
    });
  }
})();
