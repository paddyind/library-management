from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Login as admin
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state("networkidle")
        page.fill("input[name='email']", "admin@example.com")
        page.fill("input[name='password']", "password")
        page.click("button[type='submit']")
        page.wait_for_url("**/")

        # Go to settings page
        page.goto("http://localhost:3000/settings")

        # Take screenshot
        page.screenshot(path="jules-scratch/verification/settings.png")
    except Exception as e:
        print(e)
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
