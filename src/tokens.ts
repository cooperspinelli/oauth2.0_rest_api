import { SignJWT } from 'jose';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from './config';

// Convert secret key to Uint8Array
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Generates a stateless JWT access token for the given client ID.
 *
 * @param {string} clientId - The unique identifier of the client requesting the token.
 * @returns {Promise<string>} A promise that resolves to a signed JWT access token.
 *
 * @description
 * - Uses the `HS256` algorithm for signing.
 * - Includes the client ID in the token payload.
 * - Sets an expiration time defined by `ACCESS_TOKEN_EXPIRY`.
 * - Sets the issued-at (`iat`) timestamp.
 * - The token does not store session state, making it stateless.
 */
export async function generateAccessToken(clientId: string): Promise<string> {
  return new SignJWT({ clientId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(secretKey);
}


/**
 * Generates a stateless JWT refresh token for the given client ID.
 *
 * @param {string} clientId - The unique identifier of the client requesting the token.
 * @returns {Promise<string>} A promise that resolves to a signed JWT refresh token.
 *
 * @description
 * - Uses the `HS256` algorithm for signing.
 * - Includes the client ID in the token payload.
 * - Sets an expiration time defined by `REFRESH_TOKEN_EXPIRY`, ensuring old tokens expire.
 * - Sets the issued-at (`iat`) timestamp.
 * - Used to obtain a new access token without requiring re-authentication.
 */
export async function generateRefreshToken(clientId: string): Promise<string> {
  return new SignJWT({ clientId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(REFRESH_TOKEN_EXPIRY) // Ensures old refresh tokens expire
    .setIssuedAt()
    .sign(secretKey);
}