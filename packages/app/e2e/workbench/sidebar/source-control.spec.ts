import { test, expect } from "@playwright/test"

test.describe("Source Control", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Ensure Source Control is open
    const scmBtn = page.getByRole("button", { name: /Source Control/i })
    if (await scmBtn.isVisible()) {
      await scmBtn.click()
    }
  })

  test("displays changes and commit input", async ({ page }) => {
    const sidebar = page.locator(".sidebar, [data-testid='sidebar']")
    await expect(sidebar).toBeVisible()
    
    const scmView = sidebar.locator(".scm-view, [data-testid='scm-view']")
    await expect(scmView).toBeVisible()
    
    // Check for commit input
    const commitInput = scmView.locator("textarea[placeholder*='Message'], [aria-label='Commit Message']")
    await expect(commitInput).toBeVisible()
    
    // Check for commit button
    const commitBtn = scmView.getByRole("button", { name: /Commit/i })
    await expect(commitBtn).toBeVisible()
    
    // Check for Changes section
    await expect(scmView.getByText(/Changes/i)).toBeVisible()
  })
})
