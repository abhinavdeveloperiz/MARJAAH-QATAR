import json
from django.test import TestCase, Client
from django.urls import reverse
from store.models import User, Category, Brand, Product, Order

class StoreViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name='Laptops', slug='laptops', is_featured=True)
        self.brand = Brand.objects.create(name='Dell')
        self.product = Product.objects.create(
            name='Alienware m18',
            slug='alienware-m18',
            price=12999.00,
            original_price=14999.00,
            category=self.category,
            brand=self.brand,
            stock_count=15,
            in_stock=True,
            specifications_json='[]',
            images_json='[]'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!',
            first_name='Test',
            last_name='User'
        )
        self.staff_user = User.objects.create_user(
            username='staffuser',
            email='staff@example.com',
            password='StaffPassword123!',
            is_staff=True
        )

    def test_public_pages(self):
        pages = [
            '/',
            '/en/',
            '/ar/',
            '/en/shop/',
            '/en/offers/',
            '/en/about/',
            '/en/contact/',
            '/en/cart/',
            '/en/wishlist/',
            '/en/auth/login/',
            '/en/auth/register/',
            '/en/auth/forgot-password/',
            f'/en/product/{self.product.slug}/',
            f'/ar/product/{self.product.slug}/',
        ]
        for url in pages:
            res = self.client.get(url, follow=True)
            self.assertEqual(res.status_code, 200, f"Failed for {url}")

    def test_cart_api(self):
        # 1. Add to cart
        payload = json.dumps({'slug': self.product.slug, 'quantity': 2})
        res = self.client.post('/en/api/cart/add/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('cart_count'), 2)

        # 2. Update cart
        up_payload = json.dumps({'slug': self.product.slug, 'quantity': 3})
        res_up = self.client.post('/en/api/cart/update/', data=up_payload, content_type='application/json')
        self.assertEqual(res_up.status_code, 200)
        self.assertEqual(res_up.json().get('cart_count'), 3)

        # 3. Remove from cart
        rem_payload = json.dumps({'slug': self.product.slug})
        res_rem = self.client.post('/en/api/cart/remove/', data=rem_payload, content_type='application/json')
        self.assertEqual(res_rem.status_code, 200)
        self.assertEqual(res_rem.json().get('cart_count'), 0)

    def test_wishlist_api(self):
        payload = json.dumps({'slug': self.product.slug})
        res = self.client.post('/en/api/wishlist/toggle/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('in_wishlist'))

        # Toggle again
        res2 = self.client.post('/en/api/wishlist/toggle/', data=payload, content_type='application/json')
        self.assertEqual(res2.status_code, 200)
        self.assertFalse(res2.json().get('in_wishlist'))

    def test_account_page(self):
        self.client.force_login(self.user)
        res = self.client.get('/en/account/')
        self.assertEqual(res.status_code, 200)

    def test_admin_dashboard(self):
        self.client.force_login(self.staff_user)
        res = self.client.get('/en/admin-dashboard/')
        self.assertEqual(res.status_code, 200)
