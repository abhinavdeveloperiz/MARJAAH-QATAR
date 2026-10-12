# MARJAAH Qatar — Production Architecture (NestJS + Firebase)

Complete migration of the **MARJAAH Qatar** luxury e-commerce platform from the legacy Django + SQLite stack to a decoupled, high-performance architecture powered by **NestJS (TypeScript)**, **Firebase Firestore**, and **Firebase Hosting**.

---

## 1. Project Architecture

```
MARJAAH-QATAR/
├── frontend/                     # Pure static frontend with modular folder architecture
│   ├── index.html                # Home page with hero, categories, and featured products
│   ├── about/index.html          # About section (Showroom & company details)
│   ├── account/index.html        # Customer dashboard & live order history
│   ├── admin/index.html          # Executive Admin dashboard with Firestore KPIs & controls
│   ├── cart/index.html           # Dedicated Shopping Cart section & summary
│   ├── checkout/                 # Checkout section
│   │   ├── index.html            # Multi-step checkout form & address verification
│   │   └── success/index.html    # Order confirmation & receipt tracking
│   ├── contact/index.html        # Customer contact & inquiry submission
│   ├── login/index.html          # Authentication portal (Customers & Admins)
│   ├── register/index.html       # Customer registration portal
│   ├── forgot-password/index.html# Account recovery workflow
│   ├── offers/index.html         # Promotional campaign hub
│   ├── product/index.html        # Dynamic product detail page with specs table & related items
│   ├── shop/index.html           # Product catalog with search, category filtering & pagination
│   ├── wishlist/index.html       # Client-persisted wishlist section
│   └── assets/                   # Centralized & categorized assets architecture
│       ├── images/
│       │   ├── branding/         # Logos, icons, favicons (SVG & PNG)
│       │   ├── banners/          # Hero and campaign banner graphics
│       │   ├── products/         # Product images & placeholder SVG
│       │   └── categories/       # Category graphics and illustrations
│       ├── css/globals.css       # Design tokens, typography, and dark-mode styles
│       └── js/                   # Centralized JS modules (api.js, cart.js, products.js, etc.)
│
├── backend/                      # Production NestJS REST API Server
│   ├── src/
│   │   ├── main.ts               # Application entrypoint with global validation & CORS
│   │   ├── app.module.ts         # Root module orchestrating feature domains
│   │   ├── config/               # Configuration services & environment parsing
│   │   ├── firebase/             # Firebase Admin SDK & Firestore database service
│   │   ├── auth/                 # JWT authentication, password hashing, and AdminGuard
│   │   ├── users/                # User accounts and saved delivery addresses
│   │   ├── categories/           # Categories CRUD and hierarchy
│   │   ├── subcategories/        # Subcategories with parent category filtering
│   │   ├── brands/               # Hardware brands catalog
│   │   ├── products/             # Multi-filter search, sorting, pagination & detail
│   │   ├── cart/                 # Authoritative server-side cart calculation & stock validation
│   │   ├── orders/               # Firestore order lifecycle, sequential numbering & restocking
│   │   ├── banners/              # Hero & promotional banner endpoints
│   │   ├── contact/              # Customer contact message storage & management
│   │   └── admin/                # Executive dashboard analytics & live Firestore KPIs
│   ├── test/
│   │   └── e2e-verification.js   # 24-step automated end-to-end verification suite
│   ├── package.json              # Backend dependencies & build scripts
│   ├── tsconfig.json             # TypeScript compiler configuration
│   ├── Dockerfile                # Multi-stage production container build for Cloud Run
│   └── .env.example              # Environment variables template
│
├── firebase.json                 # Firebase Hosting & Cloud Run API routing configuration
├── .firebaserc                   # Firebase project targeting (marjaah-ab2a6)
├── .gitignore                    # Secrets protection & build artifact exclusion
└── package.json                  # Root monorepo orchestrator
```

---

## 2. Core Technical Highlights

### 🎨 100% Preserved Frontend UI
- All original typography, design tokens, color palettes, dark/light modes, animations, and RTL Arabic layouts (`dir="rtl"`) have been preserved with zero visual regression.
- The UI retains full responsive behavior across mobile, tablet, and desktop viewports.

### ⚡ Client-Side Cart (localStorage) & Authoritative Server Verification
- The shopping cart operates entirely in the browser using `localStorage` (`marjaah_cart_items_v2`), eliminating server-side session dependencies and CSRF blockers.
- At checkout, client-submitted quantities are sent to `POST /api/cart/validate`. The NestJS backend inspects live Firestore records, discards untrusted client prices, calculates authoritative subtotals/shipping, checks stock availability, and creates the order in Firestore.

### 🔒 Enterprise Security & Role-Based Access Control (RBAC)
- Sensitive Firebase service-account private keys are strictly quarantined in the backend and omitted from version control.
- All administrative routes (`/api/admin/dashboard`, `/api/orders/:id/status`, product mutations) require a valid JWT with `is_staff: true` or `role: 'admin'`, enforced via NestJS `JwtAuthGuard` and `AdminGuard`.

---

## 3. Implemented REST API Endpoints

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `GET` | `/api/categories` | List all product categories | Public |
| `GET` | `/api/categories/:slug` | Retrieve single category by slug | Public |
| `POST` | `/api/categories` | Create new category | Admin |
| `GET` | `/api/subcategories` | List subcategories (optional `?categorySlug=`) | Public |
| `GET` | `/api/brands` | List all tech brands | Public |
| `GET` | `/api/products` | Paginated product search, filter & sort | Public |
| `GET` | `/api/products/:slugOrId` | Product details, specs, and related items | Public |
| `POST` | `/api/cart/validate` | Authoritative pricing & inventory check | Public |
| `POST` | `/api/auth/register` | Customer registration (hashes password & issues JWT) | Public |
| `POST` | `/api/auth/login` | Email/password login (returns JWT + user profile) | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Customer / Admin |
| `POST` | `/api/orders` | Create order (Guest or Customer, deducts stock) | Public / Customer |
| `GET` | `/api/orders/:idOrNumber` | View order details by ID or sequential number | Owner / Admin |
| `GET` | `/api/orders/user` | View logged-in customer's order history | Customer |
| `POST` | `/api/orders/:id/cancel` | Cancel order (restores product stock counts) | Owner / Admin |
| `GET` | `/api/admin/dashboard` | Live dashboard metrics, low-stock alerts & recent orders | Admin |
| `PATCH` | `/api/orders/:id/status` | Update order fulfillment status | Admin |
| `POST` | `/api/contact` | Submit contact inquiry to Firestore | Public |

---

## 4. Local Development

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Firebase CLI**: `npm install -g firebase-tools`

### 2. Run Backend
```bash
cd backend
npm install
# Set your environment variables or use defaults
cp .env.example .env
npm run start:dev
```
Backend will start at: `http://localhost:3001`

### 3. Run Frontend
You can serve the static frontend using any local web server or Firebase Hosting emulator:
```bash
# Using npx serve:
npx serve frontend -p 5000

# Or using Firebase CLI:
firebase emulators:start --only hosting
```
Open `http://localhost:5000` in your browser.

---

## 5. Automated Verification & Testing

To execute the end-to-end integration and API verification test suite:

```bash
cd backend
node test/e2e-verification.js
```

**Results:**
- ✅ 24 Passed, 0 Failed
- Verifies Categories, Subcategories, Brands, Products, Search, Sorting, Cart Validation, Registration, Login, Profile, Order Placement, Order History, Order Cancellation, Admin RBAC Protection, and Contact submissions.

---

## 6. Production Deployment

### 1. Deploy NestJS Backend to Cloud Run
```bash
cd backend

# Build and deploy container directly using Google Cloud Build / Cloud Run:
gcloud run deploy marjaah-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=marjaah-ab2a6
```

### 2. Deploy Frontend to Firebase Hosting
```bash
# In the project root:
firebase deploy --only hosting
```

`firebase.json` automatically maps `/api/**` traffic to the `marjaah-backend` Cloud Run container while serving all static HTML/CSS/JS assets from Firebase's global CDN.
