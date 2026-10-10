import os
import django
from django.test import Client
import shutil

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marjaah.settings')
django.setup()

def export_static_site():
    print("Starting static export for Firebase Hosting...")
    client = Client()
    
    # Create public directory
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)

    # Copy all static assets to public/static
    static_src = os.path.join(os.path.dirname(__file__), 'static')
    static_dest = os.path.join(public_dir, 'static')
    if os.path.exists(static_src):
        if os.path.exists(static_dest):
            shutil.rmtree(static_dest)
        shutil.copytree(static_src, static_dest)
        print("Copied static assets.")

    # List of routes to export
    routes = {
        '/': 'index.html',
        '/shop/': 'shop.html',
        '/cart/': 'cart.html',
        '/checkout/': 'checkout.html',
        '/login/': 'login.html',
        '/register/': 'register.html',
        '/account/': 'account.html',
        '/wishlist/': 'wishlist.html',
        '/about/': 'about.html',
        '/contact/': 'contact.html',
        '/offers/': 'offers.html',
    }

    for route, filename in routes.items():
        try:
            response = client.get(route)
            if response.status_code == 200:
                filepath = os.path.join(public_dir, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(response.content.decode('utf-8'))
                print(f"Exported {route} -> {filename}")
            else:
                print(f"Skipped {route} (Status: {response.status_code})")
        except Exception as e:
            print(f"Error exporting {route}: {e}")

    print(f"\nSuccess! Your static site is ready in the 'public' folder.")
    print("You can now run 'firebase deploy --only hosting' to deploy to Firebase Hosting!")

if __name__ == '__main__':
    export_static_site()
