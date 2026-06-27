import { test, expect } from "@playwright/test"

test.describe("Status Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("exists and is visible", async ({ page }) => {
    const statusBar = page.locator(".status-bar, [data-testid='status-bar']")
    await expect(statusBar).toBeVisible()
  })

  test("contains standard segments", async ({ page }) => {
    const statusBar = page.locator(".status-bar, [data-testid='status-bar']")
    
    // Check for git branch / sync status
    await expect(statusBar.getByRole("button", { name: /main|dev|master/i }).or(statusBar.locator(".git-status"))).toBeAttached()
    
    // Check for notifications bell
    const notificationsBtn = statusBar.locator(".notifications-btn, [aria-label='Notifications']")
    await expect(notificationsBtn).toBeAttached()
  })

  test("shows editor information when an editor is active", async ({ page }) => {
    // Open a file first
    await page.getByRole("button", { name: /Explorer/i }).click()
    // Mock clicking a file in the tree
    const fileItem = page.locator(".explorer-item").first()
    if (await fileItem.isVisible()) {
      await fileItem.click()
      
      const statusBar = page.locator(".status-bar, [data-testid='status-bar']")
      // Check for line/col info
      await expect(statusBar.getByText(/Ln \d+, Col \d+/i)).toBeVisible()
      
      // Check for language mode
      await expect(statusBar.locator(".language-mode")).toBeVisible()
    }
  })
})
