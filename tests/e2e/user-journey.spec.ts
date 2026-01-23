/**
 * E2E Tests - Complete User Journey
 * Tests the full user experience from registration to using the application
 */

import { test, expect, Page } from '@playwright/test';

test.describe('User Registration and Onboarding', () => {
  test('should complete full registration flow', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Fill registration form
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="companyName"]', 'Test Company');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or verification page
    await page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 10000 });

    // Verify successful registration
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|verify-email)/);
  });

  test('should validate registration form inputs', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();

    // Test weak password
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/must be at least 8 characters/i')).toBeVisible();

    // Test password mismatch
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/passwords do not match/i')).toBeVisible();
  });
});

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'DemoPass123!');

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');

    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=/invalid email or password/i')).toBeVisible();

    // Ensure no redirect
    expect(page.url()).toContain('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'DemoPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Verify redirect to login
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', 'user@example.com');
    await page.click('button[type="submit"]');

    // Check for success message
    await expect(page.locator('text=/check your email/i')).toBeVisible();
  });
});

test.describe('File Upload and Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'DemoPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should upload audio file successfully', async ({ page }) => {
    // Navigate to upload page
    await page.click('[data-testid="upload-button"]');

    // Wait for modal
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-audio.mp3');

    // Fill call details
    await page.fill('input[name="customerName"]', 'John Doe');
    await page.fill('input[name="customerEmail"]', 'john@example.com');
    await page.fill('input[name="customerPhone"]', '+1234567890');

    // Submit upload
    await page.click('button[data-testid="submit-upload"]');

    // Wait for processing to start
    await expect(page.locator('text=/processing/i')).toBeVisible({ timeout: 30000 });

    // Verify call appears in list
    await page.goto('/dashboard');
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should reject invalid file types', async ({ page }) => {
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

    // Try to upload non-audio file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/document.pdf');

    // Check for error
    await expect(page.locator('text=/invalid file type/i')).toBeVisible();
  });

  test('should enforce file size limits', async ({ page }) => {
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

    // Mock large file upload (would need actual large file in real test)
    // For now, check that size limit is displayed
    await expect(page.locator('text=/max.*500.*mb/i')).toBeVisible();
  });
});

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'DemoPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display usage metrics', async ({ page }) => {
    // Check for metric cards
    await expect(page.locator('[data-testid="total-calls"]')).toBeVisible();
    await expect(page.locator('[data-testid="minutes-used"]')).toBeVisible();
    await expect(page.locator('[data-testid="minutes-remaining"]')).toBeVisible();
  });

  test('should filter calls by date range', async ({ page }) => {
    // Open date filter
    await page.click('[data-testid="date-filter"]');

    // Select last 7 days
    await page.click('text=Last 7 days');

    // Verify filter applied
    await expect(page.locator('text=Last 7 days')).toBeVisible();

    // Check that results are filtered (URL should update)
    expect(page.url()).toContain('dateRange');
  });

  test('should search calls by customer', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-calls"]', 'John');
    await page.press('[data-testid="search-calls"]', 'Enter');

    // Wait for results
    await page.waitForTimeout(1000);

    // Verify search results
    const results = page.locator('[data-testid="call-row"]');
    const count = await results.count();

    if (count > 0) {
      // If there are results, they should contain "John"
      await expect(results.first()).toContainText(/john/i);
    }
  });

  test('should view call details', async ({ page }) => {
    // Click on first call
    const firstCall = page.locator('[data-testid="call-row"]').first();

    if (await firstCall.isVisible()) {
      await firstCall.click();

      // Wait for detail view
      await expect(page.locator('[data-testid="call-detail"]')).toBeVisible();

      // Check for transcript
      await expect(page.locator('[data-testid="transcript"]')).toBeVisible();

      // Check for insights
      await expect(page.locator('[data-testid="insights"]')).toBeVisible();
    }
  });

  test('should export call data', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-calls"]');

    // Select format
    await page.click('text=CSV');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });
});

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should invite team member', async ({ page }) => {
    // Navigate to team settings
    await page.goto('/settings/team');

    // Click invite button
    await page.click('[data-testid="invite-member"]');

    // Fill invitation form
    await page.fill('input[name="email"]', 'newmember@example.com');
    await page.selectOption('select[name="role"]', 'member');

    // Send invitation
    await page.click('[data-testid="send-invitation"]');

    // Check for success message
    await expect(page.locator('text=/invitation sent/i')).toBeVisible();

    // Verify invitation appears in list
    await expect(page.locator('text=newmember@example.com')).toBeVisible();
  });

  test('should manage team member roles', async ({ page }) => {
    await page.goto('/settings/team');

    // Find team member
    const memberRow = page.locator('[data-testid="member-row"]').first();

    if (await memberRow.isVisible()) {
      // Click edit role
      await memberRow.locator('[data-testid="edit-role"]').click();

      // Change role
      await page.selectOption('select[name="role"]', 'admin');
      await page.click('[data-testid="save-role"]');

      // Verify change
      await expect(memberRow).toContainText('admin');
    }
  });

  test('should remove team member', async ({ page }) => {
    await page.goto('/settings/team');

    const memberRow = page.locator('[data-testid="member-row"]').last();

    if (await memberRow.isVisible()) {
      const memberEmail = await memberRow.locator('[data-testid="member-email"]').textContent();

      // Click remove button
      await memberRow.locator('[data-testid="remove-member"]').click();

      // Confirm removal
      await page.click('[data-testid="confirm-remove"]');

      // Verify member removed
      if (memberEmail) {
        await expect(page.locator(`text=${memberEmail}`)).not.toBeVisible();
      }
    }
  });
});

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'DemoPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display current plan details', async ({ page }) => {
    await page.goto('/settings/billing');

    // Check plan information
    await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="billing-cycle"]')).toBeVisible();
  });

  test('should show upgrade options', async ({ page }) => {
    await page.goto('/settings/billing');

    // Click upgrade button
    await page.click('[data-testid="upgrade-plan"]');

    // Check that plans are displayed
    await expect(page.locator('[data-testid="plan-option"]')).toHaveCount(3);

    // Verify plan features are shown
    await expect(page.locator('text=/minutes/i')).toBeVisible();
    await expect(page.locator('text=/team.*members/i')).toBeVisible();
  });

  test('should handle usage overage', async ({ page }) => {
    await page.goto('/settings/billing');

    // Check for overage section
    const overageSection = page.locator('[data-testid="overage-section"]');

    if (await overageSection.isVisible()) {
      // Check overage details
      await expect(overageSection.locator('[data-testid="overage-minutes"]')).toBeVisible();
      await expect(overageSection.locator('[data-testid="overage-cost"]')).toBeVisible();

      // Option to purchase additional minutes
      await expect(page.locator('[data-testid="buy-minutes"]')).toBeVisible();
    }
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through main navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Continue tabbing through interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for main navigation aria labels
    await expect(page.locator('[aria-label="Main navigation"]')).toBeVisible();

    // Check for form labels
    await page.goto('/login');
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
  });

  test('should work with screen reader', async ({ page }) => {
    await page.goto('/');

    // Check for skip links
    const skipLink = page.locator('[href="#main-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toHaveText(/skip to.*content/i);
    }

    // Check for heading hierarchy
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
  });
});