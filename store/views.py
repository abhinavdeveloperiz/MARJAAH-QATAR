import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.db.models import Q

from .models import Product, Category, Brand, Address, Order, User
from .forms import (LoginForm, RegisterForm, ForgotPasswordForm,
                    AddressForm, CheckoutForm, ProfileForm, ContactForm)


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
    return render(request, 'home/index.html', {
        'featured': featured,
        'new_arrivals': new_arrivals,
        'flash_deals': flash_deals,
        'categories': categories,
        'brands': brands,
        'best_sellers': best_sellers,
        'locale': locale,
    })


# ─── SHOP ───────────────────────────────────────────────────────
def shop(request, category_slug=None):
    locale = _get_locale(request)
    qs = Product.objects.select_related('brand', 'category')
    category = None

    if category_slug:
        category = get_object_or_404(Category, slug=category_slug)
        qs = qs.filter(category=category)

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(name_ar__icontains=search) | Q(brand__name__icontains=search))

    brand_filter = request.GET.get('brand', '')
    if brand_filter:
        qs = qs.filter(brand__name=brand_filter)

    in_stock_only = request.GET.get('in_stock', '')
    if in_stock_only:
        qs = qs.filter(in_stock=True)

    on_sale = request.GET.get('on_sale', '')
    if on_sale:
        qs = qs.filter(is_on_sale=True)

    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    if min_price:
        qs = qs.filter(price__gte=min_price)
    if max_price:
        qs = qs.filter(price__lte=max_price)

    sort = request.GET.get('sort', 'featured')
    sort_map = {
        'price_asc': 'price',
        'price_desc': '-price',
        'newest': '-created_at',
        'rating': '-rating',
        'featured': '-is_featured',
    }
    qs = qs.order_by(sort_map.get(sort, '-is_featured'))

    all_brands = Brand.objects.all()
    all_categories = Category.objects.filter(is_featured=True)

    return render(request, 'shop/shop.html', {
        'products': qs,
        'category': category,
        'all_brands': all_brands,
        'all_categories': all_categories,
        'search': search,
        'current_sort': sort,
        'current_brand': brand_filter,
        'locale': locale,
        'total_count': qs.count(),
    })


# ─── PRODUCT DETAIL ─────────────────────────────────────────────
def product_detail(request, slug):
    locale = _get_locale(request)
    product = get_object_or_404(Product, slug=slug)
    related = Product.objects.filter(
        category=product.category, in_stock=True
    ).exclude(pk=product.pk)[:4]
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
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    shipping = 0 if subtotal >= 500 else 20
    total = subtotal + shipping
    return render(request, 'cart/cart.html', {
        'cart_items': items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'locale': locale,
    })


@require_POST
def cart_add(request):
    data = json.loads(request.body)
    product_slug = data.get('slug')
    product = get_object_or_404(Product, slug=product_slug)
    cart = request.session.get('cart', {})
    if product_slug in cart:
        cart[product_slug]['quantity'] += data.get('quantity', 1)
    else:
        cart[product_slug] = {
            'slug': product.slug,
            'name': product.name,
            'name_ar': product.name_ar,
            'price': float(product.price),
            'original_price': float(product.original_price) if product.original_price else None,
            'image': product.first_image,
            'brand': product.brand.name if product.brand else '',
            'quantity': data.get('quantity', 1),
        }
    request.session['cart'] = cart
    request.session.modified = True
    cart_count = sum(i['quantity'] for i in cart.values())
    return JsonResponse({'success': True, 'cart_count': cart_count})


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
            cart[slug]['quantity'] = qty
    request.session['cart'] = cart
    request.session.modified = True
    cart_count = sum(i['quantity'] for i in cart.values())
    subtotal = sum(i['price'] * i['quantity'] for i in cart.values())
    return JsonResponse({'success': True, 'cart_count': cart_count, 'subtotal': subtotal})


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

    form = CheckoutForm()
    saved_addresses = []
    if request.user.is_authenticated:
        saved_addresses = request.user.addresses.all()

    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid():
            cd = form.cleaned_data
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
                order = Order.objects.create(
                    user=request.user,
                    items_json=json.dumps(items),
                    subtotal=subtotal,
                    shipping=shipping,
                    total=total,
                    address=addr,
                    payment_method=cd['payment_method'],
                )
            # Clear cart
            request.session['cart'] = {}
            request.session.modified = True
            return render(request, 'checkout/success.html', {
                'locale': locale,
                'total': total,
            })

    return render(request, 'checkout/checkout.html', {
        'form': form,
        'cart_items': items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'saved_addresses': saved_addresses,
        'locale': locale,
    })


# ─── AUTH ───────────────────────────────────────────────────────
def login_view(request):
    locale = _get_locale(request)
    if request.user.is_authenticated:
        return redirect(f'/{locale}/')
    form = LoginForm()
    error = None
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
                if user:
                    login(request, user)
                    return redirect(f'/{locale}/')
                else:
                    error = 'Invalid password.'
            except User.DoesNotExist:
                error = 'No account found with that email.'
    return render(request, 'auth/login.html', {'form': form, 'error': error, 'locale': locale})


def register_view(request):
    locale = _get_locale(request)
    if request.user.is_authenticated:
        return redirect(f'/{locale}/')
    form = RegisterForm()
    error = None
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            cd = form.cleaned_data
            if User.objects.filter(email=cd['email']).exists():
                error = 'An account with this email already exists.'
            else:
                names = cd['full_name'].strip().split(' ', 1)
                user = User.objects.create_user(
                    username=cd['email'],
                    email=cd['email'],
                    password=cd['password'],
                    first_name=names[0],
                    last_name=names[1] if len(names) > 1 else '',
                    phone=cd.get('phone', ''),
                )
                login(request, user)
                return redirect(f'/{locale}/')
    return render(request, 'auth/register.html', {'form': form, 'error': error, 'locale': locale})


def forgot_password_view(request):
    locale = _get_locale(request)
    sent = False
    form = ForgotPasswordForm()
    if request.method == 'POST':
        form = ForgotPasswordForm(request.POST)
        if form.is_valid():
            sent = True  # Simulation; hook up email in production
    return render(request, 'auth/forgot_password.html', {'form': form, 'sent': sent, 'locale': locale})


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
    profile_form = ProfileForm(initial={
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'phone': request.user.phone,
    })
    if request.method == 'POST' and 'profile_save' in request.POST:
        profile_form = ProfileForm(request.POST)
        if profile_form.is_valid():
            cd = profile_form.cleaned_data
            request.user.first_name = cd['first_name']
            request.user.last_name = cd.get('last_name', '')
            request.user.phone = cd.get('phone', '')
            request.user.save()
            messages.success(request, 'Profile updated successfully.')
            return redirect(request.path)
    return render(request, 'account/account.html', {
        'orders': orders,
        'addresses': addresses,
        'profile_form': profile_form,
        'locale': locale,
    })


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
            sent = True  # Hook up email in production
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
    recent_orders = Order.objects.order_by('-created_at')[:5]
    total_products = products.count()
    total_orders = Order.objects.count()
    total_users = User.objects.count()
    return render(request, 'admin_custom/dashboard.html', {
        'low_stock': low_stock,
        'recent_orders': recent_orders,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_users': total_users,
        'all_products': products[:20],
    })
