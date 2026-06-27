import { test, expect } from "@playwright/test"

test.describe("Activity Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("exists and contains correct core icons", async ({ page }) => {
    // Assuming data-testid or aria-labels for selectors is preferred
    const activityBar = page.locator(".activity-bar, [data-testid='activity-bar']") 
    await expect(activityBar).toBeVisible()
    
    // Check for Explorer, Search, Source Control, Run/Debug, Extensions
    await expect(activityBar.getByRole("button", { name: /Explorer/i })).toBeVisible()
    await expect(activityBar.getByRole("button", { name: /Search/i })).toBeVisible()
    await expect(activityBar.getByRole("button", { name: /Source Control/i })).toBeVisible()
    await expect(activityBar.getByRole("button", { name: /Extensions/i })).toBeVisible()
  })

  test("clicking icon toggles the side bar", async ({ page }) => {
    const explorerBtn = page.getByRole("button", { name: /Explorer/i })
    const sidebar = page.locator(".sidebar, [data-testid='sidebar']")

    // Open
    await explorerBtn.click()
    await expect(sidebar).toBeVisible()
    
    // Clicking again should hide it
    await explorerBtn.click()
    await expect(sidebar).toBeHidden()
  })
  
  test("context menu allows hiding icons", async ({ page }) => {
    const activityBar = page.locator(".activity-bar, [data-testid='activity-bar']")
    await activityBar.click({ button: "right" })
    const contextMenu = page.locator(".context-menu, [data-testid='context-menu']")
    await expect(contextMenu).toBeVisible()
    await expect(contextMenu.getByText(/Explorer/i)).toBeVisible()
  })
})
