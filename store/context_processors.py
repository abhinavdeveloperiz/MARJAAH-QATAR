import json
from .models import Category, Brand


def site_context(request):
    """Injects global site context into every template."""
    locale = 'ar' if request.path.startswith('/ar/') else 'en'
    is_rtl = (locale == 'ar')

    # Cart from session
    cart = request.session.get('cart', {})
    cart_count = sum(item['quantity'] for item in cart.values()) if cart else 0

    # Wishlist from session
    wishlist = request.session.get('wishlist', [])
    wishlist_count = len(wishlist)

    # Featured categories for nav
    featured_categories = Category.objects.filter(is_featured=True).order_by('order')[:6]

    # Nav links
    nav_links = [
        ('Home', f'/{locale}/'),
        ('Shop', f'/{locale}/shop/'),
        ('Offers', f'/{locale}/offers/'),
        ('About', f'/{locale}/about/'),
        ('Contact', f'/{locale}/contact/'),
    ]

    return {
        'locale': locale,
        'is_rtl': is_rtl,
        'cart_count': cart_count,
        'wishlist_count': wishlist_count,
        'cart_items': list(cart.values()),
        'featured_categories': featured_categories,
        'current_path': request.path,
        'nav_links': nav_links,
    }
