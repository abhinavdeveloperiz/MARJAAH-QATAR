import requests

def get_product(slug):
    res = requests.get(f'http://localhost:3001/api/products/{slug}')
    return res.json()

print(get_product('hp-envy-x360-15'))
