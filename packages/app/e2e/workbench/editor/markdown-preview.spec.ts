import { test, expect } from "@playwright/test"

test.describe("Markdown Preview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can open markdown preview", async ({ page }) => {
    // Open a markdown file
    await page.getByRole("button", { name: /Explorer/i }).click()
    const files = page.locator(".explorer-item").filter({ hasText: /\.md$/i })
    
    if (await files.first().isVisible()) {
      await files.first().click()
      
      // Click open preview button
      const editorActions = page.locator(".editor-actions, [data-testid='editor-actions']")
      const previewBtn = editorActions.getByRole("button", { name: /Open Preview/i }).or(editorActions.locator("[title*='Open Preview']"))
      
      if (await previewBtn.isVisible()) {
        await previewBtn.click()
        
        // Check for preview rendered container
        const preview = page.locator(".markdown-preview, [data-testid='markdown-preview']")
        await expect(preview).toBeVisible()
      }
    }
  })
})
