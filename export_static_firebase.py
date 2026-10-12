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
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    if not os.path.exists(frontend_dir):
        os.makedirs(frontend_dir)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin_user = User.objects.filter(is_superuser=True).first()
    if admin_user:
        client.force_login(admin_user)
        print(f"Logged in as admin: {admin_user.username}")

    # Set cart in session
    session = client.session
    session['cart'] = {
        'asus': {
            'slug': 'asus-rog-strix-g16-gaming-laptop',
            'name': 'ASUS ROG Strix G16',
            'price': 6499.0,
            'quantity': 1,
            'image': '/static/images/products/asus-rog-g16.png'
        }
    }
    session.save()

    from store.models import Order
    order = Order.objects.first()
    if order:
        order.user = admin_user
        order.save()
        order_id = order.pk
    else:
        order_id = 1

    routes = {
        '/en/checkout/': 'checkout.html',
        f'/en/checkout/success/{order_id}/': 'checkout-success.html',
    }

    for route, filename in routes.items():
        try:
            response = client.get(route)
            if response.status_code == 200:
                filepath = os.path.join(frontend_dir, filename)
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
