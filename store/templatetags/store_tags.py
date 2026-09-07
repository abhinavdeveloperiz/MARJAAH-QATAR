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
