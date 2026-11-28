# Verified Security, Architecture & Code Issues (`bugs.md`)

This report documents verified **security vulnerabilities** and **non-data code/architecture/deployment issues** discovered during the full-stack audit of Admin, Backend, and Storefront. All functional, data-sync, UI, and Admin-to-Storefront reflection bugs found during the audit were fixed directly in the codebase.

> **Important Database Note (SQLite vs Cloud Firestore):**
> **Do NOT delete anything from Cloud Firestore.** Verify any legacy SQLite product records are migrated to Cloud Firestore before decommissioning legacy data sources; all current product queries read exclusively from Cloud Firestore (`products` collection) via the NestJS backend.

---

## 1. Critical & High Security Vulnerabilities

### 1.1 Hardcoded Master Passwords & Legacy Plaintext `raw_password` Fallbacks
- **Locations:**
  - `backend/src/auth/auth.service.ts` lines `29–42`, `140–173`, `295–313`, `409–410`, `752–758`
  - `backend/src/admin/admin.service.ts` lines `83–99`
  - `backend/src/seed.ts` lines `109–113`
- **Details:**
  - `AuthService` accepts static fallback passwords (`'admin'`, `'admin@marjaah.qa'`, `'Admin@123'`, `'Admin123!'`) for the primary admin account regardless of stored password hashes.
  - Plaintext `raw_password` fields are stored and checked during login/reset (`raw_password: dto.new_password` on password reset in `auth.service.ts:755`), and `AuthService.adminLogin` (`auth.service.ts:198`) only strips `password` from `adminUserData` when constructing `safeUser`, risking plaintext credential exposure.
- **Remediation:** Remove all hardcoded master passwords and plaintext `raw_password` comparisons/writes immediately; rotate the primary `admin` credentials in `admin_users`/`admin_credentials` using bcrypt hashes only.

### 1.2 Hardcoded Fallback `JWT_SECRET`
- **Locations:**
  - `backend/src/auth/jwt.strategy.ts` line `16`
  - `backend/src/auth/auth.module.ts` line `15`
- **Details:** Both files fall back to the literal string `'marjaah_super_secure_jwt_secret_key_2026_qatar_tech_prod'` if `JWT_SECRET` is missing from the environment. Anyone reading source code can forge arbitrary `super_admin` JWTs against any deployment missing `JWT_SECRET`.
- **Remediation:** Require `process.env.JWT_SECRET` to be set (fail startup if missing in production) and rotate the signing secret.

### 1.3 Password Reset OTP/Code Returned Directly in HTTP Response on Mail Failure
- **Location:** `backend/src/auth/auth.service.ts` lines `660–667` (`POST /api/auth/forgot-password`)
- **Details:** When `!mailResult.sent`, the API returns `code` directly in the JSON payload, allowing an attacker triggering mail delivery errors (or querying an unconfigured mailer environment) to read another user's reset OTP and reset their password via `/api/auth/reset-password`.
- **Remediation:** Never return reset codes or tokens in HTTP responses in production; only log/return test codes when explicitly running local dev/test harnesses.

### 1.4 Unauthenticated PII Leak & IDOR on `GET /api/orders/:idOrNumber`
- **Locations:**
  - `backend/src/orders/orders.controller.ts` lines `73–76`
  - `backend/src/orders/orders.service.ts` lines `392–405`
- **Details:**
  - `GET /api/orders/:idOrNumber` has no auth guard. Sequential order numbers (`MTQ-00001`, `MTQ-00002`, ...) can be enumerated unauthenticated to retrieve customer names, emails, phones, and addresses (`orders.service.ts:405`), because authorization only executes inside `if (!isAdmin && currentUser)`.
  - Even when authenticated, `OrdersService.findOne` trusts `req.user` directly rather than reading JWT claims if unguarded, and guest orders (`!ordUserId`) bypass the ownership check.
- **Remediation:** Require both order number AND matching phone/email verification (or signed guest order token) for unauthenticated order tracking, and mask sensitive PII (full phone/address) unless authenticated as owner or authorized staff.

### 1.5 Unauthenticated Presence Spoofing on `POST /api/auth/heartbeat` & `/api/auth/presence`
- **Location:** `backend/src/auth/auth.controller.ts` lines `98–132`
- **Details:** Both endpoints lack `JwtAuthGuard` and accept `body.user_id` / `body.id` / `body.email` (`lines 115–119`), letting any anonymous caller overwrite arbitrary users' `last_activity` / online presence timestamps.
- **Remediation:** Derive the target user strictly from verified JWT claims rather than unauthenticated request body fields.

### 1.6 `AdminGuard` Missing RBAC / Live Revocation Checks & Broad Privilege Escalation Paths
- **Locations:**
  - `backend/src/auth/guards/admin.guard.ts` lines `4–12`
  - `backend/src/admin/rbac/rbac.guard.ts` lines `47–49`, `68–79`, `93–94`
  - `backend/src/auth/jwt.strategy.ts` lines `60–85`
  - `backend/src/admin/admin.service.ts` lines `376`, `437–471`, `542–550`
- **Details:**
  - `AdminGuard` (`orders.controller.ts:55,61,67,78..`, `upload.controller.ts:71,103,132`, `users.controller.ts:11`) checks only JWT `is_staff || is_superuser || role === 'admin'` claims without checking granular RBAC module permissions or live Firestore revocation/suspension state (note `JwtStrategy.validate` skips live doc check if `!doc.exists` at lines `60–71` and unions `|| isSuperUser` from stale JWT claims at lines `83–84`).
  - `RbacGuard` (`rbac.guard.ts:47`) immediately returns `true` on JWT `user.is_superuser` BEFORE loading live Firestore `session_revoked_at` / `status` (`lines 52–74`), so a demoted or session-revoked superuser token remains valid until JWT expiry.
  - `AdminService.updateAdminUser` (`admin.service.ts:470`) sets `is_superuser: dto.role_ids.includes('super_admin')` and `createAdminUser` (`376`) lets any staff member with `admin_users` edit/create rights assign `super_admin`, while `resetAdminPassword` (`542`) does not block non-superusers from resetting a `super_admin` password.
- **Remediation:** Always check live DB revocation (`session_revoked_at`) and status before honoring `is_superuser`; require `currentAdmin.is_superuser` to grant/revoke `super_admin` or reset a superuser's password; replace generic `AdminGuard` with `RbacGuard` + `@RequirePermission(...)`.

### 1.7 Public Unauthenticated `POST /api/reviews/refresh` & Cache-Poisonable `sitemap.xml`
- **Locations:**
  - `backend/src/reviews/reviews.controller.ts` lines `14–17`
  - `backend/src/seo/seo.controller.ts` lines `9–31`
- **Details:**
  - `POST /api/reviews/refresh` has no authentication guard and triggers live Google reviews refresh on demand.
  - `SeoController.getSitemapXml` and `getRobotsTxt` trust unvalidated `X-Forwarded-Host` / `Host` headers (`lines 12, 24`) while sending `Cache-Control: public, max-age=3600, s-maxage=14400`, enabling CDN sitemap/robots cache poisoning with an attacker host.
- **Remediation:** Guard `POST /api/reviews/refresh` with `JwtAuthGuard, RbacGuard` and pin `baseUrl` in `SeoController` to an allowlisted domain / environment variable (`PUBLIC_SITE_URL`).

### 1.8 Public SVG Uploads & Stored/DOM XSS Exposure
- **Locations:**
  - `backend/src/upload/upload.service.ts` lines `10–17`, `41–65`
  - Multiple `innerHTML` templates across `frontend/` and `frontend/admin/` (e.g., `frontend/admin/customers/admin-customers.js`, `frontend/checkout/success/index.html`, `frontend/account/index.html`, `frontend/assets/js/products.js` product card/detail rendering).
- **Details:**
  - `UploadService` allows `image/svg+xml` uploaded directly to public Firebase Storage URLs without SVG script/event-handler sanitization.
  - Several legacy storefront/admin template builders still interpolate unescaped product/customer fields into `innerHTML`.
- **Remediation:** Strip/reject active content in SVG uploads (or disallow `image/svg+xml` in favor of raster/WEBP), sanitize rich descriptions with DOMPurify, and migrate remaining `innerHTML` builders to escaped helpers/`textContent`.

### 1.9 Public Access to Draft/Disabled Records via `?includeInactive=true`
- **Locations:**
  - `backend/src/banners/banners.controller.ts` lines `24–25`
  - `backend/src/promotional-sections/promotional-sections.controller.ts` lines `24–26`
  - `backend/src/store-locations/store-locations.controller.ts` lines `24–26`
  - `backend/src/subcategories/subcategories.controller.ts` lines `25–27`
- **Details:** Any unauthenticated request passing `?includeInactive=true` can retrieve draft, disabled, `pending_approval`, or rejected banners, promotional sections, subcategories, and store locations.
- **Remediation:** Verify an authenticated staff JWT before honoring `includeInactive=true`.

---

## 2. Code Quality, Concurrency & Deployment Issues

### 2.1 Non-Transactional Order Number Generation (`MTQ-XXXXX`)
- **Locations:**
  - `backend/src/orders/orders.service.ts` lines `126–128`
  - `backend/src/admin/admin.service.ts` line `1518`
- **Details:** Both checkout and admin order creation compute `order_number` using `countSnap.size + 1` outside a Firestore transaction. Concurrent orders (or any deleted order document) will collide on the same `MTQ-XXXXX` order number, and concurrent stock decrements (`orders.service.ts:169–186`) are not transactional (risking negative or lost stock decrements).
- **Remediation:** Maintain an atomic counter document (e.g. `counters/orders`) updated inside `firestore.runTransaction(...)` alongside stock deductions.

### 2.2 Global `ValidationPipe` Bypassed by `any` / Un-decorated DTO Interfaces
- **Locations:**
  - `backend/src/main.ts` lines `36–42`
  - Controllers such as `OrdersController` (`@Body() body: any`), `UsersController` (`@Body() body: any`), `AdminController` (`AdminUserDto` TypeScript interface instead of `class` with `class-validator` decorators)
- **Details:** `ValidationPipe({ whitelist: true, transform: true })` strips unknown properties ONLY when route parameters are typed as decorated ES classes; `any` and TypeScript `interface` types are erased at runtime, leaving request bodies unvalidated and unfiltered at the controller boundary.
- **Remediation:** Define concrete DTO classes with `class-validator` decorators for auth, order, user, product, and admin write endpoints.

### 2.3 Permissive Fallback CORS Origin Configuration
- **Location:** `backend/src/main.ts` lines `28–34`
- **Details:** When `CORS_ORIGIN` is unset or `'*'`, `origin: true` combined with `credentials: true` reflects arbitrary `Origin` headers.
- **Remediation:** Set an explicit comma-separated `CORS_ORIGIN` allowlist (`https://www.marjaah.shop,https://marjaah-ab2a6.web.app,http://localhost:8080`) in all environments.

### 2.4 Duplicate Firebase Hosting Site Config (`dev-demo-url`)
- **Location:** `firebase.json` lines `25–30`, `539–545`
- **Details:** `firebase.json` defines duplicate `"site": "dev-demo-url"` entries inside `"hosting": [...]` instead of the production Firebase Hosting site IDs (`marjaah-ab2a6`, etc.).
- **Remediation:** Clean up `firebase.json` hosting targets before running Firebase deployments so staging/production deploys target the intended Firebase Hosting site(s).

### 2.5 Audit Log Retention & Sensitive Field Snapshot
- **Location:** `backend/src/admin/admin.service.ts` line `502`
- **Details:** `updateAdminUser` passes raw `existingData` (which may include `password` / `raw_password` hashes or legacy fields) into `auditService.log` `details.before`.
- **Remediation:** Redact `password`, `raw_password`, and token fields before persisting audit snapshots.
