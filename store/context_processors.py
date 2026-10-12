import json
from django.core.cache import cache
from .models import Category, Brand, Banner
from .translations import get_translations


def site_context(request):
    """Injects global site context into every template."""
    locale = 'ar' if request.path.startswith('/ar/') else 'en'
    is_rtl = (locale == 'ar')
    t = get_translations(locale)

    # Active banners (cached for 5 minutes)
    hero_banner = cache.get('site_hero_banner')
    if hero_banner is None:
        try:
            hero_banner = Banner.objects.filter(banner_type='hero', is_active=True).first()
            cache.set('site_hero_banner', hero_banner, 300)
        except Exception:
            hero_banner = None

    admin_banner = cache.get('site_admin_banner')
    if admin_banner is None:
        try:
            admin_banner = Banner.objects.filter(banner_type='admin', is_active=True).first()
            cache.set('site_admin_banner', admin_banner, 300)
        except Exception:
            admin_banner = None

    # Cart & Wishlist from session safely
    session = getattr(request, 'session', {})
    cart = session.get('cart', {}) if hasattr(session, 'get') else {}
    cart_count = sum(item['quantity'] for item in cart.values()) if cart else 0
    cart_subtotal = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in cart.values()) if cart else 0

    wishlist = session.get('wishlist', []) if hasattr(session, 'get') else []
    wishlist_count = len(wishlist)

    # Featured categories for nav (cached for 5 minutes)
    featured_categories = cache.get('site_featured_cats')
    if featured_categories is None:
        try:
            featured_categories = list(Category.objects.filter(is_featured=True).order_by('order')[:6])
            cache.set('site_featured_cats', featured_categories, 300)
        except Exception:
            featured_categories = []

    # Nav links localized
    nav_links = [
        (t.nav.home or ('الرئيسية' if is_rtl else 'Home'), f'/{locale}/'),
        (t.nav.shop or ('المتجر' if is_rtl else 'Shop'), f'/{locale}/shop/'),
        (t.nav.offers or ('العروض' if is_rtl else 'Offers'), f'/{locale}/offers/'),
        (t.nav.about or ('من نحن' if is_rtl else 'About'), f'/{locale}/about/'),
        (t.nav.contact or ('اتصل بنا' if is_rtl else 'Contact'), f'/{locale}/contact/'),
    ]

    # Home page check
    is_home = (request.path in [f'/{locale}/', f'/{locale}', '/', ''])

    return {
        'locale': locale,
        'is_rtl': is_rtl,
        'is_home': is_home,
        't': t,
        'currency': 'ر.ق' if is_rtl else 'QAR',
        'cart_count': cart_count,
        'cart_subtotal': cart_subtotal,
        'wishlist_count': wishlist_count,
        'cart_items': list(cart.values()),
        'featured_categories': featured_categories,
        'current_path': request.path,
        'nav_links': nav_links,
        'hero_banner': hero_banner,
        'admin_banner': admin_banner,
    }

