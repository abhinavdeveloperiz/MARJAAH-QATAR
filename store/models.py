import json
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify


class User(AbstractUser):
    phone = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = 'User'

    def __str__(self):
        return self.get_full_name() or self.username


class Category(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120, blank=True)
    image = models.CharField(max_length=255, blank=True)
    product_count = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Subcategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories')
    slug = models.SlugField()
    name = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name_plural = 'Subcategories'

    def __str__(self):
        return f"{self.category.name} → {self.name}"


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    slug = models.SlugField(unique=True, max_length=255)
    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255, blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    subcategory = models.ForeignKey(Subcategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    images_json = models.TextField(default='[]')
    short_description = models.TextField(blank=True)
    short_description_ar = models.TextField(blank=True)
    description = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    specifications_json = models.TextField(default='[]')
    in_stock = models.BooleanField(default=True)
    stock_count = models.IntegerField(null=True, blank=True)
    is_new = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    is_on_sale = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0)
    review_count = models.IntegerField(default=0)
    sku = models.CharField(max_length=100, blank=True)
    weight = models.CharField(max_length=50, blank=True)
    delivery_days = models.IntegerField(null=True, blank=True)
    warranty_months = models.IntegerField(null=True, blank=True)
    tags_json = models.TextField(default='[]')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def images(self):
        try:
            raw = json.loads(self.images_json)
            return [f"{img}?v=2" if ('?' not in img) else img for img in raw]
        except Exception:
            return []

    @property
    def first_image(self):
        imgs = self.images
        return imgs[0] if (imgs and imgs[0]) else '/static/images/placeholder.svg'

    @property
    def specifications(self):
        try:
            return json.loads(self.specifications_json)
        except Exception:
            return []

    @property
    def tags(self):
        try:
            return json.loads(self.tags_json)
        except Exception:
            return []

    @property
    def discount_percent(self):
        if self.original_price and self.original_price > self.price:
            return round((1 - float(self.price) / float(self.original_price)) * 100)
        return None

    @property
    def star_range(self):
        return range(1, 6)


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=50, default='Home')
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    building = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=150, blank=True)
    zone = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, default='Doha')
    country = models.CharField(max_length=100, default='Qatar')
    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'Addresses'

    def __str__(self):
        return f"{self.user.username} — {self.label}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    # user is nullable to support guest checkout
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    # Guest checkout fields
    guest_name = models.CharField(max_length=150, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=30, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    # Legacy JSON snapshot (kept for read-only backward compatibility)
    items_json = models.TextField(default='[]')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    # Inline delivery address snapshot for guests (or when address is deleted)
    delivery_full_name = models.CharField(max_length=150, blank=True)
    delivery_phone = models.CharField(max_length=30, blank=True)
    delivery_building = models.CharField(max_length=100, blank=True)
    delivery_street = models.CharField(max_length=150, blank=True)
    delivery_zone = models.CharField(max_length=100, blank=True)
    delivery_city = models.CharField(max_length=100, blank=True)
    delivery_country = models.CharField(max_length=100, default='Qatar')

    payment_method = models.CharField(max_length=50, default='cash')
    notes = models.TextField(blank=True, help_text='Delivery instructions or special requests')
    tracking_number = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        owner = self.user.username if self.user else (self.guest_name or self.guest_email or 'Guest')
        return f"Order #{self.pk} — {owner}"

    @property
    def order_number(self):
        return f"MTQ-{self.pk:05d}"

    @property
    def items(self):
        """Return line items from the relational OrderItem table (preferred) or fall back to JSON."""
        related_items = list(self.order_items.all())
        if related_items:
            return [
                {
                    'slug': oi.product_slug,
                    'name': oi.product_name,
                    'name_ar': oi.product_name_ar,
                    'price': float(oi.unit_price),
                    'quantity': oi.quantity,
                    'image': oi.product_image,
                    'brand': oi.product_brand,
                    'line_total': float(oi.line_total),
                }
                for oi in related_items
            ]
        # Backward-compatibility fallback
        try:
            return json.loads(self.items_json)
        except Exception:
            return []

    @property
    def customer_name(self):
        if self.user:
            return self.user.get_full_name() or self.user.username
        return self.guest_name or self.delivery_full_name or 'Guest'

    @property
    def customer_email(self):
        if self.user:
            return self.user.email
        return self.guest_email

    @property
    def delivery_address_display(self):
        parts = [
            self.delivery_full_name,
            self.delivery_building,
            self.delivery_street,
            f"Zone {self.delivery_zone}" if self.delivery_zone else '',
            self.delivery_city,
            self.delivery_country,
        ]
        return ', '.join(p for p in parts if p)


class OrderItem(models.Model):
    """Relational per-line-item record for an Order."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    # Snapshot fields so item details survive product edits/deletions
    product_slug = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    product_name_ar = models.CharField(max_length=255, blank=True)
    product_brand = models.CharField(max_length=100, blank=True)
    product_image = models.URLField(blank=True, max_length=500)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.product_name} × {self.quantity} (Order {self.order.order_number})"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class ContactMessage(models.Model):
    """Stores contact form submissions for admin review."""
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, help_text='Internal notes for staff')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'

    def __str__(self):
        return f"{self.name} — {self.subject} ({self.created_at.strftime('%Y-%m-%d')})"
