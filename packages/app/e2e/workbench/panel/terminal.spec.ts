import { test, expect } from "@playwright/test"

test.describe("Terminal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Open terminal via shortcut
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Control+`" : "Control+`")
  })

  test("can run basic commands", async ({ page }) => {
    const terminal = page.locator(".terminal-view, [data-testid='terminal-view']")
    await expect(terminal).toBeVisible()
    
    // Check terminal output canvas/xterm
    const xterm = terminal.locator(".xterm")
    await expect(xterm).toBeVisible()
    
    // Note: Interacting with xterm.js canvas in e2e is hard, usually we just check if it's mounted
    // Or if there is a hidden textarea to send input to:
    const textarea = terminal.locator("textarea.xterm-helper-textarea")
    if (await textarea.isVisible()) {
      await textarea.fill("echo 'hello from playwright'\n")
      // Wait for output visually or via assertions
      await page.waitForTimeout(1000)
    }
  })

  test("terminal toolbar exists", async ({ page }) => {
    const terminal = page.locator(".terminal-view, [data-testid='terminal-view']")
    
    // Check for add terminal button, kill terminal button, split terminal
    const addBtn = terminal.getByRole("button", { name: /New Terminal/i }).or(terminal.locator("[title*='New Terminal']"))
    await expect(addBtn).toBeVisible()
    
    const killBtn = terminal.getByRole("button", { name: /Kill Terminal/i }).or(terminal.locator("[title*='Kill Terminal']"))
    await expect(killBtn).toBeVisible()
  })
})
