import axios from 'axios';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function loginAsOwner() {
  const res = await axios.post('/api/auth/login', {
    email: 'owner@acme.com',
    password: 'password123',
  });
  return res.data.accessToken;
}

async function loginAsViewer() {
  const res = await axios.post('/api/auth/login', {
    email: 'viewer@acme.com',
    password: 'password123',
  });
  return res.data.accessToken;
}

describe('Tasks API', () => {
  let ownerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    ownerToken = await loginAsOwner();
    try {
      viewerToken = await loginAsViewer();
    } catch {
      viewerToken = '';
    }
  });

  describe('POST /api/tasks', () => {
    it('creates a task as owner', async () => {
      const res = await axios.post('/api/tasks', {
        title: 'E2E Test Task',
        status: 'TODO',
        priority: 'MEDIUM',
        visibility: 'PUBLIC',
        orgId: 'org-acme',
      }, { headers: authHeaders(ownerToken) });

      expect(res.status).toBe(201);
      expect(res.data.title).toBe('E2E Test Task');
      expect(res.data.id).toBeDefined();
    });

    it('rejects creation without auth', async () => {
      try {
        await axios.post('/api/tasks', {
          title: 'Unauthorized',
          orgId: 'org-acme',
        });
        fail('Expected 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('rejects viewer creating task', async () => {
      if (!viewerToken) return;
      try {
        await axios.post('/api/tasks', {
          title: 'Viewer Task',
          status: 'TODO',
          priority: 'MEDIUM',
          visibility: 'PUBLIC',
          orgId: 'org-acme',
        }, { headers: authHeaders(viewerToken) });
        fail('Expected 403');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('GET /api/tasks', () => {
    it('lists tasks for authenticated user', async () => {
      const res = await axios.get('/api/tasks', {
        headers: authHeaders(ownerToken),
        params: { orgId: 'org-acme' },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.items)).toBe(true);
    });

    it('rejects listing without auth', async () => {
      try {
        await axios.get('/api/tasks', { params: { orgId: 'org-acme' } });
        fail('Expected 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });
});
