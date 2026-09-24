"""
MyFatoorah Payment Gateway Service for MARJAAH / M.SHOP Qatar.
Handles communication with MyFatoorah REST API v2:
  - InitiatePayment / ExecutePayment (Creates hosted invoice link)
  - GetPaymentStatus (Verifies payment authenticity server-to-server)
  - Webhook validation (Instant Payment Notification / IPN)
"""
import base64
import io
import logging
import re
import requests
import qrcode
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_qr_base64(data: str) -> str:
    """Generates a high-quality base64-encoded PNG QR Code for a given URL or text."""
    if not data:
        return ''
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"QR code generation failed: {e}")
        return ''


def _get_api_url() -> str:
    """Return the MyFatoorah base endpoint according to settings."""
    url = getattr(settings, 'MYFATOORAH_API_URL', 'https://apitest.myfatoorah.com')
    return url.rstrip('/')


def _get_api_token() -> str:
    """Return the configured MyFatoorah API token."""
    return getattr(settings, 'MYFATOORAH_API_TOKEN', '').strip()


def _get_headers() -> dict:
    """Construct Authorization and Content-Type headers."""
    token = _get_api_token()
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def clean_phone_number(raw_phone: str) -> tuple[str, str]:
    """
    Sanitizes telephone input into (country_code, local_phone).
    Defaults to Qatar (+974) if no country code provided.
    """
    if not raw_phone:
        return '974', '00000000'

    cleaned = re.sub(r'[^\d+]', '', str(raw_phone))
    if cleaned.startswith('+974'):
        return '974', cleaned[4:]
    elif cleaned.startswith('00974'):
        return '974', cleaned[5:]
    elif cleaned.startswith('974') and len(cleaned) > 8:
        return '974', cleaned[3:]
    elif cleaned.startswith('+'):
        # Generic international code
        return cleaned[1:4], cleaned[4:]
    else:
        # Default to Qatar (+974)
        return '974', cleaned.lstrip('0')


def execute_payment(order, callback_url: str, error_url: str, language: str = 'en', payment_method_id: int = 0) -> dict:
    """
    Calls MyFatoorah API to create an invoice and obtain the secure payment URL.
    - If payment_method_id > 0: Calls /v2/ExecutePayment for direct gateway (e.g. Visa/Mastercard = 2)
    - If payment_method_id == 0: Calls /v2/SendPayment (NotificationOption='LNK') for the hosted
      portal where customers can choose between all eligible methods (Cards, Apple Pay, NAPS, etc.)

    Returns dict:
      {
        'success': bool,
        'payment_url': str,
        'invoice_id': str | int,
        'error': str
      }
    """
    token = _get_api_token()
    if not token:
        logger.error("MyFatoorah API Token is missing in settings / .env.")
        return {
            'success': False,
            'payment_url': '',
            'invoice_id': '',
            'error': 'Payment gateway is not configured with an API token. Please contact store administrator.'
        }

    country_code, local_phone = clean_phone_number(order.customer_phone)
    currency = getattr(settings, 'MYFATOORAH_CURRENCY', 'QAR')
    base_url = _get_api_url()

    # Prepare itemized list.
    # MyFatoorah requires sum(Qty * UnitPrice) == InvoiceValue exactly.
    # The order total includes shipping, so we add a Shipping line if needed.
    invoice_items = []
    for item in (order.items or []):
        try:
            invoice_items.append({
                'ItemName': str(item.get('name', 'Product'))[:90],
                'Quantity': int(item.get('quantity', 1)),
                'UnitPrice': round(float(item.get('price', 0.0)), 2),
            })
        except Exception:
            pass

    order_total = round(float(order.total), 2)

    if invoice_items:
        items_sum = round(sum(i['Quantity'] * i['UnitPrice'] for i in invoice_items), 2)
        diff = round(order_total - items_sum, 2)
        if diff > 0:
            # Add shipping / fees as a separate line item
            invoice_items.append({
                'ItemName': 'Shipping & Handling',
                'Quantity': 1,
                'UnitPrice': diff,
            })
        elif diff < 0:
            # Items sum exceeds total (shouldn't happen, but safety: drop items)
            invoice_items = []

    if payment_method_id > 0:
        endpoint = f"{base_url}/v2/ExecutePayment"
        payload = {
            'PaymentMethodId': int(payment_method_id),
            'CustomerName': (order.customer_name or 'Valued Customer')[:100],
            'DisplayCurrencyIso': currency,
            'MobileCountryCode': f"+{country_code}",
            'CustomerMobile': local_phone[:15],
            'CustomerEmail': (order.customer_email or 'customer@marjaah.qa')[:100],
            'InvoiceValue': order_total,
            'CallBackUrl': callback_url,
            'ErrorUrl': error_url,
            'Language': 'ar' if language == 'ar' else 'en',
            'CustomerReference': str(order.pk),
            'UserDefinedField': f"Order #{order.order_number}",
            'ExpiryDate': '',
        }
    else:
        # Standard hosted checkout with all payment options
        endpoint = f"{base_url}/v2/SendPayment"
        payload = {
            'NotificationOption': 'LNK',
            'CustomerName': (order.customer_name or 'Valued Customer')[:100],
            'DisplayCurrencyIso': currency,
            'CustomerMobile': local_phone[:15],
            'CustomerEmail': (order.customer_email or 'customer@marjaah.qa')[:100],
            'InvoiceValue': order_total,
            'CallBackUrl': callback_url,
            'ErrorUrl': error_url,
            'Language': 'ar' if language == 'ar' else 'en',
            'CustomerReference': str(order.pk),
            'UserDefinedField': f"Order #{order.order_number}",
            'ExpiryDate': '',
        }

    if invoice_items:
        payload['InvoiceItems'] = invoice_items

    try:
        response = requests.post(endpoint, json=payload, headers=_get_headers(), timeout=30)
        try:
            data = response.json()
        except Exception:
            data = {}

        if response.status_code == 200 and data.get('IsSuccess'):
            data_dict = data.get('Data', {}) or {}
            payment_url = data_dict.get('InvoiceURL') or data_dict.get('PaymentURL') or ''
            invoice_id = data_dict.get('InvoiceId', '')
            return {
                'success': True,
                'payment_url': payment_url,
                'invoice_id': str(invoice_id),
                'error': ''
            }
        else:
            # Handle validation errors or API rejection
            err_msg = data.get('Message') or 'Unable to initialize payment invoice.'
            if data.get('ValidationErrors'):
                validation_details = ', '.join(
                    [f"{v.get('Name')}: {v.get('Error')}" for v in data.get('ValidationErrors', [])]
                )
                err_msg = f"{err_msg} ({validation_details})"

            # Provide extra diagnostic hint for common status codes
            if response.status_code == 401:
                err_msg = f"{err_msg} - Please verify that your MyFatoorah API key is active, not expired, and has 'Create Invoices' permissions assigned in your MyFatoorah portal."
            elif response.status_code == 500 and not data.get('Message'):
                err_msg = f"MyFatoorah gateway server error (HTTP 500). Please check your API URL ({base_url}) and credentials."

            logger.error(f"MyFatoorah payment API error: {err_msg} (Endpoint: {endpoint}, Status: {response.status_code})")
            return {
                'success': False,
                'payment_url': '',
                'invoice_id': '',
                'error': err_msg
            }
    except requests.RequestException as exc:
        logger.exception(f"Connection error to MyFatoorah API: {exc}")
        return {
            'success': False,
            'payment_url': '',
            'invoice_id': '',
            'error': 'Network error connecting to payment gateway. Please try again.'
        }


def get_payment_status(key: str, key_type: str = 'PaymentId') -> dict:
    """
    Calls MyFatoorah /v2/GetPaymentStatus server-to-server to verify
    the genuine payment status of an invoice or transaction.

    Returns dict:
      {
        'success': bool,
        'is_paid': bool,
        'invoice_id': str,
        'payment_id': str,
        'transaction_id': str,
        'amount': float,
        'currency': str,
        'raw': dict,
        'error': str
      }
    """
    token = _get_api_token()
    if not token:
        return {
            'success': False,
            'is_paid': False,
            'error': 'API token missing.'
        }

    base_url = _get_api_url()
    endpoint = f"{base_url}/v2/GetPaymentStatus"
    payload = {
        'Key': str(key),
        'KeyType': key_type,
    }

    try:
        response = requests.post(endpoint, json=payload, headers=_get_headers(), timeout=30)
        data = response.json()

        if response.status_code == 200 and data.get('IsSuccess'):
            inv_data = data.get('Data', {})
            invoice_status = inv_data.get('InvoiceStatus', '').strip()
            is_paid = (invoice_status.lower() == 'paid')

            transactions = inv_data.get('InvoiceTransactions', [])
            latest_tx = transactions[-1] if transactions else {}

            payment_id = str(latest_tx.get('PaymentId') or key if key_type == 'PaymentId' else '')
            tx_id = str(latest_tx.get('TransactionId') or '')
            paid_amount = float(inv_data.get('InvoiceValue') or 0.0)
            paid_currency = inv_data.get('InvoiceDisplayCurrency') or latest_tx.get('PaidCurrency') or 'QAR'

            return {
                'success': True,
                'is_paid': is_paid,
                'invoice_id': str(inv_data.get('InvoiceId', '')),
                'payment_id': payment_id,
                'transaction_id': tx_id,
                'amount': paid_amount,
                'currency': paid_currency,
                'raw': inv_data,
                'error': ''
            }
        else:
            err_msg = data.get('Message') or 'Unable to query payment status.'
            logger.error(f"MyFatoorah GetPaymentStatus failed: {err_msg}")
            return {
                'success': False,
                'is_paid': False,
                'error': err_msg,
                'raw': data
            }
    except requests.RequestException as exc:
        logger.exception(f"Connection error checking MyFatoorah payment status: {exc}")
        return {
            'success': False,
            'is_paid': False,
            'error': 'Failed to connect to payment gateway to verify status.'
        }
