import { test, expect } from "@playwright/test"

test.describe("Breadcrumbs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Open a file
    await page.getByRole("button", { name: /Explorer/i }).click()
    const files = page.locator(".explorer-item")
    if (await files.first().isVisible()) {
      await files.first().click()
    }
  })

  test("breadcrumbs exist below tabs", async ({ page }) => {
    const editorHeader = page.locator(".editor-header, [data-testid='editor-header']")
    const breadcrumbs = editorHeader.locator(".breadcrumbs, [data-testid='breadcrumbs']")
    await expect(breadcrumbs).toBeVisible()
    
    // Check for file path parts
    const parts = breadcrumbs.locator(".breadcrumb-item")
    await expect(parts.first()).toBeVisible()
  })

  test("clicking a breadcrumb shows navigation picker", async ({ page }) => {
    const breadcrumbs = page.locator(".breadcrumbs, [data-testid='breadcrumbs']")
    const parts = breadcrumbs.locator(".breadcrumb-item")
    
    if (await parts.first().isVisible()) {
      await parts.last().click() // Click the file part
      
      // Should show a symbol outline or file picker
      const picker = page.locator(".breadcrumb-picker, .quick-open-widget")
      await expect(picker).toBeVisible()
    }
  })
})
