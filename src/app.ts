import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { SignJWT, jwtVerify } from 'jose';
import { CLIENT_ID, REDIRECT_URI, JWT_SECRET } from './config';
import { generateAccessToken, generateRefreshToken } from './tokens'

const secretKey = new TextEncoder().encode(JWT_SECRET);
const AUTH_CODE_EXPIRY = '5m';

// Create and export the Express app.
export const app = express();

// Enable JSON body parsing
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * OAuth 2.0 Authorization Endpoint
 * --------------------------------
 * GET /api/oauth/authorize
 *
 * Expects:
 *   - response_type=code
 *   - client_id=upfirst
 *   - redirect_uri=http://localhost:8081/process
 *   - state (optional)
 *
 * If valid, responds with a 302 Found to redirect_uri?code=xxx[&state=...].
 */
app.get('/api/oauth/authorize', async (req: Request, res: Response) => {
  const { response_type, client_id, redirect_uri, state } = req.query;

  // Validate the request parameters
  if (response_type !== 'code') {
    return res.status(400).send('Unsupported response_type. Expected "code".');
  }
  if (client_id !== CLIENT_ID) {
    return res.status(400).send('Invalid client_id.');
  }
  if (redirect_uri !== REDIRECT_URI) {
    return res.status(400).send('Invalid redirect_uri.');
  }

  // Generate a random authorization code
  const code = await new SignJWT({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(AUTH_CODE_EXPIRY)
    .setIssuedAt()
    .sign(secretKey);

  // Construct the redirect URL
  let redirectLocation = `${redirect_uri}?code=${encodeURIComponent(code)}`;
  if (state) {
    // If `state` was provided, append it to the redirect for CSRF protection
    redirectLocation += `&state=${encodeURIComponent(state as string)}`;
  }

  // Redirect the user-agent
  res.redirect(302, redirectLocation);
});

/**
 * OAuth 2.0 Token Endpoint
 * ------------------------
 * POST /api/oauth/token
 *
 * Expects body (application/x-www-form-urlencoded):
 *   - grant_type=<"authorization_code" or "refresh_token">
 *   - code=AUTH_CODE
 *   - client_id=upfirst
 *   - redirect_uri=http://localhost:8081/process
 *   - refresh_token=<SOME_REFRESH_TOKEN> (Optional)
 *
 * Responds with:
 * {
 *   "access_token": <JWT_TOKEN>,
 *   "token_type": "bearer",
 *   "expires_in": 3600,
 *   "refresh_token": <SOME_REFRESH_TOKEN>
 * }
 */
app.post('/api/oauth/token', async (req: Request, res: Response) => {
  const { grant_type, code, client_id, redirect_uri, refresh_token } = req.body;

  // Handle authorization code exchange
  if (grant_type === "authorization_code") {
    try {
      // Verify the JWT authorization code
      const { payload } = await jwtVerify(code, secretKey);

      // Verify client_id and redirect_uri match what was originally used
      if (payload.clientId !== client_id || payload.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      // Generate new access token and refresh token
      const accessToken = await generateAccessToken(client_id);
      const newRefreshToken = await generateRefreshToken(client_id);

      // Send the OAuth token response
      res.status(200).json({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken
      });

    } catch (error) {
      return res.status(400).json({ error: 'invalid_code' });
    }
  }
  // Handle refresh token exchange
  else if (grant_type === "refresh_token") {
    try {
      // Verify the JWT refresh code
      const { payload } = await jwtVerify(refresh_token, secretKey);

      // Verify client_id and redirect_uri
      if (payload.clientId !== client_id && payload.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      // Generate new access token and refresh token
      const accessToken = await generateAccessToken(client_id);
      const newRefreshToken = await generateRefreshToken(client_id);

      // Send the OAuth token response
      return res.status(200).json({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken
      });

    } catch (error) {
      return res.status(400).json({ error: 'invalid_refresh_token' });
    }

  }
  // We only support authorization and refresh grant types in this implementation
  else {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

});