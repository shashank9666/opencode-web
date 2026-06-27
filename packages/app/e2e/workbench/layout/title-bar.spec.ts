import { test, expect } from "@playwright/test"

test.describe("Title Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("contains command center", async ({ page }) => {
    const titleBar = page.locator(".title-bar, [data-testid='title-bar']")
    await expect(titleBar).toBeVisible()
    
    // Command center usually acts as search/command palette entry
    const commandCenter = titleBar.locator(".command-center, [data-testid='command-center']")
    await expect(commandCenter).toBeVisible()
  })

  test("window controls exist", async ({ page }) => {
    const windowControls = page.locator(".window-controls, [data-testid='window-controls']")
    // We only expect them to exist in the DOM or be visible depending on platform
    await expect(windowControls).toBeAttached()
  })
  
  test("custom menus are present", async ({ page }) => {
    const menubar = page.locator(".menubar, [data-testid='menubar']")
    await expect(menubar.getByText(/File/i)).toBeVisible()
    await expect(menubar.getByText(/Edit/i)).toBeVisible()
    await expect(menubar.getByText(/View/i)).toBeVisible()
  })
})
