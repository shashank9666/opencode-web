import { test, expect } from "@playwright/test"

test.describe("AI Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can open chat and send a message", async ({ page }) => {
    // Depending on implementation, it might be in sidebar or its own overlay
    // Try sidebar toggle or command palette
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+L" : "Control+L") // Common shortcut for AI Chat
    
    const chatPanel = page.locator(".ai-chat-panel, [data-testid='chat-panel']")
    await expect(chatPanel).toBeVisible()
    
    const input = chatPanel.locator("textarea[placeholder*='Ask'], [contenteditable='true']")
    await expect(input).toBeVisible()
    
    await input.fill("Hello, how do I create a test?")
    await input.press("Enter")
    
    // Verify user message appears
    const userMsg = chatPanel.locator(".chat-message.user")
    await expect(userMsg.first()).toBeVisible()
    
    // Verify AI response starts generating (might take time)
    const aiMsg = chatPanel.locator(".chat-message.ai")
    await expect(aiMsg.first()).toBeVisible({ timeout: 15000 })
  })
})
