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

    def test_login_otp_flow(self):
        from django.core import mail
        from store.models import LoginOTP

        # Step 1: Submit login credentials
        res = self.client.post('/en/auth/login/', {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        })
        self.assertEqual(res.status_code, 302)
        self.assertTrue(res.url.endswith('/en/auth/verify-otp/'))

        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Login Verification Code', mail.outbox[0].subject)

        # Check LoginOTP record created
        otp_record = LoginOTP.objects.filter(user=self.user, is_used=False).first()
        self.assertIsNotNone(otp_record)
        code = otp_record.code
        self.assertEqual(len(code), 6)

        # Step 2: Test invalid OTP code
        res_fail = self.client.post('/en/auth/verify-otp/', {'otp': '000000'})
        self.assertEqual(res_fail.status_code, 200)
        self.assertContains(res_fail, 'Invalid verification code')

        # Step 3: Test valid OTP code
        res_success = self.client.post('/en/auth/verify-otp/', {'otp': code})
        self.assertEqual(res_success.status_code, 302)
        self.assertTrue(res_success.url.endswith('/en/'))

        # Check user is logged in
        res_acc = self.client.get('/en/account/')
        self.assertEqual(res_acc.status_code, 200)

        # Check OTP is marked as used
        otp_record.refresh_from_db()
        self.assertTrue(otp_record.is_used)

    def test_resend_otp_api(self):
        from store.models import LoginOTP
        # Start login
        self.client.post('/en/auth/login/', {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        })

        # Resend OTP
        res = self.client.post('/en/auth/resend-otp/', content_type='application/json')
        # Rate limit or ok depending on timestamp
        self.assertIn(res.status_code, [200, 429])

    def test_register_otp_flow(self):
        from django.core import mail
        from store.models import User

        # Register new account
        res = self.client.post('/en/auth/register/', {
            'full_name': 'New Registered User',
            'email': 'newuser@example.qa',
            'phone': '+974 5500 1122',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!'
        })
        self.assertEqual(res.status_code, 302)
        self.assertTrue(res.url.endswith('/en/auth/verify-otp/'))

        # CRITICAL ASSERTION: Account MUST NOT be saved to database or admin yet!
        self.assertFalse(User.objects.filter(email='newuser@example.qa').exists())

        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Email Verification Code', mail.outbox[0].subject)

        # Get pending OTP from session
        session = self.client.session
        pending = session.get('pending_registration')
        self.assertIsNotNone(pending)
        otp_code = pending.get('otp_code')
        self.assertEqual(len(otp_code), 6)

        # Step 2: Invalid OTP should NOT create user
        res_bad = self.client.post('/en/auth/verify-otp/', {'otp': '999999'})
        self.assertEqual(res_bad.status_code, 200)
        self.assertFalse(User.objects.filter(email='newuser@example.qa').exists())

        # Step 3: Valid OTP creates and saves the user to DB & admin, then logs them in
        res_v = self.client.post('/en/auth/verify-otp/', {'otp': otp_code})
        self.assertEqual(res_v.status_code, 302)

        # Account is now in database & admin!
        self.assertTrue(User.objects.filter(email='newuser@example.qa').exists())
        new_u = User.objects.get(email='newuser@example.qa')
        self.assertEqual(new_u.first_name, 'New')
        self.assertEqual(new_u.last_name, 'Registered User')

        # User is authenticated
        res_acc = self.client.get('/en/account/')
        self.assertEqual(res_acc.status_code, 200)

    def test_register_duplicate_email(self):
        # Registering with existing email should show error and not overwrite
        res = self.client.post('/en/auth/register/', {
            'full_name': 'Duplicate User',
            'email': 'test@example.com',
            'phone': '+974 5500 1122',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!'
        })
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'already exists')


from unittest.mock import patch
from store.fatoorah import clean_phone_number, execute_payment, get_payment_status

class MyFatoorahIntegrationTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.order = Order.objects.create(
            guest_name='Ahmad Al-Kuwari',
            guest_email='ahmad@example.qa',
            guest_phone='+97455123456',
            subtotal=500.00,
            shipping=0.00,
            total=500.00,
            payment_method='card',
            payment_status='pending',
        )

    def test_phone_number_cleaner(self):
        code, num = clean_phone_number('+974 5512 3456')
        self.assertEqual(code, '974')
        self.assertEqual(num, '55123456')

        code, num = clean_phone_number('55123456')
        self.assertEqual(code, '974')
        self.assertEqual(num, '55123456')

        code, num = clean_phone_number('0097455123456')
        self.assertEqual(code, '974')
        self.assertEqual(num, '55123456')

    @patch('store.fatoorah.requests.post')
    def test_execute_payment_success(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'IsSuccess': True,
            'Data': {
                'InvoiceId': 987654,
                'PaymentURL': 'https://demo.myfatoorah.com/pay/mockurl'
            }
        }
        with patch('store.fatoorah._get_api_token', return_value='fake_token_123'):
            res = execute_payment(self.order, 'http://test/cb/', 'http://test/err/')
            self.assertTrue(res['success'])
            self.assertEqual(res['invoice_id'], '987654')
            self.assertEqual(res['payment_url'], 'https://demo.myfatoorah.com/pay/mockurl')

    @patch('store.views.get_payment_status')
    def test_fatoorah_callback_success(self, mock_status):
        mock_status.return_value = {
            'success': True,
            'is_paid': True,
            'invoice_id': '987654',
            'amount': 500.00,
            'transaction_id': 'TXN_QAT_123',
            'raw': {
                'CustomerReference': str(self.order.pk),
                'InvoiceStatus': 'Paid',
            }
        }
        res = self.client.get(f'/en/checkout/fatoorah/callback/?paymentId=PID_123')
        self.assertEqual(res.status_code, 302)
        self.assertTrue(res.url.endswith(f'/checkout/success/{self.order.pk}/'))

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'paid')
        self.assertEqual(self.order.status, 'confirmed')
        self.assertEqual(self.order.fatoorah_payment_id, 'PID_123')
        self.assertEqual(self.order.fatoorah_transaction_id, 'TXN_QAT_123')

    def test_fatoorah_error_view(self):
        res = self.client.get(f'/en/checkout/fatoorah/error/?order_id={self.order.pk}')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, self.order.order_number)
