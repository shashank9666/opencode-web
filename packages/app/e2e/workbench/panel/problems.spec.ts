import { test, expect } from "@playwright/test"

test.describe("Problems View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Open panel
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    
    // Switch to Problems tab
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    await panel.getByRole("tab", { name: /Problems/i }).click()
  })

  test("displays error and warning lists", async ({ page }) => {
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    const problemsView = panel.locator(".problems-view, [data-testid='problems-view']")
    await expect(problemsView).toBeVisible()
    
    // Verify structure
    const filterInput = problemsView.locator("input[placeholder*='Filter'], [aria-label*='Filter']")
    await expect(filterInput).toBeVisible()
    
    // Check list container
    const list = problemsView.locator(".problems-list, [role='tree']")
    await expect(list).toBeVisible()
  })
})
