async function loadProducts(containerId, queryParams = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const res = await fetch(`http://localhost:3000/api/products${queryParams}`);
    const data = await res.json();
    
    // Determine the array of products
    let products = [];
    if (Array.isArray(data)) {
        products = data;
    } else if (data.data && Array.isArray(data.data)) {
        products = data.data; // paginated response
    }

    if (products.length === 0) {
      container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-500">No products found.</div>`;
      return;
    }

    let html = '';
    const locale = window.location.pathname.startsWith('/ar/') ? 'ar' : 'en';
    const isRtl = locale === 'ar';

    products.forEach((product, index) => {
      const name = isRtl && product.name_ar ? product.name_ar : product.name;
      const price = product.price;
      const originalPrice = product.original_price;
      const image = product.image || '/static/images/placeholder.svg';
      const inStock = product.in_stock;
      const slug = product.slug || product.id;
      
      const badgeHtml = inStock 
        ? `<span class="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">${isRtl ? 'متوفر' : 'In Stock'}</span>`
        : `<span class="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">${isRtl ? 'غير متوفر' : 'Out of Stock'}</span>`;

      const actionHtml = inStock
        ? `<button data-add-to-cart="${slug}" class="btn-primary w-full justify-center text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            ${isRtl ? 'أضف إلى السلة' : 'Add to Cart'}
           </button>`
        : `<div class="text-xs text-center py-2.5 rounded-xl font-bold uppercase tracking-wider" style="background:var(--bg-surface-3);color:var(--text-tertiary)">
            ${isRtl ? 'نفذت الكمية' : 'Out of Stock'}
           </div>`;

      let priceHtml = `<span class="font-display font-black text-lg sm:text-xl" style="color:var(--text-primary)">
                         ${isRtl ? price + ' ر.ق' : 'QAR ' + price}
                       </span>`;
      if (originalPrice && originalPrice > price) {
        priceHtml += `<span class="text-xs line-through" style="color:var(--text-tertiary)">
                        ${isRtl ? originalPrice + ' ر.ق' : 'QAR ' + originalPrice}
                      </span>`;
      }

      html += `
      <div data-animate class="card group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300"
           style="background:var(--bg-surface);border:1px solid var(--border-color);transition-delay:${index}0ms">
        <a href="/${locale}/product/${slug}/" class="relative overflow-hidden block" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
          <img src="${image}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108" loading="lazy" onerror="this.src='/static/images/placeholder.svg'" />
        </a>
        <div class="p-4 flex flex-col flex-1">
          <div class="mb-1.5">
            <a href="/${locale}/product/${slug}/" class="block text-sm font-semibold leading-snug mt-1 line-clamp-2 transition-colors duration-200 hover:opacity-80" style="color:var(--text-primary)">
              ${name}
            </a>
          </div>
          <div class="flex items-center gap-1.5 mb-3">
            ${badgeHtml}
          </div>
          <div class="flex flex-wrap items-baseline gap-2 mb-4 mt-auto">
            ${priceHtml}
          </div>
          ${actionHtml}
        </div>
      </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Error fetching products from NestJS:', err);
    container.innerHTML = `<div class="col-span-full py-10 text-center text-rose-500">Failed to load products from Firebase API.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load products dynamically based on container IDs
  if (document.getElementById('featured-products-container')) {
    loadProducts('featured-products-container', '?limit=8');
  }
  if (document.getElementById('new-arrivals-container')) {
    loadProducts('new-arrivals-container', '?limit=8');
  }
  if (document.getElementById('shop-products-container')) {
    // Check URL parameters for filtering
    const searchParams = new URLSearchParams(window.location.search);
    const apiParams = new URLSearchParams();
    if(searchParams.has('search')) apiParams.set('search', searchParams.get('search'));
    if(searchParams.has('brand')) apiParams.set('brand', searchParams.get('brand'));
    
    // Get category from path if present (e.g. /en/shop/laptops/)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if(pathParts[1] === 'shop' && pathParts.length >= 3) {
      apiParams.set('category', pathParts[2]);
    }
    
    const query = apiParams.toString() ? '?' + apiParams.toString() : '';
    loadProducts('shop-products-container', query);
  }
});
