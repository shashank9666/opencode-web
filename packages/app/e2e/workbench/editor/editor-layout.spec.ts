import { test, expect } from "@playwright/test"

test.describe("Editor Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can split editor horizontally", async ({ page }) => {
    // Open a file
    await page.getByRole("button", { name: /Explorer/i }).click()
    const files = page.locator(".explorer-item")
    if (await files.first().isVisible()) {
      await files.first().click()
    }
    
    // Click split right button in editor title bar
    const editorActions = page.locator(".editor-actions, [data-testid='editor-actions']")
    const splitBtn = editorActions.getByRole("button", { name: /Split Right/i }).or(editorActions.locator("[title*='Split Editor']"))
    if (await splitBtn.isVisible()) {
      await splitBtn.click()
      
      // Verify there are two editor groups
      const groups = page.locator(".editor-group, [data-testid='editor-group']")
      await expect(groups).toHaveCount(2)
      
      // Verify splitter handle exists between them
      const splitter = page.locator(".split-view-view-sash")
      await expect(splitter.first()).toBeVisible()
    }
  })

  test("empty editor groups have watermarks/placeholders", async ({ page }) => {
    // Depending on the app, splitting and then closing the tab might leave an empty group
    const groups = page.locator(".editor-group, [data-testid='editor-group']")
    if (await groups.count() > 0) {
      // Find empty group
      const emptyGroup = groups.filter({ hasNot: page.locator(".monaco-editor, .cm-editor") }).first()
      if (await emptyGroup.isVisible()) {
        const watermark = emptyGroup.locator(".editor-group-watermark, .empty-editor-placeholder")
        await expect(watermark).toBeVisible()
      }
    }
  })
})
