import request from 'supertest';
import express from 'express';
import { rateLimiters } from '../../middleware/rateLimiting';

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('General Rate Limiting', () => {
    beforeEach(() => {
      app.use('/api', rateLimiters.general);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });
    });

    it('should allow requests under the limit', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/test').expect(200);
      }
    });

    it('should skip rate limiting for health checks', async () => {
      // Health checks should not be rate limited
      for (let i = 0; i < 10; i++) {
        await request(app).get('/health').expect(200);
      }
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/api/test').expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Authentication Rate Limiting', () => {
    beforeEach(() => {
      app.use('/api/auth', rateLimiters.auth);
      app.post('/api/auth/login', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow auth requests under the limit', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ username: 'test', password: 'test' })
          .expect(200);
      }
    });

    it('should have stricter limits for auth endpoints', async () => {
      // Auth endpoints should have lower limits than general API
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(200);

      const limit = parseInt(response.headers['x-ratelimit-limit']);
      expect(limit).toBeLessThan(100); // Should be less than general limit
    });
  });

  describe('Mailbox Generation Rate Limiting', () => {
    beforeEach(() => {
      app.use('/api/mailbox', rateLimiters.mailboxGeneration);
      app.post('/api/mailbox/generate', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow mailbox generation under the limit', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/mailbox/generate').expect(200);
      }
    });
  });

  describe('Mail Operation Rate Limiting', () => {
    beforeEach(() => {
      app.use('/api/mail', rateLimiters.mailOperation);
      app.get('/api/mail/list', (req, res) => {
        res.json({ success: true });
      });
      app.delete('/api/mail/123', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow mail operations under the limit', async () => {
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/mail/list').expect(200);
      }
    });

    it('should rate limit different operations together', async () => {
      // Mix of different mail operations should count towards same limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/mail/list').expect(200);
      }

      for (let i = 0; i < 5; i++) {
        await request(app).delete('/api/mail/123').expect(200);
      }
    });
  });

  describe('Dynamic Rate Limiting', () => {
    it('should create rate limiter with custom parameters', () => {
      const customLimiter = rateLimiters.createDynamic(
        60000, // 1 minute
        10, // 10 requests
        'custom'
      );

      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });
  });

  describe('Rate Limit Error Response', () => {
    beforeEach(() => {
      // Create a very restrictive rate limiter for testing
      const testLimiter = rateLimiters.createDynamic(60000, 1, 'test');
      app.use('/api/test', testLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should return proper error format when rate limited', async () => {
      // First request should succeed
      await request(app).get('/api/test').expect(200);

      // Second request should be rate limited
      const response = await request(app).get('/api/test').expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('RATE_LIMIT_ERROR');
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('Too many');
    });
  });
});
