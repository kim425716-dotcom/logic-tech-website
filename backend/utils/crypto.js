/**
 * Cryptographic Utilities
 * Password hashing (scrypt), token generation, and session management helpers.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const SESSION_LIFETIME = 60 * 60 * 24 * 7; // 7 days in seconds
const COOKIE_NAME = 'lt_session';

/**
 * Hash a plaintext password using scrypt with a random salt.
 * @param {string} password
 * @returns {Promise<string>} Format: "scrypt:<saltHex>:<keyHex>"
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

/**
 * Compare a plaintext password against a stored scrypt hash.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
async function passwordMatches(password, storedHash) {
  const [algorithm, saltHex, keyHex] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * SHA-256 hash a token string for secure storage.
 * @param {string} token
 * @returns {string}
 */
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically random token.
 * @returns {string} Base64url-encoded 32-byte token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Build a Set-Cookie header value for session management.
 * @param {string} value Cookie value
 * @param {number} maxAge Max age in seconds
 * @returns {string}
 */
function cookieHeader(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

/**
 * Parse a cookie header string into a key-value object.
 * @param {string} header
 * @returns {Object}
 */
function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map(part => {
        const sep = part.indexOf('=');
        if (sep < 0) return ['', ''];
        return [part.slice(0, sep).trim(), decodeURIComponent(part.slice(sep + 1).trim())];
      })
      .filter(([key]) => key)
  );
}

module.exports = {
  hashPassword,
  passwordMatches,
  tokenHash,
  generateToken,
  cookieHeader,
  parseCookies,
  SESSION_LIFETIME,
  COOKIE_NAME
};
