import * as crypto from 'crypto';

/**
 * Hashes a plain password using SHA-256.
 * @param password The clear-text password.
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Compares a plain password against a target hash.
 * @param password The clear-text password.
 * @param hash The target hash to match.
 */
export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
