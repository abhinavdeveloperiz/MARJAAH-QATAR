import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class TranslationDict(dict):
    """Dictionary that allows attribute access and safe nested fallback."""
    def __init__(self, data=None, fallback=None):
        super().__init__()
        self._fallback = fallback or {}
        if data:
            for k, v in data.items():
                if isinstance(v, dict):
                    fb_v = self._fallback.get(k) if isinstance(self._fallback, dict) else None
                    self[k] = TranslationDict(v, fb_v)
                else:
                    self[k] = v

    def __getattr__(self, name):
        if name in self:
            return self[name]
        if self._fallback and hasattr(self._fallback, name):
            return getattr(self._fallback, name)
        if self._fallback and isinstance(self._fallback, dict) and name in self._fallback:
            return self._fallback[name]
        return ""

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        if self._fallback and key in self._fallback:
            return self._fallback[key]
        return ""


_EN_CACHE = None
_AR_CACHE = None

def load_translations():
    global _EN_CACHE, _AR_CACHE
    if _EN_CACHE is not None and _AR_CACHE is not None:
        return _EN_CACHE, _AR_CACHE

    en_path = BASE_DIR / 'translations' / 'en.json'
    ar_path = BASE_DIR / 'translations' / 'ar.json'

    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)

    # Extra additions for full coverage
    extra_en = {
        'nav': {
            'language': 'Language',
            'theme': 'Theme',
        },
        'hero': {
            'authority': "M.SHOP • QATAR'S HARDWARE AUTHORITY",
            'marjaah_title': 'MARJAAH',
        },
        'brands': {
            'eyebrow': 'AUTHORIZED GCC PARTNERS',
            'desc': 'Direct authorization and official warranty across global computing titans, gaming pioneers, and hardware innovators in Doha.',
            'explore': 'EXPLORE ALL BRANDS',
        },
        'categories': {
            'eyebrow': 'Explore Collections',
            'products_count': 'products',
            'items_count': 'items',
            'shop_collection': 'Shop Collection',
        },
        'workstations': {
            'eyebrow': 'AUTHORIZED GCC DISTRIBUTION',
            'title_1': 'ULTRA RIGS &',
            'title_2': 'WORKSTATIONS',
            'desc': "Bridging the pinnacle of global computing hardware with Qatar's visionary tech community. Every workstation, GPU, curved display, and peripheral comes backed with local authorized warranties and express Doha dispatch.",
            'warranty': 'OFFICIAL GCC WARRANTY',
            'dispatch': '1-2 DAY DOHA DISPATCH',
            'discover': 'DISCOVER ALL PRODUCTS',
            'whatsapp': 'WHATSAPP HARDWARE DESK',
            'explore': 'EXPLORE',
        },
        'featured': {
            'eyebrow': 'Curated For Performance',
        },
        'flash_deals': {
            'eyebrow': 'Limited Time Drops',
        },
        'new_arrivals': {
            'eyebrow': 'Fresh Off The Assembly',
            'explore': 'Explore All',
        },
        'footer': {
            'marquee_1': 'M.SHOP',
            'marquee_2': 'Qatar Hardware',
            'marquee_3': 'Official Warranty',
            'marquee_4': 'Free Delivery 500+',
            'track_order': 'Track Order',
            'rights_text': 'All rights reserved.',
        }
    }

    extra_ar = {
        'nav': {
            'language': 'اللغة',
            'theme': 'المظهر',
        },
        'hero': {
            'authority': 'M.SHOP • المرجع التقني في قطر',
            'marjaah_title': 'مرجـاح',
        },
        'brands': {
            'eyebrow': 'شركاء معتمدون في دول مجلس التعاون',
            'desc': 'وكلاء معتمدون بضمان رسمي لأبرز عمالقة الحوسبة والألعاب ومبتكري العتاد في الدوحة.',
            'explore': 'استكشف جميع العلامات',
        },
        'categories': {
            'eyebrow': 'استكشف المجموعات',
            'products_count': 'منتج',
            'items_count': 'عنصر',
            'shop_collection': 'تسوق المجموعة',
        },
        'workstations': {
            'eyebrow': 'توزيع معتمد في الخليج',
            'title_1': 'أجهزة فائقة القوة &',
            'title_2': 'محطات عمل',
            'desc': 'نجمع بين قمة عتاد الحوسبة العالمي ومجتمع التكنولوجيا المبتكر في قطر. جميع محطات العمل وبطاقات الشاشة والشاشات المنحنية تأتي مع ضمانات محلية معتمدة وشحن فوري في الدوحة.',
            'warranty': 'ضمان رسمي في دول الخليج',
            'dispatch': 'توصيل في الدوحة خلال 1-2 يوم',
            'discover': 'اكتشف جميع المنتجات',
            'whatsapp': 'مكتب الدعم الفني عبر واتساب',
            'explore': 'استكشف',
        },
        'featured': {
            'eyebrow': 'مختارة للأداء العالي',
        },
        'flash_deals': {
            'eyebrow': 'عروض لفترة محدودة',
        },
        'new_arrivals': {
            'eyebrow': 'وصلت حديثاً للمتجر',
            'explore': 'استكشف الكل',
        },
        'footer': {
            'marquee_1': 'M.SHOP',
            'marquee_2': 'عتاد قطر',
            'marquee_3': 'ضمان رسمي',
            'marquee_4': 'توصيل مجاني 500+ ر.ق',
            'track_order': 'تتبع الطلب',
            'rights_text': 'جميع الحقوق محفوظة.',
        }
    }

    def merge_dict(target, source):
        for k, v in source.items():
            if k in target and isinstance(target[k], dict) and isinstance(v, dict):
                merge_dict(target[k], v)
            else:
                target[k] = v

    merge_dict(en_data, extra_en)
    merge_dict(ar_data, extra_ar)

    _EN_CACHE = TranslationDict(en_data)
    _AR_CACHE = TranslationDict(ar_data, _EN_CACHE)

    return _EN_CACHE, _AR_CACHE


def get_translations(locale='en'):
    en, ar = load_translations()
    return ar if locale == 'ar' else en
