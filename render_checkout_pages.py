import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marjaah.settings')
django.setup()

from django.template.loader import render_to_string
from django.test import RequestFactory
from store.forms import CheckoutForm
from store.translations import get_translations

rf = RequestFactory()
request = rf.get('/en/checkout/')
request.session = {}
request.user = type('User', (), {'is_authenticated': False})()

t = get_translations('en')

context_checkout = {
    'request': request,
    'locale': 'en',
    'is_rtl': False,
    'form': CheckoutForm(),
    'subtotal': 6499,
    'shipping': 0,
    'total': 6499,
    't': t,
}

rendered_checkout = render_to_string('checkout/checkout.html', context_checkout, request=request)
with open('frontend/checkout.html', 'w', encoding='utf-8') as f:
    f.write(rendered_checkout)
print("Rendered frontend/checkout.html successfully!")

class MockOrder:
    order_number = "MTQ-00001"
    status = "processing"
    get_status_display = "Processing"
    subtotal = 6499
    shipping = 0
    total = 6499
    delivery_address_display = "West Bay, Doha, Qatar"
    phone = "+974 5555 1234"
    payment_method = "cash"
    get_payment_method_display = "Cash on Delivery"
    notes = "Deliver after 5 PM"

context_success = {
    'request': request,
    'locale': 'en',
    'is_rtl': False,
    'order': MockOrder(),
    'order_items': [{
        'name': 'ASUS ROG Strix G16 Gaming Laptop',
        'image': '/static/images/products/asus-rog-g16.png',
        'quantity': 1,
        'price': 6499
    }],
    'total': 6499,
    't': t,
}

rendered_success = render_to_string('checkout/success.html', context_success, request=request)
with open('frontend/checkout-success.html', 'w', encoding='utf-8') as f:
    f.write(rendered_success)
print("Rendered frontend/checkout-success.html successfully!")
