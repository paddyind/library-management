from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    print("Page loaded")
    time.sleep(5)
    print(page.content())

    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Login").click()

    page.goto("http://localhost:3000/books")
    page.screenshot(path="jules-scratch/verification/books_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
