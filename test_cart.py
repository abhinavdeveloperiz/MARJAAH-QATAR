import requests
import json
res = requests.post('http://127.0.0.1:3000/en/api/cart/add/', json={"slug": "hp-envy-x360-15", "quantity": 1})
print("STATUS:", res.status_code)
print("BODY:", res.text)
