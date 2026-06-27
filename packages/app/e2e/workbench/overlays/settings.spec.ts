import { test, expect } from "@playwright/test"

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can open and search settings", async ({ page }) => {
    // Open settings via shortcut (Cmd+, or Ctrl+,)
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+," : "Control+,")
    
    // Settings view should appear
    const settingsEditor = page.locator(".settings-editor, [data-testid='settings-editor']")
    await expect(settingsEditor).toBeVisible()
    
    // Search for a setting
    const searchInput = settingsEditor.locator("input[placeholder*='Search Settings'], [aria-label*='Search Settings']")
    await expect(searchInput).toBeVisible()
    
    await searchInput.fill("theme")
    await searchInput.press("Enter")
    
    // Wait for filtered results
    const results = settingsEditor.locator(".setting-item, [data-testid='setting-item']")
    await expect(results.first()).toBeVisible()
  })
})
