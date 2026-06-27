import { test, expect } from "@playwright/test"

test.describe("Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Ensure Search is open
    const searchBtn = page.getByRole("button", { name: /Search/i })
    if (await searchBtn.isVisible()) {
      await searchBtn.click()
    }
  })

  test("can perform global search", async ({ page }) => {
    const sidebar = page.locator(".sidebar, [data-testid='sidebar']")
    await expect(sidebar).toBeVisible()
    
    const searchView = sidebar.locator(".search-view, [data-testid='search-view']")
    await expect(searchView).toBeVisible()
    
    // Find search input
    const searchInput = searchView.locator("input[placeholder*='Search'], [aria-label='Search']")
    await searchInput.fill("import {")
    await searchInput.press("Enter")
    
    // Check results
    const results = searchView.locator(".search-result, .tree-node")
    // Wait for at least one result
    await expect(results.first()).toBeVisible({ timeout: 10000 })
  })

  test("toggles for match case and regex exist", async ({ page }) => {
    const searchView = page.locator(".search-view, [data-testid='search-view']")
    await expect(searchView.getByRole("button", { name: /Match Case/i }).or(searchView.locator("[title*='Match Case']"))).toBeVisible()
    await expect(searchView.getByRole("button", { name: /Use Regular Expression/i }).or(searchView.locator("[title*='Regular Expression']"))).toBeVisible()
  })
})
