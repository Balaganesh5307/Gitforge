import * as crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'gitforge-default-super-secret-key-32-chars-long!';

// Helper to convert strings/buffers to base64url format
function base64url(source: Buffer | string): string {
  const base64 = typeof source === 'string' 
    ? Buffer.from(source).toString('base64') 
    : source.toString('base64');
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Helper to decode base64url format back to utf-8 string
function decodeBase64url(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a payload with HMAC SHA-256 and returns a standard JWT token.
 * @param payload Object payload.
 * @param expiresInSeconds Lifetime in seconds (default 24h).
 */
export function signToken(payload: object, expiresInSeconds: number = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = {
    ...payload,
    exp
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(signatureInput)
    .digest();

  const encodedSignature = base64url(signature);

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Verifies a JWT token and returns its decoded payload. Throws error if invalid or expired.
 * @param token JWT token string.
 */
export function verifyToken(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(signatureInput)
    .digest();

  const expectedEncodedSignature = base64url(expectedSignature);

  if (encodedSignature !== expectedEncodedSignature) {
    throw new Error('Signature verification failed');
  }

  const decodedPayload = JSON.parse(decodeBase64url(encodedPayload));
  
  if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired');
  }

  return decodedPayload;
}
