import requests

session = requests.Session()
# Setup CSRF
res = session.get('http://127.0.0.1:3000/en/checkout/')
csrftoken = session.cookies.get('csrftoken')

# Add to cart
session.post('http://127.0.0.1:3000/en/api/cart/add/', json={"slug": "hp-envy-x360-15", "quantity": 1})

# Checkout
checkout_data = {
    'csrfmiddlewaretoken': csrftoken,
    'full_name': 'Test User',
    'email': 'test@example.com',
    'phone': '+974 5555 5555',
    'zone': 'Doha',
    'city': 'Doha',
    'payment_method': 'cash',
}

res2 = session.post('http://127.0.0.1:3000/en/checkout/', data=checkout_data, allow_redirects=False)
print("Checkout status:", res2.status_code)
print("Redirect location:", res2.headers.get('Location'))

