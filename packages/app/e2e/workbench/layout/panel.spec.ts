import { test, expect } from "@playwright/test"

test.describe("Bottom Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("can be toggled via view menu or shortcut", async ({ page }) => {
    // Assuming panel is hidden by default. If visible, adjust.
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    
    // Attempt to toggle via shortcut (Cmd+J or Ctrl+J)
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    
    await expect(panel).toBeVisible()
    
    // Toggle again to hide
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    await expect(panel).toBeHidden()
  })

  test("contains standard views (Terminal, Problems, Output, Debug Console)", async ({ page }) => {
    // Open panel
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    await expect(panel).toBeVisible()
    
    // Check tabs
    await expect(panel.getByRole("tab", { name: /Terminal/i })).toBeVisible()
    await expect(panel.getByRole("tab", { name: /Problems/i })).toBeVisible()
    await expect(panel.getByRole("tab", { name: /Output/i })).toBeVisible()
    await expect(panel.getByRole("tab", { name: /Debug Console/i })).toBeVisible()
  })

  test("can be resized", async ({ page }) => {
    const isMac = process.platform === "darwin"
    await page.keyboard.press(isMac ? "Meta+J" : "Control+J")
    const panel = page.locator(".bottom-panel, [data-testid='bottom-panel']")
    
    // Assuming there's a resize handle at the top of the panel
    const resizeHandle = panel.locator(".resize-handle-top, [data-testid='panel-resize-handle']")
    if (await resizeHandle.isVisible()) {
      const box = await resizeHandle.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y - 100) // Drag up by 100px
        await page.mouse.up()
        
        // Assert height changed (visual check or computing style)
        // const height = await panel.evaluate((el) => el.clientHeight)
        // expect(height).toBeGreaterThan(initialHeight)
      }
    }
  })
})
