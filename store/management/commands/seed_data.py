import json
from django.core.management.base import BaseCommand
from store.models import Category, Subcategory, Brand, Product


CATEGORIES_DATA = [
    {"slug": "laptops", "name": "Laptops", "name_ar": "الحواسيب المحمولة", "image": "/static/images/categories/cat-laptops.jpg", "product_count": 124, "is_featured": True, "order": 1,
     "subcategories": [
         {"slug": "gaming-laptops", "name": "Gaming Laptops", "name_ar": "لابتوب الألعاب"},
         {"slug": "business-laptops", "name": "Business Laptops", "name_ar": "لابتوب الأعمال"},
         {"slug": "ultrabooks", "name": "Ultrabooks", "name_ar": "أولترابوك"},
     ]},
    {"slug": "desktops", "name": "Desktops", "name_ar": "الحواسيب المكتبية", "image": "/static/images/categories/cat-desktops.jpg", "product_count": 68, "is_featured": True, "order": 2,
     "subcategories": [
         {"slug": "gaming-pcs", "name": "Gaming PCs", "name_ar": "أجهزة الألعاب"},
         {"slug": "workstations", "name": "Workstations", "name_ar": "محطات العمل"},
     ]},
    {"slug": "monitors", "name": "Monitors", "name_ar": "الشاشات", "image": "/static/images/products/samsung-odyssey-g5.jpg", "product_count": 56, "is_featured": True, "order": 3,
     "subcategories": [
         {"slug": "gaming-monitors", "name": "Gaming Monitors", "name_ar": "شاشات الألعاب"},
         {"slug": "4k-monitors", "name": "4K Monitors", "name_ar": "شاشات 4K"},
     ]},
    {"slug": "peripherals", "name": "Keyboards & Mice", "name_ar": "لوحات المفاتيح والفأرة", "image": "/static/images/products/corsair-k70-pro.jpg", "product_count": 93, "is_featured": True, "order": 4,
     "subcategories": [
         {"slug": "mechanical-keyboards", "name": "Mechanical Keyboards", "name_ar": "لوحات مفاتيح ميكانيكية"},
         {"slug": "gaming-mice", "name": "Gaming Mice", "name_ar": "فأرة الألعاب"},
     ]},
    {"slug": "storage", "name": "Storage", "name_ar": "التخزين", "image": "/static/images/products/samsung-970-evo-plus.jpg", "product_count": 47, "is_featured": False, "order": 5,
     "subcategories": [
         {"slug": "ssds", "name": "SSD Drives", "name_ar": "أقراص SSD"},
         {"slug": "hdds", "name": "Hard Drives", "name_ar": "أقراص صلبة"},
     ]},
    {"slug": "gaming", "name": "Gaming Gear", "name_ar": "معدات الألعاب", "image": "/static/images/products/razer-blackshark-v2.jpg", "product_count": 82, "is_featured": True, "order": 6,
     "subcategories": [
         {"slug": "headsets", "name": "Gaming Headsets", "name_ar": "سماعات الألعاب"},
         {"slug": "controllers", "name": "Controllers", "name_ar": "أذرع التحكم"},
     ]},
    {"slug": "networking", "name": "Networking", "name_ar": "الشبكات", "image": "/static/images/products/tplink-deco-xe75.jpg", "product_count": 38, "is_featured": False, "order": 7,
     "subcategories": [
         {"slug": "routers", "name": "Routers", "name_ar": "أجهزة التوجيه"},
     ]},
    {"slug": "printers", "name": "Printers", "name_ar": "الطابعات", "image": "/static/images/categories/cat-printers.svg", "product_count": 29, "is_featured": False, "order": 8,
     "subcategories": [
         {"slug": "inkjet", "name": "Inkjet Printers", "name_ar": "طابعات نفث الحبر"},
     ]},
]

BRANDS_DATA = ["ASUS", "Apple", "Dell", "HP", "Lenovo", "Samsung", "LG", "Corsair", "Razer", "Kingston", "TP-Link", "Alienware", "MSI", "Acer", "Logitech", "SteelSeries"]

PRODUCTS_DATA = [
    {
        "slug": "asus-rog-strix-g16-gaming-laptop",
        "name": "ASUS ROG Strix G16 Gaming Laptop",
        "name_ar": "لابتوب الألعاب ASUS ROG Strix G16",
        "brand": "ASUS",
        "category": "laptops",
        "subcategory": "gaming-laptops",
        "price": 6499,
        "original_price": 7299,
        "images": ["/static/images/products/asus-rog-g16.jpg"],
        "short_description": "Intel Core i9, RTX 4070, 32GB RAM, 1TB SSD",
        "short_description_ar": "معالج Intel Core i9، كرت RTX 4070، رام 32 جيجا",
        "description": "Dominate every game with the ROG Strix G16 — featuring Intel's 14th Gen i9 processor and NVIDIA RTX 4070, 240Hz QHD display, and advanced cooling.",
        "description_ar": "تحكم في كل لعبة مع ROG Strix G16 — بمعالج Intel الجيل 14 i9 وبطاقة NVIDIA RTX 4070.",
        "specifications": [
            {"key": "Processor", "keyAr": "المعالج", "value": "Intel Core i9-14900HX", "valueAr": "Intel Core i9-14900HX"},
            {"key": "GPU", "keyAr": "كرت الشاشة", "value": "NVIDIA RTX 4070 8GB", "valueAr": "NVIDIA RTX 4070"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "32GB DDR5 5600MHz", "valueAr": "32 جيجا DDR5"},
            {"key": "Storage", "keyAr": "التخزين", "value": "1TB NVMe SSD", "valueAr": "1 تيرا NVMe SSD"},
            {"key": "Display", "keyAr": "الشاشة", "value": "16\" QHD 240Hz IPS", "valueAr": "16 بوصة QHD 240Hz"},
        ],
        "in_stock": True, "stock_count": 12, "is_new": True, "is_featured": True, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.8, "review_count": 47, "sku": "ROG-G16-I9-4070", "delivery_days": 2, "warranty_months": 24,
        "tags": ["gaming", "laptop", "asus", "rog"],
    },
    {
        "slug": "macbook-pro-m3-14-inch",
        "name": "Apple MacBook Pro 14\" M3 Pro",
        "name_ar": "Apple MacBook Pro 14 بوصة M3 Pro",
        "brand": "Apple",
        "category": "laptops",
        "subcategory": "ultrabooks",
        "price": 9299,
        "original_price": None,
        "images": ["/static/images/products/macbook-pro-m3.jpg"],
        "short_description": "M3 Pro chip, 18GB RAM, 512GB SSD, Liquid Retina XDR",
        "short_description_ar": "شريحة M3 Pro، ذاكرة 18 جيجا، SSD 512 جيجا",
        "description": "The most advanced Mac laptop. M3 Pro chip delivers exceptional performance with a stunning Liquid Retina XDR display.",
        "description_ar": "أقوى MacBook على الإطلاق بشريحة M3 Pro وشاشة Liquid Retina XDR الرائعة.",
        "specifications": [
            {"key": "Chip", "keyAr": "الشريحة", "value": "Apple M3 Pro (11-core CPU)", "valueAr": "Apple M3 Pro"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "18GB Unified Memory", "valueAr": "18 جيجا Unified Memory"},
            {"key": "Storage", "keyAr": "التخزين", "value": "512GB SSD", "valueAr": "512 جيجا SSD"},
            {"key": "Display", "keyAr": "الشاشة", "value": "14.2\" Liquid Retina XDR", "valueAr": "14.2 بوصة Liquid Retina XDR"},
        ],
        "in_stock": True, "stock_count": 8, "is_new": False, "is_featured": True, "is_best_seller": True, "is_on_sale": False,
        "rating": 4.9, "review_count": 89, "sku": "MBP14-M3PRO-18-512", "delivery_days": 1, "warranty_months": 12,
        "tags": ["apple", "macbook", "laptop", "m3"],
    },
    {
        "slug": "samsung-odyssey-g5-27-curved",
        "name": "Samsung Odyssey G5 27\" Curved Gaming Monitor",
        "name_ar": "شاشة Samsung Odyssey G5 27 بوصة منحنية",
        "brand": "Samsung",
        "category": "monitors",
        "subcategory": "gaming-monitors",
        "price": 1299,
        "original_price": 1599,
        "images": ["/static/images/products/samsung-odyssey-g5.jpg"],
        "short_description": "27\" QHD 165Hz, 1ms, FreeSync Premium, HDR10",
        "short_description_ar": "27 بوصة QHD 165Hz، 1ms، FreeSync Premium",
        "description": "Immerse yourself in stunning 1000R curved gameplay with QHD resolution, 165Hz refresh rate, and FreeSync Premium technology.",
        "description_ar": "استمتع بتجربة لعب مذهلة بشاشة منحنية 1000R بدقة QHD و165Hz.",
        "specifications": [
            {"key": "Size", "keyAr": "المقاس", "value": "27 inches", "valueAr": "27 بوصة"},
            {"key": "Resolution", "keyAr": "الدقة", "value": "2560x1440 (QHD)", "valueAr": "2560x1440 (QHD)"},
            {"key": "Refresh Rate", "keyAr": "معدل التحديث", "value": "165Hz", "valueAr": "165Hz"},
            {"key": "Response Time", "keyAr": "وقت الاستجابة", "value": "1ms (MPRT)", "valueAr": "1ms"},
        ],
        "in_stock": True, "stock_count": 15, "is_new": False, "is_featured": True, "is_best_seller": False, "is_on_sale": True,
        "rating": 4.6, "review_count": 134, "sku": "SAM-ODY-G5-27", "delivery_days": 2, "warranty_months": 24,
        "tags": ["monitor", "samsung", "gaming", "curved"],
    },
    {
        "slug": "corsair-k70-pro-mechanical-keyboard",
        "name": "Corsair K70 PRO RGB Mechanical Gaming Keyboard",
        "name_ar": "لوحة المفاتيح الميكانيكية Corsair K70 PRO RGB",
        "brand": "Corsair",
        "category": "peripherals",
        "subcategory": "mechanical-keyboards",
        "price": 699,
        "original_price": 849,
        "images": ["/static/images/products/corsair-k70-pro.jpg"],
        "short_description": "Cherry MX Speed switches, PBT Double-shot keycaps, USB passthrough",
        "short_description_ar": "مفاتيح Cherry MX Speed، كابات PBT مزدوجة الحقن",
        "description": "The K70 PRO mechanical gaming keyboard features Cherry MX Speed switches for ultra-fast actuation and per-key RGB backlighting.",
        "description_ar": "لوحة المفاتيح K70 PRO بمفاتيح Cherry MX Speed للاستجابة الفائقة وإضاءة RGB لكل مفتاح.",
        "specifications": [
            {"key": "Switch", "keyAr": "المفاتيح", "value": "Cherry MX Speed Silver", "valueAr": "Cherry MX Speed Silver"},
            {"key": "Layout", "keyAr": "التصميم", "value": "Full-size (104 keys)", "valueAr": "كامل الحجم (104 مفتاح)"},
            {"key": "Backlighting", "keyAr": "الإضاءة", "value": "Per-key RGB", "valueAr": "RGB لكل مفتاح"},
        ],
        "in_stock": True, "stock_count": 22, "is_new": False, "is_featured": True, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.7, "review_count": 203, "sku": "COR-K70PRO-RGB", "delivery_days": 1, "warranty_months": 24,
        "tags": ["keyboard", "corsair", "mechanical", "gaming"],
    },
    {
        "slug": "samsung-970-evo-plus-1tb",
        "name": "Samsung 970 EVO Plus 1TB NVMe SSD",
        "name_ar": "Samsung 970 EVO Plus NVMe SSD سعة 1 تيرابايت",
        "brand": "Samsung",
        "category": "storage",
        "subcategory": "ssds",
        "price": 379,
        "original_price": 449,
        "images": ["/static/images/products/samsung-970-evo-plus.jpg"],
        "short_description": "M.2 NVMe, 3500MB/s Read, 3300MB/s Write, 5-Year Warranty",
        "short_description_ar": "M.2 NVMe، سرعة قراءة 3500 ميجابايت/ثانية، ضمان 5 سنوات",
        "description": "The Samsung 970 EVO Plus delivers blazing fast NVMe speeds up to 3500MB/s for dramatically faster load times.",
        "description_ar": "يوفر Samsung 970 EVO Plus سرعات NVMe فائقة تصل إلى 3500 ميجابايت/ثانية.",
        "specifications": [
            {"key": "Capacity", "keyAr": "السعة", "value": "1TB", "valueAr": "1 تيرابايت"},
            {"key": "Interface", "keyAr": "الواجهة", "value": "M.2 NVMe PCIe 3.0", "valueAr": "M.2 NVMe PCIe 3.0"},
            {"key": "Read Speed", "keyAr": "سرعة القراءة", "value": "3,500 MB/s", "valueAr": "3500 ميجابايت/ثانية"},
            {"key": "Write Speed", "keyAr": "سرعة الكتابة", "value": "3,300 MB/s", "valueAr": "3300 ميجابايت/ثانية"},
        ],
        "in_stock": True, "stock_count": 35, "is_new": False, "is_featured": False, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.8, "review_count": 312, "sku": "SAM-970EVO-1TB", "delivery_days": 1, "warranty_months": 60,
        "tags": ["ssd", "samsung", "storage", "nvme"],
    },
    {
        "slug": "razer-blackshark-v2-headset",
        "name": "Razer BlackShark V2 Gaming Headset",
        "name_ar": "سماعة الألعاب Razer BlackShark V2",
        "brand": "Razer",
        "category": "gaming",
        "subcategory": "headsets",
        "price": 449,
        "original_price": 529,
        "images": ["/static/images/products/razer-blackshark-v2.jpg"],
        "short_description": "THX 7.1 Spatial Audio, TriForce 50mm Drivers, HyperClear Mic",
        "short_description_ar": "صوت مكاني THX 7.1، سماعات TriForce 50mm، ميكروفون HyperClear",
        "description": "The Razer BlackShark V2 with THX Spatial Audio and TriForce titanium 50mm drivers delivers studio-grade gaming audio.",
        "description_ar": "سماعة BlackShark V2 بصوت THX المكاني وسماعات TriForce تيتانيوم 50mm.",
        "specifications": [
            {"key": "Drivers", "keyAr": "السماعات", "value": "TriForce 50mm Titanium", "valueAr": "TriForce 50mm تيتانيوم"},
            {"key": "Audio", "keyAr": "الصوت", "value": "THX 7.1 Spatial", "valueAr": "THX 7.1 Spatial"},
            {"key": "Connectivity", "keyAr": "الاتصال", "value": "3.5mm + USB audio", "valueAr": "3.5mm + USB"},
        ],
        "in_stock": True, "stock_count": 18, "is_new": False, "is_featured": True, "is_best_seller": False, "is_on_sale": True,
        "rating": 4.5, "review_count": 178, "sku": "RAZ-BSV2-PRO", "delivery_days": 2, "warranty_months": 24,
        "tags": ["headset", "razer", "gaming", "audio"],
    },
    {
        "slug": "tplink-deco-xe75-wifi6e",
        "name": "TP-Link Deco XE75 WiFi 6E Mesh System",
        "name_ar": "نظام TP-Link Deco XE75 WiFi 6E الشبكي",
        "brand": "TP-Link",
        "category": "networking",
        "subcategory": "routers",
        "price": 1199,
        "original_price": None,
        "images": ["/static/images/products/tplink-deco-xe75.jpg"],
        "short_description": "WiFi 6E Tri-band, 5400Mbps, 6GHz Band, Whole Home Coverage",
        "short_description_ar": "WiFi 6E ثلاثي النطاق، 5400 ميجابت/ثانية، نطاق 6 جيجاهرتز",
        "description": "Experience next-generation WiFi 6E with the Deco XE75 — featuring a 6GHz band for blazing fast speeds with less interference.",
        "description_ar": "جرب WiFi 6E من الجيل التالي مع Deco XE75 بنطاق 6 جيجاهرتز لسرعات فائقة.",
        "specifications": [
            {"key": "WiFi Standard", "keyAr": "معيار WiFi", "value": "WiFi 6E (802.11ax)", "valueAr": "WiFi 6E"},
            {"key": "Speed", "keyAr": "السرعة", "value": "Up to 5400Mbps", "valueAr": "حتى 5400 ميجابت/ثانية"},
            {"key": "Coverage", "keyAr": "التغطية", "value": "Up to 5,500 sq ft (2-pack)", "valueAr": "حتى 511 متر مربع"},
        ],
        "in_stock": True, "stock_count": 7, "is_new": True, "is_featured": False, "is_best_seller": False, "is_on_sale": False,
        "rating": 4.6, "review_count": 67, "sku": "TPL-DECO-XE75-2P", "delivery_days": 2, "warranty_months": 36,
        "tags": ["networking", "wifi6e", "tplink", "mesh"],
    },
    {
        "slug": "alienware-m18-r2-gaming-laptop",
        "name": "Alienware m18 R2 Gaming Laptop",
        "name_ar": "لابتوب الألعاب Alienware m18 R2",
        "brand": "Alienware",
        "category": "laptops",
        "subcategory": "gaming-laptops",
        "price": 12499,
        "original_price": 13999,
        "images": ["/static/images/products/alienware-m18.jpg"],
        "short_description": "Intel Core i9-14900HX, RTX 4090, 32GB DDR5, 18\" QHD+",
        "short_description_ar": "Intel i9، RTX 4090، 32 جيجا DDR5، شاشة 18 بوصة QHD+",
        "description": "The most powerful Alienware laptop ever. RTX 4090 graphics and 14th Gen Intel Core i9 in an 18-inch desktop-class powerhouse.",
        "description_ar": "أقوى لابتوب Alienware على الإطلاق بكرت RTX 4090 ومعالج Intel الجيل 14.",
        "specifications": [
            {"key": "CPU", "keyAr": "المعالج", "value": "Intel Core i9-14900HX", "valueAr": "Intel Core i9-14900HX"},
            {"key": "GPU", "keyAr": "كرت الشاشة", "value": "NVIDIA RTX 4090 16GB", "valueAr": "NVIDIA RTX 4090 16GB"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "32GB DDR5", "valueAr": "32 جيجا DDR5"},
            {"key": "Display", "keyAr": "الشاشة", "value": "18\" QHD+ 165Hz", "valueAr": "18 بوصة QHD+"},
        ],
        "in_stock": True, "stock_count": 4, "is_new": True, "is_featured": True, "is_best_seller": False, "is_on_sale": True,
        "rating": 4.9, "review_count": 23, "sku": "ALW-M18R2-I9-4090", "delivery_days": 3, "warranty_months": 24,
        "tags": ["gaming", "laptop", "alienware", "rtx4090"],
    },
    {
        "slug": "dell-xps-15-9530",
        "name": "Dell XPS 15 9530",
        "name_ar": "لابتوب Dell XPS 15 9530",
        "brand": "Dell",
        "category": "laptops",
        "subcategory": "business-laptops",
        "price": 7499,
        "original_price": 8199,
        "images": ["/static/images/products/dell-xps-15.jpg"],
        "short_description": "Intel Core i7-13700H, RTX 4060, 32GB RAM, 1TB SSD, 3.5K OLED",
        "short_description_ar": "معالج Intel Core i7، كرت RTX 4060، رام 32 جيجا، شاشة 3.5K OLED",
        "description": "Premium craftsmanship meets high-performance power with the Dell XPS 15 featuring a breathtaking 3.5K OLED InfinityEdge touch display.",
        "description_ar": "تصميم فاخر مع أداء استثنائي وشاشة OLED رائعة مقاس 15.6 بوصة بدقة 3.5K.",
        "specifications": [
            {"key": "Processor", "keyAr": "المعالج", "value": "Intel Core i7-13700H", "valueAr": "Intel Core i7-13700H"},
            {"key": "GPU", "keyAr": "كرت الشاشة", "value": "NVIDIA RTX 4060 8GB", "valueAr": "NVIDIA RTX 4060 8GB"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "32GB DDR5 4800MHz", "valueAr": "32 جيجا DDR5"},
            {"key": "Storage", "keyAr": "التخزين", "value": "1TB PCIe Gen4 NVMe SSD", "valueAr": "1 تيرابايت NVMe SSD"},
            {"key": "Display", "keyAr": "الشاشة", "value": "15.6\" 3.5K (3456x2160) OLED Touch", "valueAr": "15.6 بوصة 3.5K OLED لمس"},
        ],
        "in_stock": True, "stock_count": 9, "is_new": False, "is_featured": True, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.8, "review_count": 64, "sku": "DELL-XPS15-9530", "delivery_days": 2, "warranty_months": 24,
        "tags": ["laptop", "dell", "xps", "oled", "creator"],
    },
    {
        "slug": "hp-envy-x360-15",
        "name": "HP ENVY x360 15 2-in-1 Laptop",
        "name_ar": "لابتوب HP ENVY x360 15 المتحول 2 في 1",
        "brand": "HP",
        "category": "laptops",
        "subcategory": "ultrabooks",
        "price": 4599,
        "original_price": 5099,
        "images": ["/static/images/products/hp-envy-x360.jpg"],
        "short_description": "Intel Core i7, 16GB RAM, 512GB SSD, FHD Touch OLED, 360° Hinge",
        "short_description_ar": "معالج Intel Core i7، رام 16 جيجا، شاشة لمس OLED، مفصل 360 درجة",
        "description": "Versatility and creative freedom unite in the HP ENVY x360 2-in-1 laptop with stunning IMAX-enhanced OLED display.",
        "description_ar": "مرونة فائقة وتصميم متحول 360 درجة مع شاشة OLED تدعم اللمس وقلم الإدخال.",
        "specifications": [
            {"key": "Processor", "keyAr": "المعالج", "value": "Intel Core i7-1355U", "valueAr": "Intel Core i7-1355U"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "16GB LPDDR5", "valueAr": "16 جيجا LPDDR5"},
            {"key": "Storage", "keyAr": "التخزين", "value": "512GB PCIe NVMe M.2 SSD", "valueAr": "512 جيجابايت NVMe SSD"},
            {"key": "Display", "keyAr": "الشاشة", "value": "15.6\" FHD (1920x1080) OLED Touch", "valueAr": "15.6 بوصة OLED لمس"},
        ],
        "in_stock": True, "stock_count": 14, "is_new": False, "is_featured": False, "is_best_seller": False, "is_on_sale": True,
        "rating": 4.6, "review_count": 42, "sku": "HP-ENVY-X360-15", "delivery_days": 2, "warranty_months": 12,
        "tags": ["laptop", "hp", "2in1", "touchscreen"],
    },
    {
        "slug": "thinkpad-x1-carbon-gen11",
        "name": "Lenovo ThinkPad X1 Carbon Gen 11",
        "name_ar": "لابتوب Lenovo ThinkPad X1 Carbon الجيل 11",
        "brand": "Lenovo",
        "category": "laptops",
        "subcategory": "business-laptops",
        "price": 8199,
        "original_price": None,
        "images": ["/static/images/products/thinkpad-x1-carbon.jpg"],
        "short_description": "Intel Core i7-1365U vPro, 32GB RAM, 1TB SSD, 14\" 2.8K OLED, Ultralight 1.12kg",
        "short_description_ar": "معالج i7 vPro، رام 32 جيجا، شاشة 2.8K OLED، وزن فائق الخفة 1.12 كجم",
        "description": "The pinnacle of executive mobile computing. Ultralight carbon-fiber chassis, military-grade durability, and legendary ThinkPad keyboard.",
        "description_ar": "قمة أجهزة الأعمال الاحترافية. هيكل كربوني خفيف الوزن ولوحة مفاتيح أسطورية مع بطارية تدوم طويلاً.",
        "specifications": [
            {"key": "Processor", "keyAr": "المعالج", "value": "Intel Core i7-1365U vPro", "valueAr": "Intel Core i7-1365U vPro"},
            {"key": "RAM", "keyAr": "الذاكرة", "value": "32GB LPDDR5 6400MHz", "valueAr": "32 جيجا LPDDR5"},
            {"key": "Storage", "keyAr": "التخزين", "value": "1TB PCIe Gen4 Performance SSD", "valueAr": "1 تيرابايت NVMe SSD"},
            {"key": "Display", "keyAr": "الشاشة", "value": "14.0\" 2.8K (2880x1800) OLED 400 nits", "valueAr": "14 بوصة 2.8K OLED"},
            {"key": "Weight", "keyAr": "الوزن", "value": "1.12 kg (2.48 lbs)", "valueAr": "1.12 كجم"},
        ],
        "in_stock": True, "stock_count": 6, "is_new": True, "is_featured": True, "is_best_seller": False, "is_on_sale": False,
        "rating": 4.9, "review_count": 38, "sku": "LNV-X1CARB-G11", "delivery_days": 1, "warranty_months": 36,
        "tags": ["laptop", "lenovo", "thinkpad", "business", "ultralight"],
    },
    {
        "slug": "logitech-mx-master-3s",
        "name": "Logitech MX Master 3S Wireless Mouse",
        "name_ar": "فأرة Logitech MX Master 3S اللاسلكية",
        "brand": "Logitech",
        "category": "peripherals",
        "subcategory": "gaming-mice",
        "price": 429,
        "original_price": 499,
        "images": ["/static/images/products/logitech-mx-master-3s.jpg"],
        "short_description": "8K DPI Any-Surface Tracking, Quiet Clicks, MagSpeed Electromagnetic Scrolling",
        "short_description_ar": "حساس 8K DPI فائق الدقة، نقرات هادئة، تمرير كهرومغناطيسي MagSpeed",
        "description": "An icon remastered. Feel every moment of your workflow with even more precision, tactility, and performance thanks to Quiet Clicks and 8,000 DPI track-on-glass.",
        "description_ar": "الفأرة الأكثر احترافية للمصممين والمطورين بنقرات هادئة وتمرير كهرومغناطيسي فائق السرعة.",
        "specifications": [
            {"key": "Sensor", "keyAr": "الحساس", "value": "Darkfield high precision (8000 DPI)", "valueAr": "Darkfield عالي الدقة (8000 DPI)"},
            {"key": "Battery", "keyAr": "البطارية", "value": "Up to 70 days rechargeable (USB-C)", "valueAr": "حتى 70 يوماً قابلة للشحن"},
            {"key": "Connectivity", "keyAr": "الاتصال", "value": "Bluetooth Low Energy & Logi Bolt USB", "valueAr": "بلوتوث و USB Logi Bolt"},
        ],
        "in_stock": True, "stock_count": 28, "is_new": False, "is_featured": True, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.9, "review_count": 290, "sku": "LOG-MXM3S-BLK", "delivery_days": 1, "warranty_months": 24,
        "tags": ["mouse", "logitech", "peripherals", "wireless", "productivity"],
    },
    {
        "slug": "kingston-fury-beast-32gb-ddr5",
        "name": "Kingston FURY Beast 32GB DDR5 RAM Kit",
        "name_ar": "ذاكرة Kingston FURY Beast سعة 32 جيجابايت DDR5",
        "brand": "Kingston",
        "category": "storage",
        "subcategory": "ssds",
        "price": 549,
        "original_price": 629,
        "images": ["/static/images/products/kingston-fury-ddr5.jpg"],
        "short_description": "32GB (2x16GB) 6000MHz DDR5 CL36, Intel XMP 3.0 & AMD EXPO Ready",
        "short_description_ar": "32 جيجا (2×16) بتردد 6000MHz DDR5، دعم Intel XMP 3.0 و AMD EXPO",
        "description": "Kingston FURY Beast DDR5 brings the latest cutting-edge technology for next-gen gaming platforms, delivering higher speeds, capacity, and reliability.",
        "description_ar": "ذاكرة عشوائية DDR5 فائقة السرعة بتردد 6000MHz مع مشتت حراري منخفض الارتفاع.",
        "specifications": [
            {"key": "Capacity", "keyAr": "السعة", "value": "32GB (2 x 16GB kit)", "valueAr": "32 جيجابايت (2 × 16)"},
            {"key": "Speed", "keyAr": "السرعة", "value": "DDR5-6000 MT/s CL36", "valueAr": "DDR5-6000 MT/s CL36"},
            {"key": "Profiles", "keyAr": "التوافق", "value": "Intel XMP 3.0 & AMD EXPO", "valueAr": "Intel XMP 3.0 و AMD EXPO"},
        ],
        "in_stock": True, "stock_count": 19, "is_new": False, "is_featured": False, "is_best_seller": True, "is_on_sale": True,
        "rating": 4.8, "review_count": 95, "sku": "KNG-FURY-32G-DDR5", "delivery_days": 1, "warranty_months": 60,
        "tags": ["ram", "kingston", "ddr5", "memory", "gaming"],
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with initial Marjaah Trading product data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding categories...')
        cat_map = {}
        sub_map = {}
        for cat_data in CATEGORIES_DATA:
            subs = cat_data.pop('subcategories', [])
            cat, _ = Category.objects.update_or_create(
                slug=cat_data['slug'], defaults=cat_data
            )
            cat_map[cat.slug] = cat
            for sub_data in subs:
                sub, _ = Subcategory.objects.update_or_create(
                    category=cat, slug=sub_data['slug'],
                    defaults={'name': sub_data['name'], 'name_ar': sub_data.get('name_ar', '')}
                )
                sub_map[sub.slug] = sub

        self.stdout.write('Seeding brands...')
        brand_map = {}
        for b in BRANDS_DATA:
            brand, _ = Brand.objects.get_or_create(name=b)
            brand_map[b] = brand

        self.stdout.write('Seeding products...')
        for p in PRODUCTS_DATA:
            brand = brand_map.get(p.pop('brand'))
            cat = cat_map.get(p.pop('category'))
            sub_slug = p.pop('subcategory', None)
            sub = sub_map.get(sub_slug) if sub_slug else None
            specs = p.pop('specifications', [])
            imgs = p.pop('images', [])
            tags = p.pop('tags', [])
            slug = p['slug']

            Product.objects.update_or_create(
                slug=slug,
                defaults={
                    **p,
                    'brand': brand,
                    'category': cat,
                    'subcategory': sub,
                    'images_json': json.dumps(imgs),
                    'specifications_json': json.dumps(specs),
                    'tags_json': json.dumps(tags),
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(CATEGORIES_DATA)} categories, {len(BRANDS_DATA)} brands, {len(PRODUCTS_DATA)} products.'
        ))
