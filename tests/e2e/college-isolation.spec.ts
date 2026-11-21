import { test, expect } from '@playwright/test';

test.describe('Multi-college registration and access boundaries', () => {
  test('shows each college and accepts its configured email domains', async ({ page }) => {
    await page.route('**/rest/v1/colleges**', async (route) => {
      const corsHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': '*',
      };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '98aca361-4216-4b47-936c-2c02426a159d',
            name: 'KCC Institute',
            slug: 'kcc',
            email_domain: 'gmail.com',
            address: 'KCC Institute Campus',
            is_active: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'a7d92a10-fced-47b0-a490-00d51cd92ada',
            name: 'G. L. Bajaj Institute of Technology & Management',
            slug: 'glbitm',
            email_domain: 'glbitm.ac.in,glbitm.org',
            address: 'Knowledge Park III, Greater Noida',
            is_active: true,
            created_at: '2026-11-24T00:00:00.000Z',
            updated_at: '2026-11-24T00:00:00.000Z',
          },
        ]),
      });
    });
    await page.goto('/register');
    const collegeSelect = page.getByLabel('Select College');
    await expect(collegeSelect.locator('option', { hasText: 'KCC Institute' })).toBeAttached();
    await expect(collegeSelect.locator('option', { hasText: 'G. L. Bajaj Institute' })).toBeAttached();
    await collegeSelect.selectOption({ label: 'KCC Institute' });
    await expect(page.getByText('Use your college email ending in @gmail.com.')).toBeVisible();
    await collegeSelect.selectOption({ label: 'G. L. Bajaj Institute of Technology & Management' });
    await expect(page.getByText('Use your college email ending in @glbitm.ac.in or @glbitm.org.')).toBeVisible();
  });

  test('registration allows student and admin requests but not super-admin self-registration', async ({ page }) => {
    await page.goto('/register');
    const roleSelect = page.getByLabel('Account type');
    await expect(roleSelect.locator('option')).toHaveCount(2);
    await expect(roleSelect.locator('option[value="student"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="admin"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="super_admin"]')).toHaveCount(0);
  });

  test('approval API rejects unauthenticated access', async ({ request }) => {
    const response = await request.get('/api/approvals');
    expect(response.status()).toBe(401);
  });
});
