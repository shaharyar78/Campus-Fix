import { test, expect } from '@playwright/test';

test.describe('Multi-college registration, page guards, admin, and super-admin workflows', () => {
  test('shows each college and accepts its configured email domains', async ({ page }) => {
    await page.goto('/register');
    const collegeSelect = page.getByLabel('Select College');
    await expect(collegeSelect.locator('option', { hasText: 'KCC Institute' })).toBeAttached();
    await expect(collegeSelect.locator('option', { hasText: 'G. L. Bajaj Institute' })).toBeAttached();
    await collegeSelect.selectOption({ label: 'KCC Institute' });
    await expect(page.getByText('Allowed domain: @gmail.com')).toBeVisible();
    await collegeSelect.selectOption({ label: 'G. L. Bajaj Institute of Technology & Management' });
    await expect(page.getByText('Allowed domain: @glbitm.ac.in, @glbitm.org')).toBeVisible();
  });

  test('registration allows student and admin requests but not super-admin self-registration', async ({ page }) => {
    await page.goto('/register');
    const roleSelect = page.getByLabel('Account type');
    await expect(roleSelect.locator('option')).toHaveCount(2);
    await expect(roleSelect.locator('option[value="student"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="admin"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="super_admin"]')).toHaveCount(0);
  });

  test('unauthenticated users are redirected from protected routes and students are blocked from admin routes', async ({
    page,
  }) => {
    for (const protectedPath of ['/dashboard', '/report/new', '/chat', '/admin', '/super-admin']) {
      await page.goto(protectedPath);
      await page.waitForURL('**/login');
    }

    await page.goto('/login');
    await page.locator('#login-identifier').fill('aarav.sharma@gmail.com');
    await page.locator('#login-password').fill('student123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/admin');
    await page.waitForURL('**/dashboard');

    await page.goto('/super-admin');
    await page.waitForURL('**/dashboard');
  });

  test('admin manages buildings and reports; super-admin logs in by username and opens college management', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('#login-identifier').fill('facilities.kcc@gmail.com');
    await page.locator('#login-password').fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin');

    await expect(page.getByRole('heading', { name: 'Campus Reports Triage' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending Student Approvals' })).toBeVisible();

    await page.goto('/admin/buildings');
    await expect(page.getByRole('heading', { name: /Manage Campus Buildings|Campus Buildings/i })).toBeVisible();

    // Sign out and log in as superadmin via username
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    await page.locator('#login-identifier').fill('superadmin');
    await page.locator('#login-password').fill('superadmin123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/super-admin');

    await expect(page.getByRole('heading', { name: 'Multi-College Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending Admin Approvals' })).toBeVisible();
  });

  test('approval API rejects unauthenticated access', async ({ request }) => {
    const response = await request.get('/api/approvals');
    expect(response.status()).toBe(401);
  });
});
