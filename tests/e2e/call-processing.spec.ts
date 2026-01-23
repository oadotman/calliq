import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Call Processing Flow', () => {
  test.use({
    // Set up authenticated state
    storageState: 'tests/e2e/auth.json',
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('should upload audio file successfully', async ({ page }) => {
    // Click upload button
    await page.locator('[data-testid="upload-button"]').click();

    // Select file
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-audio.mp3');
    await fileInput.setInputFiles(testFile);

    // Fill call details
    await page.fill('input[name="title"]', 'Test Sales Call');
    await page.selectOption('select[name="category"]', 'sales');

    // Submit upload
    await page.locator('button:has-text("Upload")').click();

    // Should show progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Should show success message
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 30000 });

    // Should appear in calls list
    await expect(page.locator('text=Test Sales Call')).toBeVisible();
  });

  test('should validate file before upload', async ({ page }) => {
    await page.locator('[data-testid="upload-button"]').click();

    // Try to upload non-audio file
    const fileInput = page.locator('input[type="file"]');
    const invalidFile = path.join(__dirname, '../fixtures/document.pdf');
    await fileInput.setInputFiles(invalidFile);

    // Should show error
    await expect(page.locator('text=/Invalid file type|Only audio files/')).toBeVisible();

    // Upload button should be disabled
    await expect(page.locator('button:has-text("Upload")').locator('nth=0')).toBeDisabled();
  });

  test('should show file size validation', async ({ page }) => {
    await page.locator('[data-testid="upload-button"]').click();

    // Mock large file selection
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['x'.repeat(501 * 1024 * 1024)], 'large.mp3', {
        type: 'audio/mpeg',
      });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show size error
    await expect(page.locator('text=/too large|exceeds.*limit/')).toBeVisible();
  });

  test('should display call processing status', async ({ page }) => {
    // Navigate to a processing call
    await page.goto('/calls/processing-123');

    // Should show processing stages
    await expect(page.locator('text=Uploading')).toBeVisible();
    await expect(page.locator('text=Transcribing')).toBeVisible();
    await expect(page.locator('text=Extracting Data')).toBeVisible();

    // Check status indicators
    const stages = ['upload', 'transcribe', 'extract', 'complete'];
    for (const stage of stages) {
      const indicator = page.locator(`[data-testid="stage-${stage}"]`);
      await expect(indicator).toBeVisible();
    }
  });

  test('should view call transcript', async ({ page }) => {
    // Navigate to completed call
    await page.goto('/calls/completed-456');

    // Click transcript tab
    await page.locator('button:has-text("Transcript")').click();

    // Transcript should be visible
    await expect(page.locator('[data-testid="transcript-content"]')).toBeVisible();

    // Should have speaker labels
    await expect(page.locator('text=/Speaker [A-Z]:/')).toBeVisible();

    // Should have timestamps
    await expect(page.locator('text=/\\[\\d{2}:\\d{2}\\]/')).toBeVisible();
  });

  test('should view extracted data', async ({ page }) => {
    await page.goto('/calls/completed-456');

    // Click extracted data tab
    await page.locator('button:has-text("Extracted Data")').click();

    // Should show extracted fields
    await expect(page.locator('[data-testid="extracted-data"]')).toBeVisible();

    // Check for common fields
    const fields = ['Summary', 'Action Items', 'Key Points', 'Next Steps'];
    for (const field of fields) {
      await expect(page.locator(`text=${field}`)).toBeVisible();
    }
  });

  test('should play audio recording', async ({ page }) => {
    await page.goto('/calls/completed-456');

    // Click audio tab
    await page.locator('button:has-text("Audio")').click();

    // Audio player should be visible
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toBeVisible();

    // Play button should be available
    const playButton = page.locator('[data-testid="play-button"]');
    await expect(playButton).toBeVisible();

    // Click play
    await playButton.click();

    // Should show playing state
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible();

    // Check time display
    await expect(page.locator('[data-testid="time-display"]')).toContainText(/\d{2}:\d{2}/);
  });

  test('should export call data', async ({ page }) => {
    await page.goto('/calls/completed-456');

    // Click export button
    await page.locator('[data-testid="export-button"]').click();

    // Should show export options
    await expect(page.locator('text=Export as PDF')).toBeVisible();
    await expect(page.locator('text=Export as JSON')).toBeVisible();
    await expect(page.locator('text=Export as CSV')).toBeVisible();

    // Test PDF export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('text=Export as PDF').click(),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should delete call', async ({ page }) => {
    await page.goto('/calls/test-delete-789');

    // Click delete button
    await page.locator('[data-testid="delete-button"]').click();

    // Confirmation dialog should appear
    await expect(page.locator('text=Are you sure')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete")').nth(1).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should show success message
    await expect(page.locator('text=Call deleted successfully')).toBeVisible();

    // Call should not appear in list
    await expect(page.locator('text=test-delete-789')).not.toBeVisible();
  });

  test('should filter calls by status', async ({ page }) => {
    // Click filter dropdown
    await page.locator('[data-testid="filter-status"]').click();

    // Select completed calls
    await page.locator('text=Completed').click();

    // Only completed calls should be visible
    const callCards = page.locator('[data-testid="call-card"]');
    const count = await callCards.count();

    for (let i = 0; i < count; i++) {
      const status = await callCards.nth(i).locator('[data-testid="call-status"]').textContent();
      expect(status).toBe('Completed');
    }
  });

  test('should search calls', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'sales meeting');

    // Press enter or click search
    await page.press('[data-testid="search-input"]', 'Enter');

    // Should show matching results
    await expect(page.locator('text=/sales meeting/i')).toBeVisible();

    // Should show result count
    await expect(page.locator('text=/\\d+ results? found/')).toBeVisible();
  });

  test('should paginate through calls', async ({ page }) => {
    // Check pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

    // Click next page
    await page.locator('[data-testid="next-page"]').click();

    // URL should update
    await expect(page).toHaveURL(/page=2/);

    // Different calls should be visible
    const firstPageCall = await page.locator('[data-testid="call-card"]').first().textContent();

    await page.locator('[data-testid="prev-page"]').click();
    const prevPageCall = await page.locator('[data-testid="call-card"]').first().textContent();

    expect(firstPageCall).not.toBe(prevPageCall);
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Simulate network failure
    await context.route('**/api/calls/upload', route => {
      route.abort('failed');
    });

    // Try to upload
    await page.locator('[data-testid="upload-button"]').click();
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-audio.mp3');
    await fileInput.setInputFiles(testFile);

    await page.locator('button:has-text("Upload")').click();

    // Should show error message
    await expect(page.locator('text=/Network error|Failed to upload/')).toBeVisible();

    // Should offer retry option
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should auto-save draft uploads', async ({ page }) => {
    await page.locator('[data-testid="upload-button"]').click();

    // Fill partial form
    await page.fill('input[name="title"]', 'Draft Call');
    await page.selectOption('select[name="category"]', 'support');

    // Navigate away
    await page.goto('/dashboard');

    // Come back to upload
    await page.locator('[data-testid="upload-button"]').click();

    // Draft should be restored
    await expect(page.locator('input[name="title"]')).toHaveValue('Draft Call');
    await expect(page.locator('select[name="category"]')).toHaveValue('support');
  });
});