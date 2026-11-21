import { test, expect } from '@playwright/test';

test.describe('Login and password recovery', () => {
  test('login page accepts username and links to password recovery', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username or college email')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });

  test('password recovery validates email without sending a request', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Account email').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Enter the email address linked to your account.')).toBeVisible();
  });

  test('new password page requires a valid reset session', async ({ page }) => {
    await page.goto('/auth/update-password');
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.locator('#new-password').fill('short');
    await page.locator('#confirm-new-password').fill('short');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('Use a password with at least 8 characters.')).toBeVisible();
  });
});
