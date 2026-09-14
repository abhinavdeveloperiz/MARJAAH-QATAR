from django import template

register = template.Library()

@register.filter(name='split')
def split(value, arg=' '):
    """Splits a string by argument delimiter."""
    if not value:
        return []
    return [x.strip() for x in str(value).split(arg)]

@register.filter(name='get_item')
def get_item(dictionary, key):
    """Gets an item from a dictionary or dict-like object."""
    if isinstance(dictionary, dict):
        return dictionary.get(key)
    return None

@register.filter(name='range_filter')
def range_filter(number):
    """Returns a range for looping."""
    try:
        return range(int(number))
    except (ValueError, TypeError):
        return []

@register.filter(name='multiply')
def multiply(value, arg):
    """Multiplies value by arg."""
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return ''


@register.simple_tag
def get_admin_metrics():
    """Returns store key performance indicators for the admin dashboard."""
    try:
        from store.models import Order, Product, ContactMessage
        total_revenue = sum(o.total for o in Order.objects.filter(status__in=['confirmed', 'shipped', 'delivered']))
        active_orders = Order.objects.filter(status__in=['processing', 'confirmed', 'shipped']).count()
        total_orders = Order.objects.count()
        total_products = Product.objects.count()
        low_stock = Product.objects.filter(stock_count__lt=5, in_stock=True).count()
        new_messages = ContactMessage.objects.filter(status='new').count()
        total_messages = ContactMessage.objects.count()
        return {
            'revenue': total_revenue,
            'active_orders': active_orders,
            'total_orders': total_orders,
            'total_products': total_products,
            'low_stock': low_stock,
            'new_messages': new_messages,
            'total_messages': total_messages,
        }
    except Exception:
        return {
            'revenue': 0,
            'active_orders': 0,
            'total_orders': 0,
            'total_products': 0,
            'low_stock': 0,
            'new_messages': 0,
            'total_messages': 0,
        }
