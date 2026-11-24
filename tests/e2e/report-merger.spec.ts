import { test, expect } from '@playwright/test';

test.describe('Protected report APIs and security guards', () => {
  test('report listing requires authentication', async ({ request }) => {
    const response = await request.get('/api/reports');
    expect(response.status()).toBe(401);
  });

  test('report creation requires authentication and does not write data', async ({ request }) => {
    const response = await request.post('/api/reports', {
      data: {
        title: 'E2E test report',
        description: 'This request must be rejected before creating a record.',
        category: 'electrical',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('state-changing endpoints reject foreign Origin with 403', async ({ request }) => {
    const response = await request.post('/api/reports', {
      headers: {
        Origin: 'https://foreign.example.com',
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Cross origin test',
        description: 'Should fail origin check with 403.',
        category: 'electrical',
      },
    });
    expect(response.status()).toBe(403);
  });
});
