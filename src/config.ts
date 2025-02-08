import dotenv from 'dotenv';

dotenv.config();

// Secret for signing JWT tokens.
export const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

export const PORT = process.env.PORT || 8080;
export const CLIENT_ID = process.env.CLIENT_ID || 'upfirst';
export const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:8081/process`;

// Token Expiration Durations
export const ACCESS_TOKEN_EXPIRY_IN_SECONDS = 3600
export const ACCESS_TOKEN_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY = '30d';
export const AUTH_CODE_EXPIRY = '5m';