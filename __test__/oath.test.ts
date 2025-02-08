import request from 'supertest';
import { app } from '../src/app';
import { SignJWT } from 'jose';
import { CLIENT_ID, REDIRECT_URI, JWT_SECRET } from '../src/config';

describe('OAuth 2.0 Flow', () => {
  describe('GET /api/oauth/authorize', () => {
    it('should fail if response_type is not "code"', async () => {
      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'token',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Unsupported response_type/);
    });

    it('should fail if client_id is invalid', async () => {
      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'invalid_client',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Invalid client_id/);
    });

    it('should fail if redirect_uri does not match the expected one', async () => {
      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'upfirst',
          redirect_uri: 'http://bad-redirect.com'
        });

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Invalid redirect_uri/);
    });

    it('should redirect with a valid code if all parameters are correct', async () => {
      const stateValue = 'SOME_STATE';
      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process',
          state: stateValue
        });

      // Expect 302 redirect
      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/^http:\/\/localhost:8081\/process\?code=/);

      // Optionally check for 'state' in the redirected URL
      expect(res.header.location).toContain(`state=${stateValue}`);
    });
  });

  describe('POST /api/oauth/token', () => {
    it('should return an error for unsupported grant_type', async () => {
      const res = await request(app).post('/api/oauth/token')
        .send({
          grant_type: 'unsupported_grant_type',
          code: 'SOME_CODE',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('unsupported_grant_type');
    });

    it('should return an error if authorization code is invalid', async () => {
      const res = await request(app).post('/api/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'NON_EXISTENT_CODE',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_code');
    });

    it('should complete the authorization_code flow successfully', async () => {
      // Request an authorization code
      const authorizeRes = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(authorizeRes.status).toBe(302);
      // Example: http://localhost:8081/process?code=abcd1234
      const location = authorizeRes.header.location as string;
      const urlSearchParams = new URLSearchParams(location.split('?')[1]);
      const code = urlSearchParams.get('code');

      expect(typeof code).toBe("string"); // We expect a code from the redirect

      // Exchange the code for an access token
      const tokenRes = await request(app).post('/api/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
        });

      expect(tokenRes.status).toBe(200);
      expect(tokenRes.body).toMatchObject({
        token_type: 'bearer',
        expires_in: 3600
      });
      expect(tokenRes.body.access_token).toBeDefined();
    });
  });

  describe('CSRF - state parameter', () => {
    it('should include the `state` parameter in the redirect if provided', async () => {
      const stateValue = 'some_random_csrf_token';

      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process',
          state: stateValue
        });

      // We expect a 302 redirect
      expect(res.status).toBe(302);

      // The location header should look like
      // http://localhost:8081/process?code=<some_code>&state=some_random_csrf_token
      expect(res.header.location).toMatch(/http:\/\/localhost:8081\/process\?code=[^&]+&state=some_random_csrf_token/);
    });

    it('should NOT fail if `state` is missing, but still redirect with a code', async () => {
      const res = await request(app).get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'upfirst',
          redirect_uri: 'http://localhost:8081/process'
          // no state
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/^http:\/\/localhost:8081\/process\?code=[^&]+$/);
      // i.e., we have ?code=..., no &state=...
    });
  });

});

describe('OAuth 2.0 Refresh Token Flow', () => {
  let refreshToken: string;

  it('should return a refresh_token when using authorization_code grant', async () => {
    // Obtain an auth code
    const authorizeRes = await request(app)
      .get('/api/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: 'upfirst',
        redirect_uri: 'http://localhost:8081/process'
      });

    expect(authorizeRes.status).toBe(302);

    // Extract code from the redirect
    const location = authorizeRes.header.location as string;
    const urlSearchParams = new URLSearchParams(location.split('?')[1]);
    const code = urlSearchParams.get('code');
    expect(typeof code).toBe("string");

    // Exchange the code for tokens
    const tokenRes = await request(app)
      .post('/api/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code,
        client_id: 'upfirst',
        redirect_uri: 'http://localhost:8081/process'
      });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body).toMatchObject({
      token_type: 'bearer',
      expires_in: 3600
    });

    expect(tokenRes.body.access_token).toBeDefined();
    expect(tokenRes.body.refresh_token).toBeDefined();

    refreshToken = tokenRes.body.refresh_token;
  });

  it('should allow exchanging a refresh token for a new access token', async () => {
    // Wait one second
    await new Promise((r) => setTimeout(r, 1000));
    // Exchange the refresh token
    const refreshRes = await request(app)
      .post('/api/oauth/token')
      .send({
        client_id: 'upfirst',
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toMatchObject({
      token_type: 'bearer',
      expires_in: 3600
    });
    expect(refreshRes.body.access_token).toBeDefined();
    expect(refreshRes.body.refresh_token).toBeDefined();

    // Check that the refresh token has been rotated
    expect(refreshRes.body.refresh_token).not.toEqual(refreshToken);
  });
});