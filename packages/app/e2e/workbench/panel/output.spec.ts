import { test, expect } from "@playwright/test"

test.describe("Output View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Open panel
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    
    // Switch to Output tab
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    await panel.getByRole("tab", { name: /Output/i }).click()
  })

  test("can switch channels", async ({ page }) => {
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    const outputView = panel.locator(".output-view, [data-testid='output-view']")
    await expect(outputView).toBeVisible()
    
    // Look for channel selector
    const channelSelect = outputView.locator("select, .channel-selector")
    await expect(channelSelect).toBeVisible()
    
    // Verify clear button
    const clearBtn = outputView.getByRole("button", { name: /Clear Output/i }).or(outputView.locator("[title*='Clear Output']"))
    await expect(clearBtn).toBeVisible()
  })
})
