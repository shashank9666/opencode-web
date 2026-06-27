import { test, expect } from "@playwright/test"

test.describe("Editor Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Ensure we have a tab open by clicking an item in explorer
    await page.getByRole("button", { name: /Explorer/i }).click()
    // Find the first file and click it twice to open two tabs
    const files = page.locator(".explorer-item")
    if (await files.count() >= 2) {
      await files.nth(0).click()
      await files.nth(1).click()
    }
  })

  test("tabs have a close button", async ({ page }) => {
    const tabs = page.locator(".editor-tab, [data-testid='editor-tab']")
    // Wait for at least one tab
    await expect(tabs.first()).toBeVisible()
    
    // Check for close button on the active tab
    const closeBtn = tabs.first().locator(".tab-close-btn, [title='Close']")
    await expect(closeBtn).toBeVisible()
    
    // Hovering the tab should show it if hidden
    await tabs.nth(1).hover()
    await expect(tabs.nth(1).locator(".tab-close-btn, [title='Close']")).toBeVisible()
  })

  test("closing a tab removes it", async ({ page }) => {
    const tabs = page.locator(".editor-tab, [data-testid='editor-tab']")
    const initialCount = await tabs.count()
    if (initialCount > 0) {
      const closeBtn = tabs.first().locator(".tab-close-btn, [title='Close']")
      await closeBtn.click({ force: true }) // Sometimes requires hover to be interactable
      
      await expect(tabs).toHaveCount(initialCount - 1)
    }
  })

  test("dirty files show an indicator", async ({ page }) => {
    // Type something in the editor to make it dirty
    const editor = page.locator(".monaco-editor, .cm-editor")
    await editor.click()
    await page.keyboard.type(" // edit")
    
    // Check for dirty indicator (usually a dot replacing the close button or an unsaved class)
    const activeTab = page.locator(".editor-tab.active, [data-testid='editor-tab'][aria-selected='true']")
    const dirtyIndicator = activeTab.locator(".dirty-indicator, .tab-close-btn.dirty")
    await expect(dirtyIndicator).toBeVisible()
  })
})
