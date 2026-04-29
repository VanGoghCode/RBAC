import axios from 'axios';

function extractCookie(setCookie: string[], name: string): string | null {
  for (const header of setCookie) {
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('returns tokens and user on valid credentials', async () => {
      const res = await axios.post('/api/auth/login', {
        email: 'owner@acme.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.user).toBeDefined();
      expect(res.data.user.email).toBe('owner@acme.com');

      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      expect(extractCookie(cookies, 'refresh_token')).toBeDefined();
      expect(extractCookie(cookies, 'csrf_token')).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
      try {
        await axios.post('/api/auth/login', {
          email: 'owner@acme.com',
          password: 'wrongpassword',
        });
        fail('Expected 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('returns 401 on nonexistent user', async () => {
      try {
        await axios.post('/api/auth/login', {
          email: 'nobody@example.com',
          password: 'password123',
        });
        fail('Expected 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      try {
        await axios.get('/api/auth/me');
        fail('Expected 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('returns user profile with valid token', async () => {
      const loginRes = await axios.post('/api/auth/login', {
        email: 'owner@acme.com',
        password: 'password123',
      });
      const token = loginRes.data.accessToken;

      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.email).toBe('owner@acme.com');
      expect(res.data.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the refresh token and clears cookies', async () => {
      const loginRes = await axios.post('/api/auth/login', {
        email: 'owner@acme.com',
        password: 'password123',
      });
      const token = loginRes.data.accessToken;
      const cookies = loginRes.headers['set-cookie'] as string[];
      const csrfToken = extractCookie(cookies, 'csrf_token');

      const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');

      const res = await axios.post('/api/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  describe('CSRF protection', () => {
    it('rejects refresh without CSRF token', async () => {
      const loginRes = await axios.post('/api/auth/login', {
        email: 'owner@acme.com',
        password: 'password123',
      });
      const cookies = loginRes.headers['set-cookie'] as string[];
      const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');

      try {
        await axios.post('/api/auth/refresh', {}, {
          headers: { Cookie: cookieHeader },
        });
        fail('Expected 403');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });

    it('allows refresh with valid CSRF token', async () => {
      const loginRes = await axios.post('/api/auth/login', {
        email: 'owner@acme.com',
        password: 'password123',
      });
      const cookies = loginRes.headers['set-cookie'] as string[];
      const csrfToken = extractCookie(cookies, 'csrf_token');
      const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');

      const res = await axios.post('/api/auth/refresh', {}, {
        headers: {
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.accessToken).toBeDefined();
    });
  });
});
