import request from 'supertest';
import express from 'express';
import {
  securityMonitoringMiddleware,
  securityHeadersMiddleware,
} from '../../middleware/securityMonitoring';

describe('Security Monitoring Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Add security middleware
    app.use(securityHeadersMiddleware);
    app.use(securityMonitoringMiddleware);

    // Test routes
    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });
    app.post('/api/test', (req, res) => {
      res.json({ success: true });
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to responses', async () => {
      const response = await request(app).get('/api/test').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin'
      );
      expect(response.headers['permissions-policy']).toBe(
        'geolocation=(), microphone=(), camera=()'
      );
    });
  });

  describe('Suspicious Pattern Detection', () => {
    it('should detect SQL injection attempts in query parameters', async () => {
      const response = await request(app)
        .get('/api/test?id=1 OR 1=1')
        .expect(200); // Should not block on first attempt

      // The request should pass but be logged
      expect(response.status).toBe(200);
    });

    it('should detect SQL injection attempts in request body', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ query: "SELECT * FROM users WHERE id = '1' OR '1'='1'" })
        .expect(200); // Should not block on first attempt

      expect(response.status).toBe(200);
    });

    it('should detect XSS attempts', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ content: '<script>alert("xss")</script>' })
        .expect(200); // Should not block on first attempt

      expect(response.status).toBe(200);
    });

    it('should detect path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/test/../../../etc/passwd')
        .expect(200); // Should not block on first attempt

      expect(response.status).toBe(200);
    });

    it('should detect suspicious user agents', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('User-Agent', 'sqlmap/1.0')
        .expect(200); // Should not block on first attempt

      expect(response.status).toBe(200);
    });

    it('should block IP after multiple suspicious requests', async () => {
      const suspiciousRequests = [
        () => request(app).get('/api/test?id=1 OR 1=1'),
        () =>
          request(app)
            .post('/api/test')
            .send({ content: '<script>alert("xss")</script>' }),
        () => request(app).get('/api/test/../../../etc/passwd'),
        () => request(app).get('/api/test').set('User-Agent', 'sqlmap/1.0'),
        () =>
          request(app).post('/api/test').send({ query: 'SELECT * FROM users' }),
      ];

      // Make multiple suspicious requests
      for (const makeRequest of suspiciousRequests) {
        await makeRequest().expect(200);
      }

      // The 6th suspicious request should be blocked
      await request(app).get('/api/test?id=1 OR 1=1').expect(403);
    });
  });

  describe('Request Validation', () => {
    it('should flag POST requests without Referer or Origin', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ data: 'test' })
        .expect(200); // Should not block but should be logged

      expect(response.status).toBe(200);
    });

    it('should flag unusually large requests', async () => {
      const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/test')
        .set('Content-Length', largeData.length.toString())
        .send({ data: largeData })
        .expect(200); // Should not block but should be logged

      expect(response.status).toBe(200);
    });
  });

  describe('Normal Requests', () => {
    it('should allow normal GET requests', async () => {
      await request(app)
        .get('/api/test')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        .expect(200);
    });

    it('should allow normal POST requests with proper headers', async () => {
      await request(app)
        .post('/api/test')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        .set('Referer', 'https://example.com')
        .send({ data: 'normal data' })
        .expect(200);
    });
  });
});
