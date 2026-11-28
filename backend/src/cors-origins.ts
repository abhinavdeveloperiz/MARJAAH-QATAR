const DEFAULT_ORIGINS = [
  'https://www.marjaah.shop',
  'https://marjaah.shop',
  'https://marjaah-ab2a6.web.app',
  'https://marjaah-ab2a6.firebaseapp.com',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
];

/** Explicit CORS allowlist from CORS_ORIGIN (comma separated); never reflects arbitrary origins. */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw.trim() === '*') return DEFAULT_ORIGINS;
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}
