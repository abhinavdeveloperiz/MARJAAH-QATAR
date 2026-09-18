from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html, mark_safe
from .models import User, Category, Subcategory, Brand, Product, ProductImage, Address, Order, OrderItem, ContactMessage


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'phone', 'orders_count_badge', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Store Profile', {'fields': ('phone',)}),
    )

    def orders_count_badge(self, obj):
        count = obj.orders.count()
        if count > 0:
            return format_html('<span class="badge badge-success" style="font-size:11px;">{} orders</span>', count)
        return format_html('<span class="badge badge-light" style="color:#94a3b8;font-size:11px;">0 orders</span>')
    orders_count_badge.short_description = 'Orders'


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('category_thumb', 'name', 'name_ar', 'slug', 'is_featured', 'product_count', 'order')
    list_editable = ('order', 'is_featured')
    list_display_links = ('category_thumb', 'name')
    search_fields = ('name', 'name_ar', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('category_thumb_large',)
    fields = ('category_thumb_large', 'name', 'name_ar', 'slug', 'image_file', 'image', 'is_featured', 'order')

    def category_thumb(self, obj):
        img_url = obj.image_url
        if img_url:
            return format_html('<img src="{}" class="admin-thumb" onerror="this.src=\'/static/images/placeholder.svg\'" />', img_url)
        return format_html('<div class="admin-thumb" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-folder fa-lg"></i></div>')
    category_thumb.short_description = 'Cover'

    def category_thumb_large(self, obj):
        img_url = obj.image_url
        if img_url:
            return format_html('<img src="{}" style="max-height:120px;border-radius:8px;border:1px solid #e2e8f0;" onerror="this.src=\'/static/images/placeholder.svg\'" />', img_url)
        return 'No image provided'
    category_thumb_large.short_description = 'Preview'


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_ar', 'category', 'slug')
    list_filter = ('category',)
    search_fields = ('name', 'name_ar', 'slug', 'category__name')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('brand_logo_thumb', 'name', 'products_count', 'website_link')
    list_display_links = ('brand_logo_thumb', 'name')
    search_fields = ('name',)
    fields = ('brand_logo_thumb_large', 'name', 'logo_file', 'logo', 'website')
    readonly_fields = ('brand_logo_thumb_large',)

    def brand_logo_thumb(self, obj):
        logo_url = obj.logo_url
        if logo_url:
            return format_html('<img src="{}" class="admin-thumb" style="background:#fff;" onerror="this.src=\'/static/images/placeholder.svg\'" />', logo_url)
        return format_html('<div class="admin-thumb" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-tag fa-lg"></i></div>')
    brand_logo_thumb.short_description = 'Logo'

    def brand_logo_thumb_large(self, obj):
        logo_url = obj.logo_url
        if logo_url:
            return format_html('<img src="{}" style="max-height:100px;border-radius:8px;padding:8px;background:#fff;border:1px solid #e2e8f0;" onerror="this.src=\'/static/images/placeholder.svg\'" />', logo_url)
        return 'No logo provided'
    brand_logo_thumb_large.short_description = 'Logo Preview'

    def products_count(self, obj):
        count = obj.products.count()
        return format_html('<span class="badge badge-info">{} products</span>', count)
    products_count.short_description = 'Catalog Items'

    def website_link(self, obj):
        if obj.website:
            return format_html('<a href="{}" target="_blank" class="text-primary"><i class="fas fa-external-link-alt"></i> Visit</a>', obj.website)
        return '-'
    website_link.short_description = 'Website'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image_preview', 'image', 'caption', 'order')
    readonly_fields = ('image_preview',)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:45px;border-radius:6px;border:1px solid #cbd5e1;" />', obj.image.url)
        return format_html('<span style="color:#94a3b8;font-size:11px;">No photo</span>')
    image_preview.short_description = 'Preview'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'thumbnail_preview', 'name', 'brand', 'category',
        'price_display', 'stock_badge', 'is_in_stock', 'is_featured', 'is_on_sale', 'rating_display'
    )
    list_display_links = ('thumbnail_preview', 'name')
    list_editable = ('is_featured', 'is_on_sale')
    list_filter = ('category', 'brand', 'in_stock', 'is_featured', 'is_new', 'is_on_sale')
    search_fields = ('name', 'name_ar', 'sku', 'slug', 'brand__name', 'category__name')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'thumbnail_large')
    date_hierarchy = 'created_at'
    inlines = [ProductImageInline]

    fieldsets = (
        ('General Info', {
            'fields': ('name', 'name_ar', 'slug', 'brand', 'category', 'subcategory', 'sku')
        }),
        ('Product Photo & Media Upload', {
            'description': 'Upload the primary image file directly from your computer or provide image URLs below.',
            'fields': ('thumbnail_large', 'primary_image', 'images_json')
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'original_price', 'in_stock', 'stock_count')
        }),
        ('Marketing & Status', {
            'fields': ('is_featured', 'is_new', 'is_best_seller', 'is_on_sale', 'rating', 'review_count')
        }),
        ('Content & Specifications', {
            'fields': ('short_description', 'short_description_ar', 'description', 'description_ar', 'specifications_json', 'tags_json')
        }),
        ('Shipping & Dimensions', {
            'fields': ('weight', 'delivery_days', 'warranty_months', 'created_at')
        }),
    )

    def thumbnail_preview(self, obj):
        img_url = obj.first_image
        return format_html(
            '<img src="{}" class="admin-thumb" alt="{}" onerror="this.src=\'/static/images/placeholder.svg\'" />',
            img_url, obj.name
        )
    thumbnail_preview.short_description = 'Photo'

    def thumbnail_large(self, obj):
        img_url = obj.first_image
        return format_html(
            '<img src="{}" style="max-height:160px;border-radius:10px;border:1px solid #e2e8f0;" onerror="this.src=\'/static/images/placeholder.svg\'" />',
            img_url
        )
    thumbnail_large.short_description = 'Primary Image Preview'

    def price_display(self, obj):
        price_str = f"{float(obj.price):,.2f}"
        if obj.original_price and obj.original_price > obj.price:
            orig_str = f"{float(obj.original_price):,.2f}"
            discount = obj.discount_percent
            return format_html(
                '<div><strong style="color:#0f172a;">QAR {}</strong><br><span style="text-decoration:line-through;color:#94a3b8;font-size:11px;">QAR {}</span> <span class="badge badge-danger" style="font-size:10px;">-{}%</span></div>',
                price_str, orig_str, discount
            )
        return format_html('<strong style="color:#0f172a;">QAR {}</strong>', price_str)
    price_display.short_description = 'Price'
    price_display.admin_order_field = 'price'

    def stock_badge(self, obj):
        if not obj.in_stock or (obj.stock_count is not None and obj.stock_count == 0):
            return format_html('<span class="admin-badge badge-stock-out"><i class="fas fa-times-circle"></i> Out of stock</span>')
        elif obj.stock_count is not None and obj.stock_count < 5:
            return format_html('<span class="admin-badge badge-stock-low"><i class="fas fa-exclamation-circle"></i> Low: {} left</span>', obj.stock_count)
        elif obj.stock_count is not None:
            return format_html('<span class="admin-badge badge-stock-in"><i class="fas fa-check-circle"></i> {} in stock</span>', obj.stock_count)
        return format_html('<span class="admin-badge badge-stock-in"><i class="fas fa-check-circle"></i> In stock</span>')
    stock_badge.short_description = 'Inventory'
    stock_badge.admin_order_field = 'stock_count'

    def is_in_stock(self, obj):
        return obj.in_stock
    is_in_stock.boolean = True
    is_in_stock.short_description = 'Available'

    def rating_display(self, obj):
        return format_html('<span>★ {} <small style="color:#64748b;">({})</small></span>', obj.rating, obj.review_count)
    rating_display.short_description = 'Rating'
    rating_display.admin_order_field = 'rating'


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'label', 'full_name', 'phone', 'city', 'zone', 'is_default')
    list_filter = ('city', 'is_default')
    search_fields = ('user__username', 'full_name', 'phone', 'building', 'street', 'zone')


class OrderItemInline(admin.TabularInline):
    """Shows order line items directly inside the Order detail page with item photos."""
    model = OrderItem
    extra = 0
    readonly_fields = ('item_preview', 'product_name', 'product_brand', 'unit_price', 'quantity', 'line_total')
    fields = ('item_preview', 'product_name', 'product_brand', 'unit_price', 'quantity', 'line_total')

    def item_preview(self, obj):
        img_url = obj.product_image or (obj.product.first_image if obj.product else '/static/images/placeholder.svg')
        return format_html(
            '<img src="{}" class="admin-thumb-inline" onerror="this.src=\'/static/images/placeholder.svg\'" />',
            img_url
        )
    item_preview.short_description = 'Item'

    def line_total(self, obj):
        total_str = f"{float(obj.line_total):,.2f}"
        return format_html('<strong>QAR {}</strong>', total_str)
    line_total.short_description = 'Line Total'


def mark_confirmed(modeladmin, request, queryset):
    queryset.update(status='confirmed')
mark_confirmed.short_description = '✓ Mark selected orders as Confirmed'

def mark_shipped(modeladmin, request, queryset):
    queryset.update(status='shipped')
mark_shipped.short_description = '🚚 Mark selected orders as Shipped'

def mark_delivered(modeladmin, request, queryset):
    queryset.update(status='delivered')
mark_delivered.short_description = '📦 Mark selected orders as Delivered'

def mark_cancelled(modeladmin, request, queryset):
    queryset.update(status='cancelled')
mark_cancelled.short_description = '✕ Mark selected orders as Cancelled'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer_display', 'status_badge', 'total_display', 'payment_method_badge', 'created_at')
    list_display_links = ('order_number',)
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('id', 'user__username', 'user__email', 'guest_name', 'guest_email', 'guest_phone', 'delivery_phone', 'tracking_number')
    readonly_fields = ('order_number', 'created_at', 'updated_at', 'customer_info_panel', 'delivery_address_display')
    inlines = [OrderItemInline]
    actions = [mark_confirmed, mark_shipped, mark_delivered, mark_cancelled]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Order Overview', {
            'fields': ('order_number', 'status', 'payment_method', 'tracking_number', 'notes', 'created_at', 'updated_at')
        }),
        ('Customer & Quick Actions', {
            'fields': ('customer_info_panel', 'user', 'guest_name', 'guest_email', 'guest_phone')
        }),
        ('Delivery Address (Qatar)', {
            'fields': (
                'delivery_address_display', 'address',
                'delivery_full_name', 'delivery_phone', 'delivery_building',
                'delivery_street', 'delivery_zone', 'delivery_city', 'delivery_country',
            )
        }),
        ('Financial Breakdown', {
            'fields': ('subtotal', 'shipping', 'total')
        }),
    )

    def customer_display(self, obj):
        name = obj.customer_name
        phone = (obj.user.phone if obj.user and obj.user.phone else '') or obj.guest_phone or obj.delivery_phone
        email = obj.customer_email

        actions = []
        if phone:
            clean_digits = ''.join(c for c in phone if c.isdigit())
            actions.append(format_html('<a href="tel:{}" class="admin-action-btn admin-btn-phone" title="Call"><i class="fas fa-phone"></i> {}</a>', phone, phone))
            
            # Qatar WhatsApp shortcut
            wa_num = clean_digits
            if len(wa_num) == 8:
                wa_num = '974' + wa_num
            actions.append(format_html('<a href="https://wa.me/{}" target="_blank" class="admin-action-btn admin-btn-whatsapp" title="WhatsApp"><i class="fab fa-whatsapp"></i> Chat</a>', wa_num))
        
        if email:
            actions.append(format_html('<a href="mailto:{}" class="admin-action-btn admin-btn-email" title="Email"><i class="fas fa-envelope"></i></a>', email))

        action_html = mark_safe('<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">' + ''.join(actions) + '</div>') if actions else ''
        return format_html('<div><strong>{}</strong>{}</div>', name, action_html)
    customer_display.short_description = 'Customer & Contact'

    def customer_info_panel(self, obj):
        phone = (obj.user.phone if obj.user and obj.user.phone else '') or obj.guest_phone or obj.delivery_phone
        email = obj.customer_email
        clean_digits = ''.join(c for c in phone if c.isdigit())
        wa_num = ('974' + clean_digits) if len(clean_digits) == 8 else clean_digits

        return format_html(
            '<div style="padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">'
            '<p style="margin:0 0 6px 0;"><strong>Name:</strong> {}</p>'
            '<p style="margin:0 0 6px 0;"><strong>Email:</strong> <a href="mailto:{}">{}</a></p>'
            '<p style="margin:0 0 8px 0;"><strong>Phone:</strong> {}</p>'
            '<div style="display:flex;gap:8px;">'
            '<a href="tel:{}" class="admin-action-btn admin-btn-phone"><i class="fas fa-phone"></i> Direct Call</a>'
            '<a href="https://wa.me/{}" target="_blank" class="admin-action-btn admin-btn-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp Dispatch</a>'
            '</div>'
            '</div>',
            obj.customer_name, email, email, phone, phone, wa_num
        )
    customer_info_panel.short_description = 'Customer Dispatch Hub'

    def total_display(self, obj):
        total_str = f"{float(obj.total):,.2f}"
        return format_html('<strong style="font-size:1.05em;color:#0f172a;">QAR {}</strong>', total_str)
    total_display.short_description = 'Total'
    total_display.admin_order_field = 'total'

    def payment_method_badge(self, obj):
        pm = obj.payment_method.lower()
        if pm in ('card', 'online'):
            return format_html('<span class="badge badge-primary"><i class="fas fa-credit-card"></i> Card</span>')
        elif pm == 'qpay':
            return format_html('<span class="badge badge-info"><i class="fas fa-wallet"></i> QPay</span>')
        return format_html('<span class="badge badge-secondary"><i class="fas fa-money-bill-wave"></i> Cash</span>')
    payment_method_badge.short_description = 'Payment'

    def status_badge(self, obj):
        colours = {
            'processing': ('#fffbeb', '#b45309', 'fas fa-clock'),
            'confirmed': ('#eff6ff', '#1d4ed8', 'fas fa-check'),
            'shipped': ('#f5f3ff', '#6d28d9', 'fas fa-truck'),
            'delivered': ('#ecfdf5', '#047857', 'fas fa-box-check'),
            'cancelled': ('#fef2f2', '#b91c1c', 'fas fa-times-circle'),
        }
        bg, fg, icon = colours.get(obj.status, ('#f8fafc', '#475569', 'fas fa-circle'))
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">'
            '<i class="{}"></i> {}'
            '</span>',
            bg, fg, fg, icon, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('item_preview', 'product_name', 'order', 'unit_price', 'quantity', 'line_total_display')
    list_filter = ('order__status',)
    search_fields = ('product_name', 'product_slug', 'order__id')
    readonly_fields = ('item_preview_large', 'order', 'product', 'product_slug', 'product_name', 'product_brand',
                       'product_image', 'unit_price', 'original_price', 'quantity')

    def item_preview(self, obj):
        img_url = obj.product_image or (obj.product.first_image if obj.product else '/static/images/placeholder.svg')
        return format_html('<img src="{}" class="admin-thumb" onerror="this.src=\'/static/images/placeholder.svg\'" />', img_url)
    item_preview.short_description = 'Photo'

    def item_preview_large(self, obj):
        img_url = obj.product_image or (obj.product.first_image if obj.product else '/static/images/placeholder.svg')
        return format_html('<img src="{}" style="max-height:120px;border-radius:8px;" onerror="this.src=\'/static/images/placeholder.svg\'" />', img_url)
    item_preview_large.short_description = 'Item Photo'

    def line_total_display(self, obj):
        total_str = f"{float(obj.line_total):,.2f}"
        return format_html('<strong>QAR {}</strong>', total_str)
    line_total_display.short_description = 'Line Total'


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'status_badge', 'quick_reply', 'created_at')
    list_filter = ('status', 'created_at')
    list_editable = ()
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('name', 'email', 'phone', 'subject', 'message', 'created_at')
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Customer Message', {
            'fields': ('name', 'email', 'phone', 'subject', 'message', 'created_at')
        }),
        ('Staff Resolution', {
            'fields': ('status', 'replied_at', 'admin_notes')
        }),
    )

    def status_badge(self, obj):
        colours = {
            'new': ('#fef3c7', '#b45309', 'New'),
            'in_progress': ('#dbeafe', '#1d4ed8', 'In Progress'),
            'resolved': ('#dcfce7', '#15803d', 'Resolved'),
        }
        bg, fg, label = colours.get(obj.status, ('#f1f5f9', '#475569', obj.status))
        return format_html(
            '<span style="background:{};color:{};padding:3px 10px;border-radius:15px;font-size:11px;font-weight:700;">{}</span>',
            bg, fg, label
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def quick_reply(self, obj):
        subject = f"Re: {obj.subject} | Marjaah Trading"
        return format_html(
            '<a href="mailto:{}?subject={}" class="admin-action-btn admin-btn-email"><i class="fas fa-reply"></i> Reply</a>',
            obj.email, subject
        )
    quick_reply.short_description = 'Action'
