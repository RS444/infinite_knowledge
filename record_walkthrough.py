import os
import shutil
import time
from playwright.sync_api import sync_playwright

VIDEO_DIR = os.path.abspath("recorded_demo")
FINAL_VIDEO_NAME = "infinite_knowledge_demo.webm"
ARTIFACT_DIR = r"C:\Users\Vijay\.gemini\antigravity\brain\379e2eff-1c11-4f1e-9d41-076e42681dc0"

if os.path.exists(VIDEO_DIR):
    shutil.rmtree(VIDEO_DIR)
os.makedirs(VIDEO_DIR, exist_ok=True)

print("Starting Playwright screen recorder...")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel="chrome",
        headless=True,
    )

    context = browser.new_context(
        record_video_dir=VIDEO_DIR,
        record_video_size={"width": 1280, "height": 720},
        viewport={"width": 1280, "height": 720},
    )

    page = context.new_page()

    # 1. Dashboard Page
    print("Step 1: Dashboard...")
    page.goto("http://localhost:5173", wait_until="networkidle")
    time.sleep(2.5)

    # Smooth scroll down to show metrics and subjects
    page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' })")
    time.sleep(2.0)
    page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
    time.sleep(1.5)

    # 2. Upload Page
    print("Step 2: Upload Page...")
    page.click("button:has-text('Upload Study Material')")
    time.sleep(2.0)

    # Fill subject title
    subj_input = page.locator("#subject-name-input")
    if subj_input.is_visible():
        subj_input.fill("Cloud Computing Fundamentals")
        time.sleep(1.5)

    # Attach file
    doc_path = os.path.abspath("sample_study_material.docx")
    page.set_input_files("input[type='file']", doc_path)
    time.sleep(2.5)

    # Scroll down to show the specifications card
    page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' })")
    time.sleep(2.5)
    page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
    time.sleep(1.5)

    # 3. My Learning Catalog
    print("Step 3: My Learning Catalog...")
    page.click("nav button:has-text('My Learning')")
    time.sleep(2.5)

    # Click on the first available subject card
    cards = page.locator(".learning-subject-card")
    if cards.count() > 0:
        print(f"Found {cards.count()} subject cards")
        cards.first.click()
        time.sleep(3.0)

        # 4. Knowledge Tree & Concept Details
        print("Step 4: Knowledge Tree...")
        # Expand / click on a concept
        concept_nodes = page.locator(".concept-node-item, .concept-title")
        if concept_nodes.count() > 0:
            print(f"Clicking concept: {concept_nodes.first.inner_text()}")
            concept_nodes.first.click()
            time.sleep(2.5)

            # Scroll down the Concept Details Panel to see source references
            details_panel = page.locator(".concept-details-panel, .concept-details-body")
            if details_panel.count() > 0:
                details_panel.first.evaluate("el => el.scrollBy({ top: 250, behavior: 'smooth' })")
                time.sleep(2.0)

            # Try to launch AI Tutor modal
            tutor_btn = page.locator("button:has-text('Study with AI Tutor'), button:has-text('AI Tutor'), button:has-text('Learn with AI')").first
            if tutor_btn.is_visible():
                print("Step 5: Opening AI Tutor...")
                tutor_btn.click()
                time.sleep(3.0)

                # Close tutor modal
                close_btn = page.locator(".tutor-modal-header button, button[aria-label='Close'], button:has-text('Close')").first
                if close_btn.is_visible():
                    close_btn.click()
                    time.sleep(1.5)

    # 6. Settings Page
    print("Step 6: Settings Page...")
    page.click("nav button:has-text('Settings')")
    time.sleep(2.0)

    test_btn = page.locator("button:has-text('Test API & Database Connectivity')")
    if test_btn.is_visible():
        test_btn.click()
        time.sleep(3.0)

    # 7. Back to Dashboard
    print("Step 7: Returning to Dashboard...")
    page.click("nav button:has-text('Dashboard')")
    time.sleep(2.5)

    page.close()
    video = page.video
    video_path = video.path() if video else None
    context.close()
    browser.close()

print(f"Video recorded to raw path: {video_path}")

if video_path and os.path.exists(video_path):
    dest_path = os.path.abspath(FINAL_VIDEO_NAME)
    shutil.copy(video_path, dest_path)
    file_size_mb = os.path.getsize(dest_path) / (1024 * 1024)
    print(f"Video saved to: {dest_path} ({file_size_mb:.2f} MB)")

    if os.path.exists(ARTIFACT_DIR):
        artifact_video = os.path.join(ARTIFACT_DIR, FINAL_VIDEO_NAME)
        shutil.copy(video_path, artifact_video)
        print(f"Video copied to artifact dir: {artifact_video}")
