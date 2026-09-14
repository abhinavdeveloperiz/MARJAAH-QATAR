from django.urls import path
from . import views

urlpatterns = [
    # ── Main pages ──────────────────────────────────────
    path('', views.home, name='home'),
    path('shop/', views.shop, name='shop'),
    path('shop/<slug:category_slug>/', views.shop, name='shop_category'),
    path('product/<slug:slug>/', views.product_detail, name='product_detail'),
    path('cart/', views.cart_view, name='cart'),
    path('checkout/', views.checkout_view, name='checkout'),
    path('checkout/success/<int:order_pk>/', views.checkout_success, name='checkout_success'),
    path('wishlist/', views.wishlist_view, name='wishlist'),
    path('account/', views.account_view, name='account'),
    path('about/', views.about_view, name='about'),
    path('contact/', views.contact_view, name='contact'),
    path('offers/', views.offers_view, name='offers'),

    # ── Auth ─────────────────────────────────────────────
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/forgot-password/', views.forgot_password_view, name='forgot_password'),
    path('auth/reset-password/<uidb64>/<token>/', views.password_reset_confirm_view, name='password_reset_confirm'),
    path('auth/reset-password/complete/', views.password_reset_complete_view, name='password_reset_complete'),

    # ── Custom admin dashboard ────────────────────────────
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),

    # ── AJAX / API endpoints ─────────────────────────────
    path('api/cart/add/', views.cart_add, name='cart_add'),
    path('api/cart/update/', views.cart_update, name='cart_update'),
    path('api/cart/remove/', views.cart_remove, name='cart_remove'),
    path('api/wishlist/toggle/', views.wishlist_toggle, name='wishlist_toggle'),
    path('api/address/delete/', views.address_delete, name='address_delete'),
    path('api/order/cancel/', views.customer_order_cancel, name='order_cancel'),
    path('api/order/update-status/', views.admin_order_status_update, name='order_status_update'),
]
