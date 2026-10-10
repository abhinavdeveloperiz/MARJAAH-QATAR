import sqlite3
import urllib.request
import json

def migrate():
    conn = sqlite3.connect('db.sqlite3')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM store_product")
    products = cursor.fetchall()

    for row in products:
        images = []
        if row['images_json']:
            try:
                images = json.loads(row['images_json'])
            except:
                pass
        
        first_image = '/static/images/placeholder.svg'
        if row['primary_image']:
            first_image = '/media/' + row['primary_image'] if not row['primary_image'].startswith('http') else row['primary_image']
        elif images:
            first_image = images[0]

        payload = {
            'slug': row['slug'],
            'name': row['name'],
            'name_ar': row['name_ar'],
            'price': float(row['price']),
            'original_price': float(row['original_price']) if row['original_price'] else None,
            'category': str(row['category_id']),
            'brand': str(row['brand_id']),
            'in_stock': bool(row['in_stock']),
            'stock_count': row['stock_count'],
            'short_description': row['short_description'],
            'description': row['description'],
            'is_featured': bool(row['is_featured']),
            'first_image': first_image
        }

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request('http://localhost:3000/api/products', data=data, headers={'Content-Type': 'application/json'}, method='POST')
        
        try:
            with urllib.request.urlopen(req) as response:
                print(f"Migrated: {row['slug']} - Status: {response.getcode()}")
        except Exception as e:
            print(f"Error migrating {row['slug']}: {e}")

if __name__ == '__main__':
    migrate()
