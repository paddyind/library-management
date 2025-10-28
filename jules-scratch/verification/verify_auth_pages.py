
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Login page
    page.goto("http://localhost:3000/login")
    page.screenshot(path="jules-scratch/verification/login.png")

    # Register page
    page.goto("http://localhost:3000/register")
    page.screenshot(path="jules-scratch/verification/register.png")

    # Help page
    page.goto("http://localhost:3000/help")
    page.screenshot(path="jules-scratch/verification/help.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
