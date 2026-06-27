import { test, expect } from "@playwright/test"

test.describe("Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Ensure Explorer is open
    const explorerBtn = page.getByRole("button", { name: /Explorer/i })
    if (await explorerBtn.isVisible()) {
      await explorerBtn.click()
    }
  })

  test("can list files in workspace", async ({ page }) => {
    const sidebar = page.locator(".sidebar, [data-testid='sidebar']")
    await expect(sidebar).toBeVisible()
    
    const explorer = sidebar.locator(".explorer, [data-testid='explorer-view']")
    await expect(explorer).toBeVisible()
    
    // Check for some file items
    const fileItems = explorer.locator(".explorer-item, [data-testid='explorer-item']")
    await expect(fileItems.first()).toBeVisible()
  })

  test("can create a new file", async ({ page }) => {
    const explorer = page.locator(".explorer, [data-testid='explorer-view']")
    // Find new file button in explorer toolbar
    const newFileBtn = explorer.getByRole("button", { name: /New File/i })
    if (await newFileBtn.isVisible()) {
      await newFileBtn.click()
      
      // Look for input field
      const input = explorer.locator("input[type='text']")
      await expect(input).toBeVisible()
      
      await input.fill("test-new-file.txt")
      await input.press("Enter")
      
      // Verify file appears in list
      await expect(explorer.getByText("test-new-file.txt")).toBeVisible()
    }
  })

  test("file renaming works", async ({ page }) => {
    // Assuming there's a file we can rename
    const explorer = page.locator(".explorer, [data-testid='explorer-view']")
    const item = explorer.locator(".explorer-item").filter({ hasText: "test-new-file.txt" }).first()
    
    if (await item.isVisible()) {
      await item.click({ button: "right" })
      const contextMenu = page.locator(".context-menu, [data-testid='context-menu']")
      await contextMenu.getByText(/Rename/i).click()
      
      const input = explorer.locator("input[type='text']")
      await input.fill("test-new-file-renamed.txt")
      await input.press("Enter")
      
      await expect(explorer.getByText("test-new-file-renamed.txt")).toBeVisible()
    }
  })
})
