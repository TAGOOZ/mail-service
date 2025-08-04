import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { csrfMiddleware, getCsrfToken } from '../../middleware/csrf';

describe('CSRF Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Add session middleware (required for CSRF)
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );

    // Add CSRF middleware
    app.use(csrfMiddleware);

    // Test routes
    app.get('/api/csrf-token', getCsrfToken);
    app.post('/api/test', (req, res) => {
      res.json({ success: true });
    });
    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token', async () => {
      const response = await request(app).get('/api/csrf-token').expect(200);

      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body).toHaveProperty('expires');
      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection', () => {
    it('should allow GET requests without CSRF token', async () => {
      await request(app).get('/api/test').expect(200);
    });

    it('should allow health check without CSRF token', async () => {
      await request(app).get('/health').expect(200);
    });

    it('should reject POST requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error.type).toBe('CSRF_ERROR');
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should reject POST requests with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error.type).toBe('CSRF_ERROR');
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should accept POST requests with valid CSRF token', async () => {
      // First get a CSRF token
      const tokenResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Then use it in a POST request
      await request(app)
        .post('/api/test')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);
    });

    it('should accept POST requests with CSRF token in body', async () => {
      // First get a CSRF token
      const tokenResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Then use it in request body
      await request(app)
        .post('/api/test')
        .send({ data: 'test', _csrf: csrfToken })
        .expect(200);
    });
  });
});
