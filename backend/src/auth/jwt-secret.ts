/** Returns the JWT signing secret; refuses to start without one. */
export function getJwtSecret(configured?: string): string {
  const secret = configured || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}
