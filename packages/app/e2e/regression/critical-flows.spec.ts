import { test, expect } from "@playwright/test"

test.describe("Critical IDE Regression Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("full workbench regression check", async ({ page }) => {
    const isMac = process.platform === "darwin"
    
    // 1. Editor opens/closes
    await page.getByRole("button", { name: /Explorer/i }).click()
    const files = page.locator(".explorer-item")
    await expect(files.first()).toBeVisible()
    await files.nth(0).click()
    const editorTab = page.locator(".editor-tab.active")
    await expect(editorTab).toBeVisible()
    await editorTab.locator(".tab-close-btn, [title='Close']").click({ force: true })
    await expect(editorTab).toBeHidden()

    // 2. Multiple tabs / Split editor
    await files.nth(0).click()
    await files.nth(1).click()
    const tabs = page.locator(".editor-tab")
    await expect(tabs).toHaveCount(2)
    
    const editorActions = page.locator(".editor-actions")
    const splitBtn = editorActions.getByRole("button", { name: /Split Right/i }).or(editorActions.locator("[title*='Split Editor']"))
    if (await splitBtn.isVisible()) {
      await splitBtn.click()
      await expect(page.locator(".editor-group")).toHaveCount(2)
    }

    // 3. Explorer refresh / File operations
    // Note: In real e2e, we would create a test file, rename it, and delete it here.

    // 4. Search
    const searchBtn = page.getByRole("button", { name: /Search/i })
    await searchBtn.click()
    const searchInput = page.locator(".search-view input").first()
    await expect(searchInput).toBeVisible()
    
    // 5. AI Chat
    await page.keyboard.press(isMac ? "Meta+L" : "Control+L")
    const chatInput = page.locator(".ai-chat-panel textarea, [data-testid='chat-panel'] textarea").first()
    await expect(chatInput).toBeVisible()

    // 6. Terminal
    await page.keyboard.press("Control+`")
    const terminal = page.locator(".terminal-view")
    await expect(terminal).toBeVisible()

    // 7. Command Palette
    await page.keyboard.press(isMac ? "Meta+Shift+P" : "Control+Shift+P")
    const paletteInput = page.locator(".quick-input-widget input[type='text']")
    await expect(paletteInput).toBeVisible()
    await page.keyboard.press("Escape")

    // 8. Settings
    await page.keyboard.press(isMac ? "Meta+," : "Control+,")
    await expect(page.locator(".settings-editor, [data-testid='settings-editor']")).toBeVisible()
  })
})
