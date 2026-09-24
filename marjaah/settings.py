"""
Django settings for Marjaah Trading — M.SHOP Qatar
Supports: local development (SQLite) + Render staging (PostgreSQL) + cPanel production
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file if present
_env_file = BASE_DIR / '.env'
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        with open(_env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k, v = k.strip(), v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v

# ─── SECURITY ─────────────────────────────────────────────────────────────────
# DEBUG is False on Render and cPanel (set DEBUG=True in .env for local dev)
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        # Fallback only for non-production local development if .env is missing
        SECRET_KEY = 'django-insecure-local-dev-fallback-key'
    else:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured("SECRET_KEY environment variable is required in production.")

# Dynamic ALLOWED_HOSTS — automatically supports Render and custom domains
_ALLOWED_HOST = os.environ.get('ALLOWED_HOST', '')
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '.onrender.com']
if _ALLOWED_HOST:
    for host in _ALLOWED_HOST.split(','):
        if host.strip():
            ALLOWED_HOSTS.append(host.strip())
if DEBUG:
    ALLOWED_HOSTS.append('*')

# CSRF trusted origins for HTTPS deployments (Render, cPanel)
CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'https://marjaah-qatar.onrender.com',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]
_SITE_URL = os.environ.get('SITE_URL', '')
if _SITE_URL:
    CSRF_TRUSTED_ORIGINS.append(_SITE_URL)

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ─── APPLICATIONS ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'store',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'marjaah.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'builtins': ['store.templatetags.store_tags'],
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.i18n',
                'store.context_processors.site_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'marjaah.wsgi.application'

# ─── DATABASE ─────────────────────────────────────────────────────────────────
# Uses PostgreSQL on Render/cPanel (via DATABASE_URL env var), SQLite locally
_DATABASE_URL = os.environ.get('DATABASE_URL', '')

if _DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=_DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ─── PASSWORD VALIDATION ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── INTERNATIONALIZATION ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en'
LANGUAGES = [
    ('en', 'English'),
    ('ar', 'Arabic'),
]

TIME_ZONE = 'Asia/Qatar'
USE_I18N = True
USE_L10N = True
USE_TZ = True

LOCALE_PATHS = [BASE_DIR / 'locale']

# ─── STATIC & MEDIA FILES ────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── AUTHENTICATION ───────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'store.User'

LOGIN_URL = '/en/auth/login/'
LOGIN_REDIRECT_URL = '/en/'
LOGOUT_REDIRECT_URL = '/en/'

SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days

# ─── EMAIL CONFIGURATION ──────────────────────────────────────────────────────
# In development: emails are printed to the console
# In production: set EMAIL_BACKEND + SMTP credentials via environment variables
_email_backend_env = os.environ.get('EMAIL_BACKEND')
if _email_backend_env:
    EMAIL_BACKEND = _email_backend_env
elif os.environ.get('EMAIL_HOST_USER') and os.environ.get('EMAIL_HOST_PASSWORD'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'M.SHOP Qatar <noreply@marjaah.qa>')
CONTACT_NOTIFICATION_EMAIL = os.environ.get('CONTACT_NOTIFICATION_EMAIL', EMAIL_HOST_USER)

# ─── PASSWORD RESET ───────────────────────────────────────────────────────────
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour

# ─── PRODUCTION SECURITY (only active when DEBUG=False) ─────────────────────
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    # Only enable HTTPS-strict cookies if you have HTTPS (Render does)
    if os.environ.get('HTTPS_ENABLED', 'False').lower() in ('true', '1'):
        SESSION_COOKIE_SECURE = True
        CSRF_COOKIE_SECURE = True
        SECURE_HSTS_SECONDS = 31536000
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ─── JAZZMIN ADMIN SETTINGS ──────────────────────────────────────────────────
JAZZMIN_SETTINGS = {
    # Title & Branding
    "site_title": "Marjaah Trading Admin",
    "site_header": "Marjaah Trading",
    "site_brand": None,
    "site_logo": "logo-light.png",
    "login_logo": "logo-light.png",
    "site_logo_classes": "img-fluid",
    "site_icon": "favicon.png",
    "welcome_sign": "Welcome to Marjaah Trading Portal",
    "copyright": "Marjaah Trading / M.SHOP Qatar",

    # Search & Quick Links
    "search_model": ["store.Product", "store.Banner"],
    "user_avatar": None,
    "topmenu_links": [
        {"name": "Live Store", "url": "/", "new_window": True},
        {"name": "Staff Dashboard", "url": "/admin-dashboard/", "new_window": True},
        {"model": "store.Banner"},
        {"model": "store.Order"},
        {"model": "store.Product"},
    ],

    # Navigation & Sidebar
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": [
        "store.Banner",
        "store.Order",
        "store.OrderItem",
        "store.Product",
        "store.Category",
        "store.Subcategory",
        "store.Brand",
        "store.ContactMessage",
        "store.User",
        "store.Address",
        "auth",
    ],

    # Custom Icons (FontAwesome 5)
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.Group": "fas fa-users",
        "store.Banner": "fas fa-images",
        "store.User": "fas fa-user-shield",
        "store.Category": "fas fa-th-large",
        "store.Subcategory": "fas fa-tags",
        "store.Brand": "fas fa-copyright",
        "store.Product": "fas fa-box-open",
        "store.Address": "fas fa-map-marker-alt",
        "store.Order": "fas fa-shopping-bag",
        "store.OrderItem": "fas fa-receipt",
        "store.ContactMessage": "fas fa-envelope-open-text",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    # UI Options
    "related_modal_active": True,
    "custom_css": "css/admin-jazzmin.css",
    "custom_js": None,
    "use_google_fonts_cdn": True,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "store.order": "collapsible",
        "store.product": "horizontal_tabs",
    },
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-white",
    "accent": "accent-indigo",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-light-indigo",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "default_theme_mode": "light",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
}

# ─── MYFATOORAH PAYMENT GATEWAY ───────────────────────────────────────────────
MYFATOORAH_API_TOKEN = os.environ.get('MYFATOORAH_API_TOKEN', '')
MYFATOORAH_IS_SANDBOX = os.environ.get('MYFATOORAH_IS_SANDBOX', 'True').lower() in ('true', '1', 'yes')
# Qatar Live URL is https://api-qa.myfatoorah.com, Sandbox URL is https://apitest.myfatoorah.com
_default_api_url = 'https://apitest.myfatoorah.com' if MYFATOORAH_IS_SANDBOX else 'https://api-qa.myfatoorah.com'
MYFATOORAH_API_URL = os.environ.get('MYFATOORAH_API_URL', _default_api_url).rstrip('/')
MYFATOORAH_WEBHOOK_SECRET = os.environ.get('MYFATOORAH_WEBHOOK_SECRET', '')
MYFATOORAH_CURRENCY = os.environ.get('MYFATOORAH_CURRENCY', 'QAR')
