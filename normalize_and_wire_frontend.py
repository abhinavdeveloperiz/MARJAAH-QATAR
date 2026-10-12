import os
import re

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), 'frontend')

def process_html_files():
    html_files = [f for f in os.listdir(FRONTEND_DIR) if f.endswith('.html')]
    print(f"Found {len(html_files)} HTML files to process.")

    url_replacements = [
        (r'href="/en/"', 'href="/index.html"'),
        (r'href="/ar/"', 'href="/index.html"'),
        (r'href="/en/shop/"', 'href="/shop.html"'),
        (r'href="/ar/shop/"', 'href="/shop.html"'),
        (r'href="/en/shop/([^"?/]+)/"', r'href="/shop.html?category=\1"'),
        (r'href="/ar/shop/([^"?/]+)/"', r'href="/shop.html?category=\1"'),
        (r'href="/en/shop/\?', 'href="/shop.html?'),
        (r'href="/ar/shop/\?', 'href="/shop.html?'),
        (r'href="/en/product/([^"?/]+)/"', r'href="/product.html?slug=\1"'),
        (r'href="/ar/product/([^"?/]+)/"', r'href="/product.html?slug=\1"'),
        (r'href="/en/cart/"', 'href="/cart.html"'),
        (r'href="/ar/cart/"', 'href="/cart.html"'),
        (r'href="/en/checkout/"', 'href="/checkout.html"'),
        (r'href="/ar/checkout/"', 'href="/checkout.html"'),
        (r'href="/en/auth/login/[^"]*"', 'href="/login.html"'),
        (r'href="/ar/auth/login/[^"]*"', 'href="/login.html"'),
        (r'href="/en/auth/register/[^"]*"', 'href="/register.html"'),
        (r'href="/ar/auth/register/[^"]*"', 'href="/register.html"'),
        (r'href="/en/auth/forgot-password/"', 'href="/forgot-password.html"'),
        (r'href="/ar/auth/forgot-password/"', 'href="/forgot-password.html"'),
        (r'href="/en/auth/logout/"', 'href="javascript:void(0)" onclick="if(window.api){window.api.clearAuth();}window.location.href=\'/login.html\';"'),
        (r'href="/ar/auth/logout/"', 'href="javascript:void(0)" onclick="if(window.api){window.api.clearAuth();}window.location.href=\'/login.html\';"'),
        (r'href="/en/account/"', 'href="/account.html"'),
        (r'href="/ar/account/"', 'href="/account.html"'),
        (r'href="/en/wishlist/"', 'href="/wishlist.html"'),
        (r'href="/ar/wishlist/"', 'href="/wishlist.html"'),
        (r'href="/en/about/"', 'href="/about.html"'),
        (r'href="/ar/about/"', 'href="/about.html"'),
        (r'href="/en/contact/"', 'href="/contact.html"'),
        (r'href="/ar/contact/"', 'href="/contact.html"'),
        (r'href="/en/offers/"', 'href="/offers.html"'),
        (r'href="/ar/offers/"', 'href="/offers.html"'),
        (r'href="/en/admin-dashboard/"', 'href="/admin-dashboard.html"'),
        (r'href="/ar/admin-dashboard/"', 'href="/admin-dashboard.html"'),
        (r'href="/admin/"', 'href="/admin-dashboard.html"'),
    ]

    for fname in html_files:
        fpath = os.path.join(FRONTEND_DIR, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Apply link replacements
        for pattern, repl in url_replacements:
            content = re.sub(pattern, repl, content)

        # Ensure api.js is in <head>
        if '/static/js/api.js' not in content and '</head>' in content:
            content = content.replace('</head>', '  <script src="/static/js/api.js"></script>\n</head>')

        # Ensure cart.js is before </body>
        if '/static/js/cart.js' not in content and '</body>' in content:
            content = content.replace('</body>', '  <script src="/static/js/cart.js"></script>\n</body>')

        # Remove raw csrf tokens
        content = re.sub(r'<input type="hidden" name="csrfmiddlewaretoken"[^>]*>', '', content)

        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Processed URLs & scripts in {fname}")

if __name__ == '__main__':
    process_html_files()
