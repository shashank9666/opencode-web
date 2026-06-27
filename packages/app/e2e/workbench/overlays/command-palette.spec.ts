import { test, expect } from "@playwright/test"

test.describe("Command Palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can open via shortcut and execute commands", async ({ page }) => {
    // Open command palette (Cmd+Shift+P or Ctrl+Shift+P)
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+Shift+P" : "Control+Shift+P")
    
    const palette = page.locator(".quick-input-widget, .command-palette, [data-testid='command-palette']")
    await expect(palette).toBeVisible()
    
    const input = palette.locator("input[type='text']")
    await expect(input).toBeFocused()
    
    // Type a command
    await input.fill("Toggle Panel")
    
    // Wait for results
    const results = palette.locator(".quick-pick-list-item, [role='option']")
    await expect(results.first()).toBeVisible()
    
    // Select first result
    await input.press("Enter")
    
    // Palette should close
    await expect(palette).toBeHidden()
  })
})
