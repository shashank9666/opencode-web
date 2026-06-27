import { test, expect } from "@playwright/test"

test.describe("Extensions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Ensure Extensions is open
    const extBtn = page.getByRole("button", { name: /Extensions/i })
    if (await extBtn.isVisible()) {
      await extBtn.click()
    }
  })

  test("can search for extensions", async ({ page }) => {
    const sidebar = page.locator(".sidebar, [data-testid='sidebar']")
    await expect(sidebar).toBeVisible()
    
    const extView = sidebar.locator(".extensions-view, [data-testid='extensions-view']")
    await expect(extView).toBeVisible()
    
    // Check for search input
    const searchInput = extView.locator("input[placeholder*='Search Extensions'], [aria-label='Search Extensions']")
    await expect(searchInput).toBeVisible()
    
    // Search
    await searchInput.fill("prettier")
    await searchInput.press("Enter")
    
    // Check for extension list
    const extItem = extView.locator(".extension-item, [data-testid='extension-item']")
    await expect(extItem.first()).toBeVisible({ timeout: 10000 })
    
    // Verify install button exists on item
    await expect(extItem.first().getByRole("button", { name: /Install/i })).toBeVisible()
  })
})
