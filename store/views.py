import json
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from .models import Product, Category, Brand, Address, Order, OrderItem, ContactMessage, User
from .forms import (LoginForm, RegisterForm, ForgotPasswordForm, SetNewPasswordForm,
                    AddressForm, CheckoutForm, ProfileForm, ContactForm)

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

    # ─── PAGINATION (Default 8 items/page = 2 balanced pages for 13 items) ────
    total_count = qs.count()
    per_page_raw = request.GET.get('per_page', '8')
    try:
        per_page = int(per_page_raw)
        if per_page not in [8, 12, 16, 24, 48]:
            per_page = 8
    except (ValueError, TypeError):
        per_page = 8

    paginator = Paginator(qs, per_page)
    page_number = request.GET.get('page', 1)
    try:
        page_obj = paginator.get_page(page_number)
    except (PageNotAnInteger, EmptyPage):
        page_obj = paginator.get_page(1)

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


@require_POST
def cart_add(request):
    data = json.loads(request.body)
    product_slug = data.get('slug')
    product = get_object_or_404(Product, slug=product_slug)

    # Validate stock before adding
    if not product.in_stock:
        return JsonResponse({'success': False, 'error': 'This product is currently out of stock.'}, status=400)

    cart = request.session.get('cart', {})
    qty_to_add = data.get('quantity', 1)

    # Check stock quantity if tracked
    if product.stock_count is not None:
        current_qty = cart.get(product_slug, {}).get('quantity', 0)
        if (current_qty + qty_to_add) > product.stock_count:
            return JsonResponse({
                'success': False,
                'error': f'Only {product.stock_count} unit(s) available in stock.'
            }, status=400)

    if product_slug in cart:
        cart[product_slug]['quantity'] += qty_to_add
    else:
        cart[product_slug] = {
            'slug': product.slug,
            'name': product.name,
            'name_ar': product.name_ar,
            'price': float(product.price),
            'original_price': float(product.original_price) if product.original_price else None,
            'image': product.first_image,
            'brand': product.brand.name if product.brand else '',
            'quantity': qty_to_add,
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
            product = Product.objects.get(slug=item['slug'])
            if not product.in_stock:
                stock_errors.append(f"'{item['name']}' is no longer in stock.")
            elif product.stock_count is not None and item['quantity'] > product.stock_count:
                stock_errors.append(
                    f"Only {product.stock_count} unit(s) of '{item['name']}' are available."
                )
        except Product.DoesNotExist:
            stock_errors.append(f"'{item['name']}' is no longer available.")

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
            if pm == 'card':
                card_num = cd.get('card_number', '').replace(' ', '').replace('-', '')
                masked = f"•••• {card_num[-4:]}" if len(card_num) >= 4 else "Card"
                pm_detail = f"[Card Payment: {masked} | Holder: {cd.get('card_holder', '')}]"
            elif pm in ('qr', 'qpay'):
                qr_ref = cd.get('qr_ref', '').strip()
                pm_detail = f"[QR / Fawran Transfer Ref: {qr_ref if qr_ref else 'Direct QR Scan'}]"
            elif pm == 'cash':
                change_req = cd.get('cash_change_req', '').strip()
                if change_req:
                    pm_detail = f"[Cash On Delivery - Change requested for: {change_req}]"

            user_notes = cd.get('notes', '').strip()
            final_notes = f"{pm_detail}\n{user_notes}".strip() if pm_detail else user_notes

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
                notes=final_notes,
                **delivery_data,
            )

            # Create relational OrderItem records & deduct stock
            for item in items:
                try:
                    product = Product.objects.get(slug=item['slug'])
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_slug=item['slug'],
                        product_name=item['name'],
                        product_name_ar=item.get('name_ar', ''),
                        product_brand=item.get('brand', ''),
                        product_image=item.get('image', ''),
                        unit_price=item['price'],
                        original_price=item.get('original_price'),
                        quantity=item['quantity'],
                    )
                    # Deduct stock if tracked
                    if product.stock_count is not None:
                        product.stock_count = max(0, product.stock_count - item['quantity'])
                        if product.stock_count == 0:
                            product.in_stock = False
                        product.save(update_fields=['stock_count', 'in_stock'])
                except Product.DoesNotExist:
                    logger.warning(f"Product {item['slug']} not found during order creation.")

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


def checkout_success(request, order_pk):
    """Display order confirmation page."""
    locale = _get_locale(request)
    order = get_object_or_404(Order, pk=order_pk)

    # Security: only show to the order owner or guest who just placed it
    # We allow access within the same session (cart was cleared = legitimate)
    if order.user and request.user.is_authenticated and order.user != request.user:
        return redirect(f'/{locale}/')

    return render(request, 'checkout/success.html', {
        'order': order,
        'locale': locale,
        'total': order.total,
        'order_items': order.items,
    })


# ─── AUTH ───────────────────────────────────────────────────────
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
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
                if user:
                    login(request, user)
                    return redirect(next_url)
                else:
                    error = 'Invalid password.' if locale != 'ar' else 'كلمة المرور غير صحيحة.'
            except User.DoesNotExist:
                error = 'No account found with that email.' if locale != 'ar' else 'لم يتم العثور على حساب بهذا البريد الإلكتروني.'
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
            if User.objects.filter(email=cd['email']).exists():
                error = 'An account with this email already exists.' if locale != 'ar' else 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.'
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
