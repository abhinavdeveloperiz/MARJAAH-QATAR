import json
import logging
import secrets
from datetime import timedelta
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.db.models import Q
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from .models import Product, Category, Brand, Address, Order, OrderItem, ContactMessage, User, Banner
from .forms import (LoginForm, RegisterForm, ForgotPasswordForm, SetNewPasswordForm,
                    AddressForm, CheckoutForm, ProfileForm, ContactForm)
from .fatoorah import execute_payment, get_payment_status, generate_qr_base64

logger = logging.getLogger(__name__)


def _get_locale(request):
    return 'ar' if request.path.startswith('/ar/') else 'en'


# ─── HOME ───────────────────────────────────────────────────────
def home(request):
    locale = _get_locale(request)
    featured = Product.objects.filter(is_featured=True, in_stock=True)[:8]
    new_arrivals = Product.objects.filter(is_new=True, in_stock=True)[:8]
    flash_deals = Product.objects.filter(is_on_sale=True, in_stock=True)[:6]
    categories = Category.objects.filter(is_featured=True).order_by('order')
    brands = Brand.objects.all()
    best_sellers = Product.objects.filter(is_best_seller=True, in_stock=True)[:4]
    hero_banner = Banner.objects.filter(banner_type='hero', is_active=True).first()
    return render(request, 'home/index.html', {
        'featured': featured,
        'new_arrivals': new_arrivals,
        'flash_deals': flash_deals,
        'categories': categories,
        'brands': brands,
        'best_sellers': best_sellers,
        'hero_banner': hero_banner,
        'locale': locale,
    })


import requests

class MockPageObj:
    def __init__(self, items, page, num_pages):
        self.object_list = items
        self.number = page
        self.num_pages = num_pages
    def __iter__(self):
        return iter(self.object_list)
    def has_previous(self): return self.number > 1
    def has_next(self): return self.number < self.num_pages
    def previous_page_number(self): return self.number - 1
    def next_page_number(self): return self.number + 1

class MockPaginator:
    def __init__(self, num_pages):
        self.num_pages = num_pages
        self.page_range = range(1, num_pages + 1) if num_pages > 0 else []

def _enrich_product(p):
    p['first_image'] = p.get('first_image') or p.get('image') or '/static/images/placeholder.svg'
    if p.get('original_price') and p.get('original_price') > p.get('price', 0):
        p['discount_percent'] = round((1 - float(p['price']) / float(p['original_price'])) * 100)
    else:
        p['discount_percent'] = None
    p['star_range'] = range(1, 6)
    p['review_count'] = p.get('review_count', 0)
    p['rating'] = float(p.get('rating', 0.0))
    p['in_stock'] = p.get('in_stock', True)
    
    # Mock related models for Django templates
    if 'brand' in p:
        p['brand'] = {'name': p.get('brand_name') or 'Brand'}
    return p

# ─── SHOP ───────────────────────────────────────────────────────
def shop(request, category_slug=None):
    locale = _get_locale(request)
    
    search = request.GET.get('search', '').strip()
    brand_filter = request.GET.get('brand', '')
    in_stock_only = request.GET.get('in_stock', '')
    on_sale = request.GET.get('on_sale', '')
    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    sort = request.GET.get('sort', 'featured')
    
    per_page_raw = request.GET.get('per_page', '8')
    try:
        per_page = int(per_page_raw)
        if per_page not in [8, 12, 16, 24, 48]: per_page = 8
    except (ValueError, TypeError):
        per_page = 8
        
    page_number = request.GET.get('page', 1)

    # Fetch from NestJS
    params = {
        'page': page_number,
        'per_page': per_page,
        'sort': sort
    }
    if search: params['search'] = search
    if brand_filter: params['brand'] = brand_filter
    if in_stock_only: params['in_stock'] = in_stock_only
    if on_sale: params['on_sale'] = on_sale
    if min_price: params['min_price'] = min_price
    if max_price: params['max_price'] = max_price

    category = None
    if category_slug:
        try:
            category = Category.objects.get(slug=category_slug)
            params['category'] = str(category.id)
        except Category.DoesNotExist:
            pass

    try:
        res = requests.get(f'{settings.NESTJS_API_URL}/api/products', params=params, timeout=5)
        data = res.json()
        items = [_enrich_product(p) for p in data.get('items', [])]
        total_count = data.get('total_count', 0)
        total_pages = data.get('total_pages', 1)
        current_page = data.get('page', 1)
    except Exception as e:
        print(f"NestJS API Error: {e}")
        items = []
        total_count = 0
        total_pages = 1
        current_page = 1

    all_brands = Brand.objects.all()
    all_categories = Category.objects.filter(is_featured=True)

    page_obj = MockPageObj(items, current_page, total_pages)
    paginator = MockPaginator(total_pages)

    # Preserve query string (without 'page') for pagination links
    query_dict = request.GET.copy()
    if 'page' in query_dict:
        del query_dict['page']
    extra_query = query_dict.urlencode()
    if extra_query:
        extra_query = '&' + extra_query

    return render(request, 'shop/shop.html', {
        'products': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'category': category,
        'all_brands': all_brands,
        'all_categories': all_categories,
        'search': search,
        'current_sort': sort,
        'current_brand': brand_filter,
        'locale': locale,
        'total_count': total_count,
        'per_page': per_page,
        'extra_query': extra_query,
    })


import requests

# ─── PRODUCT DETAIL ─────────────────────────────────────────────
def product_detail(request, slug):
    locale = _get_locale(request)
    
    # Fetch from NestJS Firebase API
    try:
        api_res = requests.get(f'{settings.NESTJS_API_URL}/api/products/{slug}')
        if api_res.status_code == 200:
            product_data = api_res.json()
        else:
            product_data = None
    except Exception as e:
        logger.error(f"Error fetching product from NestJS: {e}")
        product_data = None
        
    if not product_data:
        # Fallback to local 404 if API fails
        from django.http import Http404
        raise Http404("Product not found")

    # Map Firebase product data to an object-like dictionary for the template
    class MockProduct:
        def __init__(self, data):
            self.id = data.get('id', '')
            self.slug = data.get('slug', data.get('id', ''))
            self.name = data.get('name', '')
            self.name_ar = data.get('name_ar', self.name)
            self.price = float(data.get('price', 0))
            self.original_price = data.get('original_price')
            if self.original_price: self.original_price = float(self.original_price)
            self.first_image = data.get('image', data.get('first_image', '/static/images/placeholder.svg'))
            self.images = [self.first_image] # can expand if more images in db
            self.brand = type('MockBrand', (), {'name': data.get('brand', '')}) if data.get('brand') else None
            self.category = type('MockCat', (), {'name': data.get('category', ''), 'name_ar': data.get('category', '')}) if data.get('category') else None
            self.rating = data.get('rating', 0)
            self.review_count = data.get('review_count', 0)
            self.star_range = range(1, 6)
            self.short_description = data.get('short_description', '')
            self.short_description_ar = data.get('short_description_ar', '')
            self.description = data.get('description', '')
            self.description_ar = data.get('description_ar', '')
            self.in_stock = data.get('in_stock', True)
            self.stock_count = data.get('stock_count', None)
            self.delivery_days = data.get('delivery_days', None)
            self.warranty_months = data.get('warranty_months', None)
            self.specifications = data.get('specifications', [])
            self.sku = data.get('sku', '')

    product = MockProduct(product_data)
    
    # Try fetching related products from API
    related = []
    try:
        rel_res = requests.get(f'{settings.NESTJS_API_URL}/api/products?limit=4&category={product_data.get("category","")}')
        if rel_res.status_code == 200:
            rel_data = rel_res.json()
            items = rel_data if isinstance(rel_data, list) else rel_data.get('items', [])
            related = [MockProduct(item) for item in items if item.get('slug') != slug][:4]
    except Exception:
        pass

    wishlist = request.session.get('wishlist', [])
    in_wishlist = product.slug in wishlist
    return render(request, 'shop/product_detail.html', {
        'product': product,
        'related': related,
        'in_wishlist': in_wishlist,
        'locale': locale,
    })


# ─── CART ───────────────────────────────────────────────────────
def cart_view(request):
    locale = _get_locale(request)
    
    cart = request.session.get('cart', {})
    items = list(cart.values())

    subtotal = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items)
    shipping = 0 if subtotal >= 500 else 20
    if len(items) == 0:
        shipping = 0
    total = subtotal + shipping

    # Support AJAX partial render for cart drawer refresh
    if request.GET.get('partial') == '1':
        return render(request, 'partials/cart_drawer_partial.html', {
            'cart_items': items,
            'subtotal': subtotal,
            'shipping': shipping,
            'total': total,
            'locale': locale,
        })

    return render(request, 'cart/cart.html', {
        'cart_items': items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'locale': locale,
    })


from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@require_POST
def cart_add(request):
    data = json.loads(request.body)
    product_slug = data.get('slug')
    
    # Fetch product from NestJS API instead of SQLite
    try:
        res = requests.get(f'{settings.NESTJS_API_URL}/api/products/{product_slug}', timeout=5)
        if res.status_code == 404:
            return JsonResponse({'success': False, 'error': 'Product not found.'}, status=404)
        product_data = _enrich_product(res.json())
    except Exception as e:
        logger.error(f"Error fetching product for cart: {e}")
        return JsonResponse({'success': False, 'error': 'Failed to add to cart.'}, status=500)

    # Validate stock before adding
    in_stock = product_data.get('in_stock', True)
    if not in_stock:
        return JsonResponse({'success': False, 'error': 'This product is currently out of stock.'}, status=400)

    cart = request.session.get('cart', {})
    qty_to_add = data.get('quantity', 1)

    # Check stock quantity if tracked
    stock_count = product_data.get('stock_count')
    if stock_count is not None:
        current_qty = cart.get(product_slug, {}).get('quantity', 0)
        if (current_qty + qty_to_add) > stock_count:
            return JsonResponse({
                'success': False,
                'error': f'Only {stock_count} unit(s) available in stock.'
            }, status=400)

    if product_slug in cart:
        cart[product_slug]['quantity'] += qty_to_add
    else:
        brand_name = product_data.get('brand_name') or (product_data.get('brand', {}).get('name') if isinstance(product_data.get('brand'), dict) else product_data.get('brand'))
        cart[product_slug] = {
            'slug': product_slug,
            'name': product_data.get('name', ''),
            'name_ar': product_data.get('name_ar', ''),
            'price': float(product_data.get('price', 0)),
            'original_price': float(product_data.get('original_price')) if product_data.get('original_price') else None,
            'image': product_data.get('first_image', ''),
            'brand': brand_name or '',
            'quantity': qty_to_add,
        }
    request.session['cart'] = cart
    request.session.modified = True
    cart_count = sum(i['quantity'] for i in cart.values())
    return JsonResponse({'success': True, 'cart_count': cart_count})


@csrf_exempt
@require_POST
def cart_update(request):
    data = json.loads(request.body)
    slug = data.get('slug')
    qty = int(data.get('quantity', 1))
    cart = request.session.get('cart', {})

    if slug in cart:
        if qty <= 0:
            del cart[slug]
        else:
            # Validate against stock
            try:
                product = Product.objects.get(slug=slug)
                if product.stock_count is not None and qty > product.stock_count:
                    qty = product.stock_count
            except Product.DoesNotExist:
                pass
            cart[slug]['quantity'] = qty

    request.session['cart'] = cart
    request.session.modified = True
    cart_count = sum(i['quantity'] for i in cart.values())
    subtotal = sum(i['price'] * i['quantity'] for i in cart.values())
    return JsonResponse({'success': True, 'cart_count': cart_count, 'subtotal': subtotal})


@csrf_exempt
@require_POST
def cart_remove(request):
    data = json.loads(request.body)
    slug = data.get('slug')
    cart = request.session.get('cart', {})
    cart.pop(slug, None)
    request.session['cart'] = cart
    request.session.modified = True
    cart_count = sum(i['quantity'] for i in cart.values())
    return JsonResponse({'success': True, 'cart_count': cart_count})


# ─── WISHLIST ───────────────────────────────────────────────────
def wishlist_view(request):
    locale = _get_locale(request)
    wishlist_slugs = request.session.get('wishlist', [])
    products = Product.objects.filter(slug__in=wishlist_slugs)
    return render(request, 'wishlist/wishlist.html', {
        'products': products,
        'locale': locale,
    })


@require_POST
def wishlist_toggle(request):
    data = json.loads(request.body)
    slug = data.get('slug')
    wishlist = request.session.get('wishlist', [])
    if slug in wishlist:
        wishlist.remove(slug)
        in_wishlist = False
    else:
        wishlist.append(slug)
        in_wishlist = True
    request.session['wishlist'] = wishlist
    request.session.modified = True
    return JsonResponse({'success': True, 'in_wishlist': in_wishlist, 'wishlist_count': len(wishlist)})


# ─── CHECKOUT ───────────────────────────────────────────────────
def checkout_view(request):
    locale = _get_locale(request)
    cart = request.session.get('cart', {})
    items = list(cart.values())
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    shipping = 0 if subtotal >= 500 else 20
    total = subtotal + shipping

    if not items:
        return redirect(f'/{locale}/')

    # Purchase requires sign in / sign up
    if not request.user.is_authenticated:
        return redirect(f'/{locale}/auth/login/?next=/{locale}/checkout/')

    # Validate stock availability before showing checkout
    stock_errors = []
    for item in items:
        try:
            res = requests.get(f"{settings.NESTJS_API_URL}/api/products/{item['slug']}", timeout=5)
            if res.status_code == 404:
                stock_errors.append(f"'{item['name']}' is no longer available.")
            else:
                product_data = res.json()
                if not product_data.get('in_stock', True):
                    stock_errors.append(f"'{item['name']}' is no longer in stock.")
                else:
                    stock_count = product_data.get('stock_count')
                    if stock_count is not None and item['quantity'] > stock_count:
                        stock_errors.append(
                            f"Only {stock_count} unit(s) of '{item['name']}' are available."
                        )
        except Exception:
            pass # Ignore API timeout/errors for stock check to prevent blocking checkout

    # Pre-fill user data & default address
    default_address = request.user.addresses.filter(is_default=True).first() or request.user.addresses.first()
    initial_data = {
        'full_name': request.user.get_full_name() or request.user.username,
        'email': request.user.email,
        'phone': getattr(request.user, 'phone', ''),
    }
    if default_address:
        initial_data.update({
            'full_name': default_address.full_name or initial_data['full_name'],
            'phone': default_address.phone or initial_data['phone'],
            'building': default_address.building,
            'street': default_address.street,
            'zone': default_address.zone,
            'city': default_address.city,
        })

    form = CheckoutForm(initial=initial_data)
    saved_addresses = request.user.addresses.all()

    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid() and not stock_errors:
            cd = form.cleaned_data

            # Build delivery address snapshot (works for both guests and members)
            delivery_data = {
                'delivery_full_name': cd['full_name'],
                'delivery_phone': cd['phone'],
                'delivery_building': cd.get('building', ''),
                'delivery_street': cd.get('street', ''),
                'delivery_zone': cd['zone'],
                'delivery_city': cd['city'],
                'delivery_country': 'Qatar',
            }

            # For logged-in users, also save a proper Address record
            addr = None
            if request.user.is_authenticated:
                addr = Address.objects.create(
                    user=request.user,
                    label='Order',
                    full_name=cd['full_name'],
                    phone=cd['phone'],
                    building=cd.get('building', ''),
                    street=cd.get('street', ''),
                    zone=cd['zone'],
                    city=cd['city'],
                )

            # Format payment details cleanly for records
            pm = cd['payment_method']
            pm_detail = ''
            if pm in ('card', 'fatoorah'):
                pm_detail = "[Online Payment: Credit / Debit Card / Apple Pay via MyFatoorah]"
            elif pm in ('qr', 'qpay'):
                pm_detail = "[Online Payment: QR Code / Mobile Scan via MyFatoorah]"
            elif pm == 'cash':
                change_req = cd.get('cash_change_req', '').strip()
                if change_req:
                    pm_detail = f"[Cash On Delivery - Change requested for: {change_req}]"

            user_notes = cd.get('notes', '').strip()
            final_notes = f"{pm_detail}\n{user_notes}".strip() if pm_detail else user_notes

            initial_payment_status = 'pending' if pm in ('card', 'fatoorah', 'qr', 'qpay') else 'cod'
            initial_order_status = 'pending' if pm in ('card', 'fatoorah', 'qr', 'qpay') else 'placed'

            # Create the Order — works for both guests and members
            order = Order.objects.create(
                user=request.user if request.user.is_authenticated else None,
                guest_name='' if request.user.is_authenticated else cd['full_name'],
                guest_email='' if request.user.is_authenticated else cd.get('email', ''),
                guest_phone='' if request.user.is_authenticated else cd['phone'],
                items_json=json.dumps(items),  # legacy snapshot
                subtotal=subtotal,
                shipping=shipping,
                total=total,
                address=addr,
                payment_method=cd['payment_method'],
                payment_status=initial_payment_status,
                status=initial_order_status,
                notes=final_notes,
                **delivery_data,
            )

            # Sync to Firestore via NestJS API
            try:
                firestore_user_id = ""
                if request.user.is_authenticated:
                    # Look up correct Firestore User ID by email
                    login_res = requests.post(f"{settings.NESTJS_API_URL}/api/users/login", json={'email': request.user.email}, timeout=3)
                    if login_res.status_code == 200:
                        login_data = login_res.json()
                        if login_data.get('success'):
                            firestore_user_id = login_data['user'].get('id', '')

                firestore_order = {
                    'id': order.order_number,
                    'customer_name': order.customer_name,
                    'customer_email': order.customer_email,
                    'customer_phone': order.customer_phone,
                    'subtotal': float(order.subtotal),
                    'shipping': float(order.shipping),
                    'total': float(order.total),
                    'payment_method': order.payment_method,
                    'payment_status': order.payment_status,
                    'status': order.status,
                    'notes': order.notes,
                    'items': items,
                    'delivery_address': order.delivery_address_display
                }
                user_param = f"?userId={firestore_user_id}" if firestore_user_id else ""
                requests.post(f"{settings.NESTJS_API_URL}/api/orders{user_param}", json=firestore_order, timeout=5)
            except Exception as e:
                logger.error(f"Failed to sync order {order.order_number} to Firestore: {e}")


            # Create relational OrderItem records
            for item in items:
                try:
                    OrderItem.objects.create(
                        order=order,
                        product=None, # Firestore products aren't stored in local SQLite db
                        product_slug=item['slug'],
                        product_name=item['name'],
                        product_name_ar=item.get('name_ar', ''),
                        product_brand=item.get('brand', ''),
                        product_image=item.get('image', ''),
                        unit_price=item['price'],
                        original_price=item.get('original_price'),
                        quantity=item['quantity'],
                    )
                except Product.DoesNotExist:
                    logger.warning(f"Product {item['slug']} not found during order creation.")

            # If online payment via MyFatoorah (Card or QR Code scan), initiate payment session
            if pm in ('card', 'fatoorah', 'qr', 'qpay'):
                domain = request.build_absolute_uri('/')[:-1]
                callback_url = f"{domain}/{locale}/checkout/fatoorah/callback/"
                error_url = f"{domain}/{locale}/checkout/fatoorah/error/?order_id={order.pk}"

                fatoorah_res = execute_payment(
                    order=order,
                    callback_url=callback_url,
                    error_url=error_url,
                    language=locale
                )

                if fatoorah_res.get('success'):
                    order.fatoorah_invoice_id = str(fatoorah_res.get('invoice_id', ''))
                    order.fatoorah_gateway_link = fatoorah_res.get('payment_url', '')
                    order.save(update_fields=['fatoorah_invoice_id', 'fatoorah_gateway_link'])
                    request.session['pending_order_id'] = order.pk
                    if pm in ('qr', 'qpay'):
                        return redirect(f'/{locale}/checkout/qr/{order.pk}/')
                    else:
                        return redirect(fatoorah_res['payment_url'])
                else:
                    order.payment_status = 'failed'
                    order.save(update_fields=['payment_status'])
                    err_msg = fatoorah_res.get('error') or "Unable to initiate payment with MyFatoorah gateway."
                    logger.error(f"MyFatoorah initiation error for Order #{order.pk}: {err_msg}")
                    messages.error(request, f"Payment Gateway Error: {err_msg}")
                    return redirect(f'/{locale}/checkout/')

            # For Cash on Delivery or offline payments:
            # Deduct stock immediately
            for item in items:
                try:
                    product = Product.objects.get(slug=item['slug'])
                    if product.stock_count is not None:
                        product.stock_count = max(0, product.stock_count - item['quantity'])
                        if product.stock_count == 0:
                            product.in_stock = False
                        product.save(update_fields=['stock_count', 'in_stock'])
                except Product.DoesNotExist:
                    pass

            # Clear cart
            request.session['cart'] = {}
            request.session.modified = True

            # Send order confirmation email if email provided
            customer_email = (request.user.email if request.user.is_authenticated else cd.get('email', ''))
            if customer_email:
                try:
                    send_mail(
                        subject=f'Order Confirmed — {order.order_number} | M.SHOP Qatar',
                        message=render_to_string('emails/order_confirmation.txt', {
                            'order': order,
                            'items': order.items,
                        }),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[customer_email],
                        fail_silently=True,
                    )
                except Exception as e:
                    logger.error(f"Order confirmation email failed: {e}")

            return redirect(f'/{locale}/checkout/success/{order.pk}/')

    return render(request, 'checkout/checkout.html', {
        'form': form,
        'cart_items': items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'saved_addresses': saved_addresses,
        'stock_errors': stock_errors,
        'locale': locale,
    })


def checkout_qr_view(request, order_pk):
    """
    Renders the dedicated Qatar Dynamic QR Code Payment screen for an order.
    Displays a high-resolution dynamic QR Code linked to the MyFatoorah gateway invoice.
    """
    locale = _get_locale(request)
    order = get_object_or_404(Order, pk=order_pk)

    # Security check: ensure user owns order or is in active session
    if order.user and request.user.is_authenticated and order.user != request.user:
        return redirect(f'/{locale}/')

    # If already paid, redirect straight to success page
    if order.payment_status == 'paid':
        return redirect(f'/{locale}/checkout/success/{order.pk}/')

    payment_url = order.fatoorah_gateway_link
    if not payment_url:
        domain = request.build_absolute_uri('/')[:-1]
        callback_url = f"{domain}/{locale}/checkout/fatoorah/callback/"
        error_url = f"{domain}/{locale}/checkout/fatoorah/error/?order_id={order.pk}"
        fatoorah_res = execute_payment(
            order=order,
            callback_url=callback_url,
            error_url=error_url,
            language=locale
        )
        if fatoorah_res.get('success'):
            payment_url = fatoorah_res['payment_url']
            order.fatoorah_invoice_id = str(fatoorah_res.get('invoice_id', ''))
            order.fatoorah_gateway_link = payment_url
            order.save(update_fields=['fatoorah_invoice_id', 'fatoorah_gateway_link'])

    qr_base64 = generate_qr_base64(payment_url) if payment_url else ''

    return render(request, 'checkout/payment_qr.html', {
        'order': order,
        'payment_url': payment_url,
        'qr_base64': qr_base64,
        'total': order.total,
        'locale': locale,
        'is_rtl': locale == 'ar',
    })


def order_status_check_api(request, order_pk):
    """
    AJAX endpoint called periodically by the QR payment screen to check
    whether the customer has completed payment on their mobile device.
    """
    locale = _get_locale(request)
    order = Order.objects.filter(pk=order_pk).first()
    if not order:
        return JsonResponse({'paid': False, 'error': 'Order not found'}, status=404)

    if order.payment_status == 'paid':
        return JsonResponse({
            'paid': True,
            'redirect_url': f'/{locale}/checkout/success/{order.pk}/'
        })

    # If pending, query MyFatoorah gateway server-to-server to check if customer paid
    invoice_id = order.fatoorah_invoice_id
    if invoice_id:
        status_res = get_payment_status(invoice_id, key_type="InvoiceId")
        if status_res.get('success') and status_res.get('is_paid'):
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.fatoorah_payment_id = str(status_res.get('invoice_id', ''))
            order.fatoorah_transaction_id = str(status_res.get('transaction_id', ''))
            order.payment_response_json = json.dumps(status_res.get('raw', {}))
            order.save(update_fields=['payment_status', 'status', 'fatoorah_payment_id', 'fatoorah_transaction_id', 'payment_response_json'])

            # Deduct stock for confirmed order
            for item in order.order_items.all():
                if item.product and item.product.stock_count is not None:
                    item.product.stock_count = max(0, item.product.stock_count - item.quantity)
                    if item.product.stock_count == 0:
                        item.product.in_stock = False
                    item.product.save(update_fields=['stock_count', 'in_stock'])

            # Clear cart from session
            request.session['cart'] = {}
            request.session.modified = True

            return JsonResponse({
                'paid': True,
                'redirect_url': f'/{locale}/checkout/success/{order.pk}/'
            })

    return JsonResponse({
        'paid': False,
        'status': order.status,
        'payment_status': order.payment_status
    })


def checkout_success(request, order_pk):
    """Display order confirmation page."""
    locale = _get_locale(request)
    order = get_object_or_404(Order, pk=order_pk)

    # Security: only show to the order owner or guest who just placed it
    if order.user and request.user.is_authenticated and order.user != request.user:
        return redirect(f'/{locale}/')

    return render(request, 'checkout/success.html', {
        'order': order,
        'locale': locale,
        'total': order.total,
        'order_items': order.items,
    })


def fatoorah_callback_view(request):
    """
    Handles customer return from MyFatoorah after completing online payment.
    Query parameters provided by gateway: ?paymentId=... (or ?Id=...)
    """
    locale = _get_locale(request)
    payment_id = request.GET.get('paymentId') or request.GET.get('Id')

    if not payment_id:
        messages.error(request, "No payment identifier received from the payment gateway.")
        return redirect(f'/{locale}/checkout/')

    # Query MyFatoorah API server-to-server to verify genuine status
    status_res = get_payment_status(payment_id, key_type="PaymentId")
    if not status_res.get('success'):
        logger.error(f"MyFatoorah verification failed for PaymentId {payment_id}: {status_res.get('error')}")
        messages.error(request, "Could not verify payment status with MyFatoorah. Please contact support.")
        return redirect(f'/{locale}/checkout/')

    raw_data = status_res.get('raw', {})
    cust_ref = raw_data.get('CustomerReference')
    invoice_id = status_res.get('invoice_id')
    is_paid = status_res.get('is_paid')
    amount_paid = status_res.get('amount')
    tx_id = status_res.get('transaction_id')

    # Match order via CustomerReference (Order PK) or invoice_id or session
    order = None
    if cust_ref:
        try:
            order = Order.objects.filter(pk=int(cust_ref)).first()
        except (ValueError, TypeError):
            pass
    if not order and invoice_id:
        order = Order.objects.filter(fatoorah_invoice_id=str(invoice_id)).first()
    if not order:
        pending_id = request.session.get('pending_order_id')
        if pending_id:
            order = Order.objects.filter(pk=pending_id).first()

    if not order:
        logger.error(f"Order not found for MyFatoorah callback: cust_ref={cust_ref}, invoice_id={invoice_id}")
        messages.error(request, "Order record could not be matched. If debited, please contact store support.")
        return redirect(f'/{locale}/')

    # Security check: verify paid amount matches order total (tolerance 0.10 QAR)
    if abs(float(order.total) - float(amount_paid)) > 0.10:
        logger.error(f"Payment amount mismatch for Order #{order.pk}: expected {order.total}, paid {amount_paid}")
        messages.error(request, "Security alert: Paid amount did not match order total.")
        return redirect(f'/{locale}/')

    if is_paid:
        # Idempotency check: process order confirmation only once
        if order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.status = 'placed'
            order.fatoorah_payment_id = str(payment_id)
            order.fatoorah_transaction_id = str(tx_id)
            order.payment_response_json = json.dumps(raw_data)
            order.save()

            # Sync payment success to Firestore
            try:
                requests.post(f"{settings.NESTJS_API_URL}/api/orders/{order.order_number}", json={
                    'payment_status': 'paid',
                    'status': 'placed',
                    'fatoorah_payment_id': order.fatoorah_payment_id
                }, timeout=5)
            except Exception as e:
                logger.error(f"Failed to update Firestore order {order.order_number}: {e}")


            # Deduct stock for the confirmed order
            for item in order.order_items.all():
                if item.product and item.product.stock_count is not None:
                    item.product.stock_count = max(0, item.product.stock_count - item.quantity)
                    if item.product.stock_count == 0:
                        item.product.in_stock = False
                    item.product.save(update_fields=['stock_count', 'in_stock'])

            # Send confirmation email
            customer_email = order.customer_email
            if customer_email:
                try:
                    send_mail(
                        subject=f'Payment Confirmed — {order.order_number} | M.SHOP Qatar',
                        message=render_to_string('emails/order_confirmation.txt', {
                            'order': order,
                            'items': order.items,
                        }),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[customer_email],
                        fail_silently=True,
                    )
                except Exception as exc:
                    logger.error(f"Order confirmation email failed: {exc}")

        # Clear cart and pending session
        request.session['cart'] = {}
        request.session.pop('pending_order_id', None)
        request.session.modified = True

        return redirect(f'/{locale}/checkout/success/{order.pk}/')
    else:
        # Payment was declined, failed, or cancelled by user
        order.payment_status = 'failed'
        order.fatoorah_payment_id = str(payment_id)
        order.payment_response_json = json.dumps(raw_data)
        order.save(update_fields=['payment_status', 'fatoorah_payment_id', 'payment_response_json'])

        return redirect(f'/{locale}/checkout/fatoorah/error/?order_id={order.pk}')


def fatoorah_error_view(request):
    """
    Displays payment failure page and allows customer to retry without losing cart.
    """
    locale = _get_locale(request)
    order_id = request.GET.get('order_id')
    error_msg = request.GET.get('msg') or (
        "تم إلغاء عملية الدفع أو رفضها من البنك المصدر للبطاقة. لم يتم خصم أي مبلغ."
        if locale == 'ar'
        else "The payment was cancelled or declined by the issuing bank. No funds have been deducted."
    )

    order = None
    if order_id:
        try:
            order = Order.objects.filter(pk=int(order_id)).first()
        except (ValueError, TypeError):
            pass

    if order and order.payment_status != 'paid':
        order.payment_status = 'failed'
        order.save(update_fields=['payment_status'])

    return render(request, 'checkout/payment_error.html', {
        'order': order,
        'locale': locale,
        'error_message': error_msg,
    })


@csrf_exempt
@require_POST
def fatoorah_webhook_view(request):
    """
    Instant Payment Notification (IPN) webhook handler.
    Receives async event notifications directly from MyFatoorah servers.
    """
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'status': 'invalid json'}, status=400)

    event_type = payload.get('Event')
    data = payload.get('Data', {})
    invoice_id = data.get('InvoiceId')
    payment_id = data.get('PaymentId')

    logger.info(f"MyFatoorah IPN Webhook: Event={event_type}, InvoiceId={invoice_id}, PaymentId={payment_id}")

    if payment_id:
        status_res = get_payment_status(payment_id, key_type="PaymentId")
        if status_res.get('success') and status_res.get('is_paid'):
            cust_ref = status_res.get('raw', {}).get('CustomerReference')
            order = None
            if cust_ref:
                try:
                    order = Order.objects.filter(pk=int(cust_ref)).first()
                except Exception:
                    pass
            if not order and invoice_id:
                order = Order.objects.filter(fatoorah_invoice_id=str(invoice_id)).first()

            if order and order.payment_status != 'paid':
                order.payment_status = 'paid'
                order.status = 'placed'
                order.fatoorah_payment_id = str(payment_id)
                order.fatoorah_transaction_id = str(status_res.get('transaction_id', ''))
                order.payment_response_json = json.dumps(status_res.get('raw', {}))
                order.save()

                # Sync webhook payment success to Firestore
                try:
                    requests.post(f"{settings.NESTJS_API_URL}/api/orders/{order.order_number}", json={
                        'payment_status': 'paid',
                        'status': 'placed',
                        'fatoorah_payment_id': order.fatoorah_payment_id
                    }, timeout=5)
                except Exception as e:
                    logger.error(f"Failed to update Firestore order {order.order_number} via webhook: {e}")

                for item in order.order_items.all():
                    if item.product and item.product.stock_count is not None:
                        item.product.stock_count = max(0, item.product.stock_count - item.quantity)
                        if item.product.stock_count == 0:
                            item.product.in_stock = False
                        item.product.save(update_fields=['stock_count', 'in_stock'])

    return JsonResponse({'status': 'received'})


# ─── AUTH ────────────────────────────────────────────────────────
def login_view(request):
    locale = _get_locale(request)
    next_url = request.POST.get('next') or request.GET.get('next') or f'/{locale}/'
    if request.user.is_authenticated:
        return redirect(next_url)
    form = LoginForm()
    error = None
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            try:
                api_res = requests.post(f'{settings.NESTJS_API_URL}/api/users/login', json={'email': email, 'password': password})
                if api_res.status_code in [200, 201]:
                    data = api_res.json()
                    if data.get('success'):
                        fb_user = data.get('user', {})
                        # Create or get shadow user
                        user, created = User.objects.get_or_create(username=email)
                        if created:
                            user.email = email
                            user.set_unusable_password()
                        if fb_user.get('name'):
                            user.first_name = fb_user.get('name')
                        user.save()
                        user.backend = 'django.contrib.auth.backends.ModelBackend'
                        login(request, user)
                        request.session['firebase_id'] = fb_user.get('id')
                        return redirect(next_url)
                    else:
                        error = 'Invalid credentials.' if locale != 'ar' else 'بيانات الاعتماد غير صحيحة.'
                else:
                    error = 'Server error during login.'
            except Exception as e:
                logger.error(f"Error authenticating with NestJS: {e}")
                error = 'Server error during login.'
    return render(request, 'auth/login.html', {'form': form, 'error': error, 'locale': locale, 'next': next_url})


def register_view(request):
    locale = _get_locale(request)
    next_url = request.POST.get('next') or request.GET.get('next') or f'/{locale}/'
    if request.user.is_authenticated:
        return redirect(next_url)
    form = RegisterForm()
    error = None
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            cd = form.cleaned_data
            email = cd['email'].strip().lower()
            if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
                error = 'An account with this email already exists.' if locale != 'ar' else 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.'
            else:
                names = cd['full_name'].strip().split(' ', 1)
                first_name = names[0]
                last_name = names[1] if len(names) > 1 else ''
                
                # Register in Firebase via NestJS
                import uuid
                new_id = str(uuid.uuid4())
                try:
                    reg_res = requests.post(f'{settings.NESTJS_API_URL}/api/users/{new_id}', json={
                        'email': email,
                        'password': cd['password'],
                        'name': cd['full_name']
                    })
                except Exception as e:
                    logger.error(f"Error registering with NestJS: {e}")
                    
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=cd['password'],
                    first_name=first_name,
                    last_name=last_name,
                    phone=cd.get('phone', ''),
                )
                login(request, user)
                welcome_msg = 'Welcome to M.SHOP Qatar! Your account has been created.' if locale != 'ar' else 'مرحباً بك في متجر M.SHOP! تم إنشاء حسابك بنجاح.'
                messages.success(request, welcome_msg)
                return redirect(next_url)
    return render(request, 'auth/register.html', {'form': form, 'error': error, 'locale': locale, 'next': next_url})


def forgot_password_view(request):
    """Step 1: User requests a password reset link by entering their email."""
    locale = _get_locale(request)
    form = ForgotPasswordForm()
    sent = False
    error = None

    if request.method == 'POST':
        form = ForgotPasswordForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            try:
                user = User.objects.get(email__iexact=email)
                # Generate token and uidb64
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                # Build reset link
                site_url = getattr(settings, 'SITE_URL', request.build_absolute_uri('/').rstrip('/'))
                reset_link = f"{site_url}/{locale}/auth/reset-password/{uid}/{token}/"
                # Send email
                try:
                    send_mail(
                        subject='Reset Your M.SHOP Qatar Password',
                        message=render_to_string('emails/password_reset.txt', {
                            'user': user,
                            'reset_link': reset_link,
                            'locale': locale,
                        }),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    logger.error(f"Password reset email failed: {e}")
            except User.DoesNotExist:
                # Don't reveal whether email exists — always show sent
                pass
            sent = True

    return render(request, 'auth/forgot_password.html', {
        'form': form, 'sent': sent, 'error': error, 'locale': locale
    })


def password_reset_confirm_view(request, uidb64, token):
    """Step 3: User clicks the reset link and sets a new password."""
    locale = _get_locale(request)
    form = SetNewPasswordForm()
    error = None
    valid_link = False

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        if default_token_generator.check_token(user, token):
            valid_link = True
        else:
            error = 'This password reset link has expired or is invalid. Please request a new one.'
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
        error = 'Invalid reset link. Please request a new one.'

    if valid_link and request.method == 'POST':
        form = SetNewPasswordForm(request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data['new_password'])
            user.save()
            # Log user in after reset
            login(request, user)
            return redirect(f'/{locale}/auth/reset-password/complete/')

    return render(request, 'auth/password_reset_confirm.html', {
        'form': form,
        'valid_link': valid_link,
        'error': error,
        'locale': locale,
        'uidb64': uidb64,
        'token': token,
    })


def password_reset_complete_view(request):
    """Step 4: Password successfully reset."""
    locale = _get_locale(request)
    return render(request, 'auth/password_reset_complete.html', {'locale': locale})


def logout_view(request):
    locale = _get_locale(request)
    logout(request)
    return redirect(f'/{locale}/')


# ─── ACCOUNT ────────────────────────────────────────────────────
@login_required
def account_view(request):
    locale = _get_locale(request)
    orders = request.user.orders.order_by('-created_at')
    addresses = request.user.addresses.all()
    address_form = AddressForm()
    profile_form = ProfileForm(initial={
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'phone': request.user.phone,
    })

    if request.method == 'POST':
        if 'profile_save' in request.POST:
            profile_form = ProfileForm(request.POST)
            if profile_form.is_valid():
                cd = profile_form.cleaned_data
                request.user.first_name = cd['first_name']
                request.user.last_name = cd.get('last_name', '')
                request.user.phone = cd.get('phone', '')
                request.user.save()
                messages.success(request, 'Profile updated successfully.')
                return redirect(request.path)

        elif 'address_save' in request.POST:
            address_form = AddressForm(request.POST)
            if address_form.is_valid():
                addr = address_form.save(commit=False)
                addr.user = request.user
                if addr.is_default:
                    # Remove default flag from other addresses
                    request.user.addresses.update(is_default=False)
                addr.save()
                messages.success(request, 'Address saved successfully.')
                return redirect(request.path)

    return render(request, 'account/account.html', {
        'orders': orders,
        'addresses': addresses,
        'profile_form': profile_form,
        'address_form': address_form,
        'locale': locale,
    })


@login_required
@require_POST
def address_delete(request):
    """AJAX endpoint to delete a user's saved address."""
    data = json.loads(request.body)
    address_id = data.get('id')
    try:
        addr = Address.objects.get(pk=address_id, user=request.user)
        addr.delete()
        return JsonResponse({'success': True})
    except Address.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Address not found.'}, status=404)


# ─── STATIC PAGES ───────────────────────────────────────────────
def about_view(request):
    locale = _get_locale(request)
    return render(request, 'pages/about.html', {'locale': locale})


def contact_view(request):
    locale = _get_locale(request)
    form = ContactForm()
    sent = False

    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            cd = form.cleaned_data
            # Save to database
            ContactMessage.objects.create(
                name=cd['name'],
                email=cd['email'],
                phone=cd.get('phone', ''),
                subject=cd['subject'],
                message=cd['message'],
            )
            # Send notification email to store
            notification_email = getattr(settings, 'CONTACT_NOTIFICATION_EMAIL', '')
            if notification_email:
                try:
                    send_mail(
                        subject=f'[M.SHOP Contact] {cd["subject"]}',
                        message=(
                            f"New contact message from {cd['name']} <{cd['email']}>\n"
                            f"Phone: {cd.get('phone', 'N/A')}\n\n"
                            f"Message:\n{cd['message']}"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[notification_email],
                        fail_silently=True,
                    )
                except Exception as e:
                    logger.error(f"Contact notification email failed: {e}")

            # Auto-reply to sender
            try:
                send_mail(
                    subject='Thank you for contacting M.SHOP Qatar',
                    message=(
                        f"Dear {cd['name']},\n\n"
                        "Thank you for your message. We have received your inquiry and will get back to you within 24 hours.\n\n"
                        "Regards,\nM.SHOP Qatar Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[cd['email']],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Contact auto-reply email failed: {e}")

            sent = True

    return render(request, 'pages/contact.html', {'form': form, 'sent': sent, 'locale': locale})


def offers_view(request):
    locale = _get_locale(request)
    deals = Product.objects.filter(is_on_sale=True, in_stock=True)
    return render(request, 'pages/offers.html', {'deals': deals, 'locale': locale})


# ─── ADMIN CUSTOM DASHBOARD ─────────────────────────────────────
def admin_dashboard(request):
    if not request.user.is_staff:
        return redirect('/admin/')
    products = Product.objects.all()
    low_stock = products.filter(stock_count__lt=10, in_stock=True)[:5]
    recent_orders = Order.objects.order_by('-created_at')[:10]
    total_products = products.count()
    total_orders = Order.objects.count()
    total_users = User.objects.count()
    new_messages = ContactMessage.objects.filter(status='new').count()
    revenue_total = sum(o.total for o in Order.objects.filter(status__in=['confirmed', 'shipped', 'delivered']))
    return render(request, 'admin_custom/dashboard.html', {
        'low_stock': low_stock,
        'recent_orders': recent_orders,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_users': total_users,
        'new_messages': new_messages,
        'revenue_total': revenue_total,
        'all_products': products[:20],
    })


@require_POST
def admin_order_status_update(request):
    """AJAX endpoint: update an order's status from the custom dashboard."""
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Forbidden'}, status=403)
    data = json.loads(request.body)
    order_id = data.get('order_id')
    new_status = data.get('status')
    valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return JsonResponse({'success': False, 'error': 'Invalid status'}, status=400)
    try:
        order = Order.objects.get(pk=order_id)
        order.status = new_status
        order.save(update_fields=['status'])
        return JsonResponse({'success': True, 'status': order.status, 'display': order.get_status_display()})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)


@login_required
@require_POST
def customer_order_cancel(request):
    """Allow customer to cancel their own pending/processing order."""
    locale = _get_locale(request)
    try:
        data = json.loads(request.body)
        order_id = data.get('order_id')
        order = Order.objects.get(pk=order_id, user=request.user)

        if order.status not in ('pending', 'processing'):
            return JsonResponse({
                'success': False,
                'error': f'Order cannot be cancelled as it is already {order.get_status_display()}.' if locale != 'ar' else f'لا يمكن إلغاء الطلب لأنه بحالة {order.get_status_display()}.'
            }, status=400)

        order.status = 'cancelled'
        order.save(update_fields=['status'])

        # Restock product quantities
        for oi in order.order_items.all():
            if oi.product and oi.product.stock_count is not None:
                oi.product.stock_count += oi.quantity
                if oi.product.stock_count > 0:
                    oi.product.in_stock = True
                oi.product.save(update_fields=['stock_count', 'in_stock'])

        return JsonResponse({
            'success': True,
            'message': 'Your order has been cancelled successfully.' if locale != 'ar' else 'تم إلغاء طلبك بنجاح.',
            'status': order.status,
            'status_display': order.get_status_display() if locale != 'ar' else 'ملغي',
        })
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found.' if locale != 'ar' else 'الطلب غير موجود.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
