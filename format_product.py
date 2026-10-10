def enrich_product(p):
    p['first_image'] = p.get('first_image', p.get('image', '/static/images/placeholder.svg'))
    p['discount_percent'] = round((1 - float(p['price']) / float(p['original_price'])) * 100) if p.get('original_price') and p.get('original_price') > p['price'] else None
    p['star_range'] = range(1, 6)
    p['review_count'] = p.get('review_count', 0)
    p['rating'] = float(p.get('rating', 0.0))
    p['in_stock'] = p.get('in_stock', True)
    return p
