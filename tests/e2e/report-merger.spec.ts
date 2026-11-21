import { test, expect } from '@playwright/test';

test.describe('Protected report APIs', () => {
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
});
