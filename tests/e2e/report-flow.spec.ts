import { test, expect } from '@playwright/test';

test.describe('Authentication, Password Recovery, Report Submission, Tracking, Dashboard, and Mobile UX', () => {
  test('login page accepts username and links to password recovery', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username or college email')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });

  test('password recovery validates email, shows generic success, and update-password enforces 8 chars', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(
      page.getByText('Enter the email linked to your account. For username sign-in, use your account email address.')
    ).toBeVisible();

    await page.getByLabel('Account email').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Enter the email address linked to your account.')).toBeVisible();
    await expect(page.locator('#forgot-password-email')).toBeFocused();
    await expect(page.locator('#forgot-password-email')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Account email').fill('someone@gmail.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('If an account exists for this email, a reset link has been sent.')
    ).toBeVisible();

    await page.goto('/auth/update-password');
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.locator('#new-password').fill('short');
    await page.locator('#confirm-new-password').fill('short');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('Use a password with at least 8 characters.')).toBeVisible();
    await expect(page.locator('#new-password')).toBeFocused();
  });

  test('student workflow: dashboard filters, report form placeholder/validation, submit, /track lookup, upvote toggle, and chat', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('#login-identifier').fill('aarav.sharma@gmail.com');
    await page.locator('#login-password').fill('student123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    // Dashboard filters (All / Active / Resolved + Category)
    await expect(page.getByRole('heading', { name: /Welcome back, Aarav Sharma/i })).toBeVisible();
    await page.getByRole('button', { name: /Resolved \(/i }).click();
    await expect(page.getByText('Wi-Fi access point offline in seminar hall')).toBeVisible();
    await page.getByRole('button', { name: /Active \(/i }).click();
    await expect(page.getByText('Flickering corridor lights on 2nd floor')).toBeVisible();
    await page.getByLabel('Filter by category').selectOption('plumbing');
    await expect(page.getByText('Drinking water cooler tap leaking')).toBeVisible();
    await page.getByLabel('Filter by category').selectOption('all');
    await page.getByRole('button', { name: /All \(/i }).click();

    // Report creation form checks
    await page.goto('/report/new');
    const floorSelect = page.locator('#floor-level');
    await expect(floorSelect.locator('option', { hasText: 'Select floor' })).toHaveCount(1);

    // Submitting empty form focuses the first invalid field
    await page.getByRole('button', { name: 'Submit Maintenance Report' }).click();
    await expect(page.locator('#issue-summary-title')).toBeFocused();
    await expect(page.locator('#issue-summary-title')).toHaveAttribute('aria-invalid', 'true');

    // Fill and submit a unique report
    const uniqueTitle = `E2E Water Filter Valve Issue ${Date.now()}`;
    await page.locator('#issue-summary-title').fill(uniqueTitle);
    await page.getByRole('radio', { name: /Water/i }).click();
    await page.locator('#building').selectOption({ index: 3 });
    await floorSelect.selectOption('2nd Floor');
    const sectionSelect = page.locator('#section');
    if (await sectionSelect.isVisible()) {
      await sectionSelect.selectOption('A2');
    }
    await page.locator('#detailed-description').fill('Drinking water filter valve near corridor 202 is stuck closed.');
    await page.getByRole('button', { name: 'Submit Maintenance Report' }).click();

    await page.waitForURL('**/track/*-*');
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();
    const trackingUrl = page.url();
    const trackingId = trackingUrl.split('/').pop() || '';
    expect(trackingId).toMatch(/^[A-Z0-9]+-\d{6}-[A-Z0-9]+$/);

    // Toggle upvote
    const upvoteBtn = page.getByRole('button', { name: /Upvote \(0\)/i });
    await upvoteBtn.click();
    await expect(page.getByRole('button', { name: /Upvote \(1\)/i })).toBeVisible();
    await page.getByRole('button', { name: /Upvote \(1\)/i }).click();
    await expect(page.getByRole('button', { name: /Upvote \(0\)/i })).toBeVisible();

    // Public /track search navigates to detail page
    await page.goto('/track');
    await page.locator('#tracking-id-search').fill(trackingId);
    await page.getByRole('button', { name: 'Track Status' }).click();
    await page.waitForURL(`**/track/${trackingId}`);
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // Campus chat send and receive
    await page.goto('/chat');
    const chatMessage = `E2E chat check for ${trackingId}`;
    await page.locator('#chat-message-input').fill(chatMessage);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(chatMessage)).toBeVisible();
  });

  test('public and authenticated pages have no horizontal overflow at 360px mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of ['/', '/login', '/register', '/forgot-password', '/track']) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `Overflow detected on ${route}`).toBeLessThanOrEqual(0);
    }

    await page.goto('/login');
    await page.locator('#login-identifier').fill('aarav.sharma@gmail.com');
    await page.locator('#login-password').fill('student123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    for (const route of ['/dashboard', '/report/new', '/chat']) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `Overflow detected on ${route}`).toBeLessThanOrEqual(0);
    }
  });
});
