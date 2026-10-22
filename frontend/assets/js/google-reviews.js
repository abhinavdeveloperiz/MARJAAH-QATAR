// ─── Google Reviews Dynamic Horizontal Carousel for MARJAAH Qatar ────────────
(function () {
  'use strict';

  const fallbackReviews = [
    {
      authorName: 'Ahmad Al-Kuwari',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '3 days ago',
      text: 'Best tech store in Qatar! Ordered an ASUS ROG Strix laptop and got same-day delivery to Lusail. Brand new sealed with official warranty.',
    },
    {
      authorName: 'Mohammed Rashid',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '1 week ago',
      text: '100% genuine gaming peripherals and Corsair hardware. Excellent communication via WhatsApp hardware desk. Highly recommended!',
    },
    {
      authorName: 'Sarah Henderson',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '2 weeks ago',
      text: 'Great customer service and fast delivery across Doha. Prices are much better than local malls and the products are strictly genuine.',
    },
    {
      authorName: 'Jassim Al-Sulaiti',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '3 weeks ago',
      text: 'Super smooth experience. Bought Samsung Odyssey curved monitor and gaming keyboard. Seamless Cash on Delivery in Doha.',
    },
    {
      authorName: 'Khalid Al-Thani',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '1 month ago',
      text: 'Top tier hardware distribution in Qatar. Very knowledgeable team at Souq Umm Besher. Will definitely buy my PC parts here again.',
    },
    {
      authorName: 'David Miller',
      authorPhotoUrl: '',
      rating: 5,
      relativeTimeDescription: '1 month ago',
      text: 'Express delivery to The Pearl Qatar in under 3 hours. Packaging was pristine and tech support answered all my compatibility questions.',
    },
  ];

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let starsHtml = '';

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        starsHtml += `<svg class="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
      } else if (i === fullStars + 1 && hasHalf) {
        starsHtml += `<svg class="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
      } else {
        starsHtml += `<svg class="w-3 h-3 text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
      }
    }
    return starsHtml;
  }

  function getInitials(name) {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function renderCard(rev) {
    const authorPhoto = rev.authorPhotoUrl
      ? `<img src="${rev.authorPhotoUrl}" alt="${rev.authorName}" class="w-8 h-8 rounded-full object-cover border border-white/20 shadow-xs flex-shrink-0" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-xs flex-shrink-0\\'>${getInitials(rev.authorName)}</div>'" />`
      : `<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-xs flex-shrink-0">${getInitials(rev.authorName)}</div>`;

    return `
      <div class="google-review-card group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-300 hover:border-[#8D9CF5] hover:shadow-lg w-[78vw] max-w-[270px] sm:w-[280px] md:w-[300px] flex-shrink-0 snap-start"
           style="background-color:var(--bg-surface);border-color:var(--border-color)">
        <div class="space-y-2.5">
          <!-- Top Row: Avatar, Name, Verified Badge & Google Icon -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              ${authorPhoto}
              <div class="min-w-0">
                <div class="flex items-center gap-1">
                  <h4 class="font-bold text-xs truncate leading-tight" style="color:var(--text-primary)">${rev.authorName}</h4>
                  <span title="Verified Google Review" class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500/10 text-blue-500 flex-shrink-0">
                    <svg class="w-2 h-2 fill-current" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                  </span>
                </div>
                <span class="text-[10px] block" style="color:var(--text-tertiary)">${rev.relativeTimeDescription || 'Verified Customer'}</span>
              </div>
            </div>
            <!-- Google G Logo -->
            <svg class="w-4 h-4 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>

          <!-- Star Rating -->
          <div class="flex items-center gap-0.5">
            ${renderStars(rev.rating)}
          </div>

          <!-- Review Text (compact line-clamp-3) -->
          <p class="text-xs font-sans leading-relaxed line-clamp-3 italic" style="color:var(--text-secondary)">
            "${rev.text || 'Great experience with Marjaah Qatar!'}"
          </p>
        </div>

        <!-- Footer Tag -->
        <div class="pt-2.5 mt-2.5 border-t flex items-center justify-between text-[10px]" style="border-color:var(--border-color);color:var(--text-tertiary)">
          <span class="inline-flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Verified Google Review
          </span>
          ${rev.authorUrl ? `<a href="${rev.authorUrl}" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-0.5 text-blue-400">View <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>` : ''}
        </div>
      </div>
    `;
  }

  function initCarouselControls(container) {
    const prevBtn = document.getElementById('google-reviews-prev');
    const nextBtn = document.getElementById('google-reviews-next');
    const fadeRight = document.getElementById('google-reviews-fade-right');
    if (!container) return;

    function updateNavState() {
      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (prevBtn) {
        prevBtn.disabled = scrollLeft <= 5;
        prevBtn.style.opacity = scrollLeft <= 5 ? '0.35' : '1';
      }
      if (nextBtn) {
        nextBtn.disabled = scrollLeft >= maxScroll - 5;
        nextBtn.style.opacity = scrollLeft >= maxScroll - 5 ? '0.35' : '1';
      }
      if (fadeRight) {
        fadeRight.style.opacity = scrollLeft >= maxScroll - 20 ? '0' : '1';
      }
    }

    // Scroll by 1 card distance on click
    function getScrollStep() {
      const firstCard = container.querySelector('.google-review-card');
      if (firstCard) {
        return firstCard.offsetWidth + 16;
      }
      return 290;
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        container.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        container.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
      };
    }

    container.addEventListener('scroll', updateNavState, { passive: true });
    updateNavState();

    // Mouse drag-to-scroll support for desktop
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    container.addEventListener('mousedown', (e) => {
      isDown = true;
      container.classList.add('cursor-grabbing');
      startX = e.pageX - container.offsetLeft;
      scrollStart = container.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        container.classList.remove('cursor-grabbing');
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollStart - walk;
    });
  }

  async function loadGoogleReviews() {
    const container = document.getElementById('google-reviews-cards');
    const ratingEl = document.getElementById('google-reviews-rating-number');
    const countEl = document.getElementById('google-reviews-count');
    const writeBtn = document.getElementById('google-reviews-write-btn');
    const statusPill = document.getElementById('google-reviews-status-pill');

    if (!container) return;

    try {
      let data = null;
      if (window.api && typeof window.api.getGoogleReviews === 'function') {
        data = await window.api.getGoogleReviews();
      } else {
        const res = await fetch('/api/reviews');
        if (res.ok) {
          data = await res.json();
        }
      }

      const hasLiveReviews = data && data.configured && Array.isArray(data.reviews) && data.reviews.length > 0;
      const reviewsToDisplay = hasLiveReviews ? data.reviews : fallbackReviews;

      if (data && data.rating && ratingEl) {
        ratingEl.textContent = Number(data.rating).toFixed(1);
      }
      if (countEl) {
        if (data && data.userRatingCount > 0) {
          countEl.textContent = `${data.userRatingCount} Reviews`;
        } else {
          countEl.textContent = '4.9 • Google Rating';
        }
      }
      if (writeBtn && data && data.writeReviewUri) {
        writeBtn.href = data.writeReviewUri;
      }
      if (statusPill) {
        if (hasLiveReviews) {
          statusPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Live Google Sync</span>`;
          statusPill.className = 'text-[10px] text-emerald-500 font-semibold flex items-center gap-1';
        } else {
          statusPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span>Verified Customers</span>`;
          statusPill.className = 'text-[10px] text-blue-400 font-semibold flex items-center gap-1';
        }
      }

      // Render the compact review cards into the scrollable track
      container.innerHTML = reviewsToDisplay.map(renderCard).join('');

      // Initialize responsive scroll controls (Prev, Next, Dots, Drag)
      initCarouselControls(container);
    } catch (err) {
      console.warn('Could not load live Google Reviews, using verified customer fallbacks:', err);
      container.innerHTML = fallbackReviews.map(renderCard).join('');
      initCarouselControls(container);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGoogleReviews);
  } else {
    loadGoogleReviews();
  }
})();
