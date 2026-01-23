import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/Login - CallIQ/);
    await expect(page.locator('h1')).toContainText(/Sign in to your account/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Sign in/);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Use test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should handle signup flow', async ({ page }) => {
    await page.goto('/signup');

    // Fill signup form
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="organizationName"]', 'Test Organization');

    // Accept terms
    await page.check('input[type="checkbox"]');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Should show verification message or redirect
    await expect(page.locator('text=/verification|dashboard/')).toBeVisible();
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/signup');

    // Try weak password
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');

    // Should show password requirements
    await expect(page.locator('text=at least 8 characters')).toBeVisible();
    await expect(page.locator('text=uppercase letter')).toBeVisible();
    await expect(page.locator('text=number')).toBeVisible();
    await expect(page.locator('text=special character')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password
    await page.locator('text=Forgot password?').click();

    // Should navigate to reset page
    await expect(page).toHaveURL('/reset-password');

    // Enter email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.locator('button[type="submit"]').click();

    // Should show success message
    await expect(page.locator('text=/Check your email|sent a reset link/')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');

    // Click user menu
    await page.locator('[data-testid="user-menu"]').click();

    // Click logout
    await page.locator('text=Sign out').click();

    // Should redirect to home or login
    await expect(page).toHaveURL(/\/(login|$)/);
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=/Sign in|Login/')).toBeVisible();
  });

  test('should remember user with "Remember me"', async ({ page, context }) => {
    await page.goto('/login');

    // Check remember me
    await page.check('input[name="remember"]');

    // Login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.locator('button[type="submit"]').click();

    // Check cookie is set with longer expiry
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    expect(sessionCookie).toBeDefined();
    if (sessionCookie) {
      // Cookie should expire in more than 7 days
      const expiryTime = sessionCookie.expires! * 1000;
      const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
      expect(expiryTime).toBeGreaterThan(sevenDaysFromNow);
    }
  });

  test('should handle OAuth login', async ({ page }) => {
    await page.goto('/login');

    // Click Google login
    const googleButton = page.locator('button:has-text("Continue with Google")');

    if (await googleButton.isVisible()) {
      await googleButton.click();

      // Would redirect to Google OAuth
      // In test environment, we might mock this
      await expect(page.url()).toContain('google');
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/signup');

    // Try invalid email formats
    const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com'];

    for (const email of invalidEmails) {
      await page.fill('input[name="email"]', email);
      await page.locator('input[name="password"]').click(); // Trigger blur

      await expect(page.locator('text=valid email')).toBeVisible();
    }
  });

  test('should handle session expiry', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL('/dashboard');

    // Simulate expired session by clearing cookies
    await page.context().clearCookies();

    // Try to navigate
    await page.reload();

    // Should redirect to login with message
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=/Session expired|Please sign in/')).toBeVisible();
  });
});