#!/usr/bin/env python3
"""Real Playwright QA for the lazy listening surface using Astro preview."""
from __future__ import annotations

import http.client
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

HOST = "127.0.0.1"
PORT = 4337
BASE = f"http://{HOST}:{PORT}"
SONG = "/en/songs/nokta-ombroj/"
PLAYLIST = "/en/playlists/start-here-modern-esperanto-pop-rock/"
PROVIDER_HOSTS = ("open.spotify.com", "music.apple.com", "musickit")


def fail(message: str) -> None:
    print(f"[test:browser-listening] local-blocker\nProblem: {message}", file=sys.stderr)
    sys.exit(1)


def wait_for_preview(process: subprocess.Popen[str]) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            fail(f"Astro preview exited before readiness (status {process.returncode}).\n{output}")
        try:
            connection = http.client.HTTPConnection(HOST, PORT, timeout=1)
            connection.request("GET", "/")
            connection.getresponse().read()
            connection.close()
            return
        except OSError:
            time.sleep(0.1)
    fail("Astro preview did not become ready within 30 seconds. Run npm run build and inspect npm run preview output.")


def wait_for_count(locator, count: int, timeout: float = 3) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if locator.count() == count:
            return
        time.sleep(0.1)
    raise AssertionError(f"Expected {count} matching elements; found {locator.count()}.")


def run_browser() -> None:
    print("[test:browser-listening] launching Playwright Chromium", flush=True)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        fail("Playwright Python bindings are unavailable. Install/use the already-approved environment Playwright tooling, then rerun npm run test:browser-listening.")

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except Exception as error:
            fail(f"Playwright Chromium could not launch: {error}. Run playwright install chromium, then rerun npm run test:browser-listening.")
        try:
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            provider_requests: list[str] = []
            page.on("request", lambda request: provider_requests.append(request.url) if any(host in request.url for host in PROVIDER_HOSTS) else None)
            page.set_default_timeout(3_000)
            page.goto(f"{BASE}{SONG}", wait_until="domcontentloaded")
            surface = page.locator("[data-listening-surface]")
            if surface.count() != 1 or not page.locator("[data-listening-fallback]").is_visible():
                raise AssertionError("Song surface or permanent external fallback is missing.")
            if provider_requests or page.locator("[data-listening-panel] iframe").count() != 0:
                raise AssertionError("A provider request or iframe occurred before an explicit gesture.")

            spotify = page.locator('[data-listening-provider="spotify"]')
            apple = page.locator('[data-listening-provider="apple_music"]')
            spotify.click()
            wait_for_count(page.locator("[data-listening-panel] iframe"), 1)
            if not page.locator("[data-listening-fallback]").is_visible():
                raise AssertionError("Fallback disappeared while Spotify was loading.")
            apple.click()
            wait_for_count(page.locator("[data-listening-panel] iframe"), 0)
            if surface.get_attribute("data-listening-state") != "external-only" or not page.locator("[data-listening-message]").is_visible() or not page.locator("[data-listening-fallback]").is_visible():
                raise AssertionError("Apple external-only switch did not retain state message and fallback.")
            spotify.click()
            wait_for_count(page.locator("[data-listening-panel] iframe"), 1)
            if page.locator("[data-listening-panel] iframe").count() != 1:
                raise AssertionError("Provider switching left duplicate iframes.")

            apple.focus()
            page.keyboard.press("Home")
            if spotify.get_attribute("aria-selected") != "true":
                raise AssertionError("Home did not activate the first provider tab.")
            page.keyboard.press("End")
            if apple.get_attribute("aria-selected") != "true" or not page.locator("[data-listening-message]").is_visible():
                raise AssertionError("End did not activate the final provider tab with visible status.")

            page.goto(f"{BASE}{PLAYLIST}", wait_until="domcontentloaded")
            playlist_surface = page.locator('[data-listening-entity-type="playlist"]')
            playlist_load = page.locator("[data-listening-load]")
            provider_requests_before_load = len(provider_requests)
            if playlist_surface.count() != 1 or not playlist_load.is_visible() or page.locator("[data-listening-panel] iframe").count() != 0:
                raise AssertionError("Playlist explicit-load surface is missing or created an iframe before Load player.")
            if len(provider_requests) != provider_requests_before_load:
                raise AssertionError("A playlist provider request occurred before Load player.")
            playlist_load.click()
            wait_for_count(page.locator("[data-listening-panel] iframe"), 1)
            if not page.locator("[data-listening-message]").is_visible() or not page.locator("[data-listening-fallback]").is_visible():
                raise AssertionError("Playlist loading did not retain visible status and external fallback.")
            menu_summary = page.locator("[data-listening-menu] summary").first
            menu_summary.focus()
            page.keyboard.press("Enter")
            if not page.locator('[data-listening-menu][open] [role="menu"]').first.is_visible():
                raise AssertionError("Keyboard Enter did not open the compact provider menu.")
            page.keyboard.press("Escape")
            if page.locator("[data-listening-menu][open]").count() != 0 or page.evaluate("document.activeElement === document.querySelector('[data-listening-menu] summary')") is not True:
                raise AssertionError("Escape did not close the provider menu and restore focus.")

            mobile = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            mobile_page = mobile.new_page()
            mobile_page.set_default_timeout(3_000)
            mobile_page.goto(f"{BASE}{SONG}", wait_until="domcontentloaded")
            overflow = mobile_page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            if overflow:
                raise AssertionError("Listening surface causes horizontal overflow at the mobile viewport.")
            mobile_page.locator('[data-listening-provider="spotify"]').focus()
            outline = mobile_page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
            if outline == "none":
                raise AssertionError("Focused listening control has no visible outline.")
            mobile.close()
            context.close()
        finally:
            browser.close()


def main() -> None:
    if not Path("dist/index.html").exists():
        fail("Missing dist/index.html. Run npm run build before npm run test:browser-listening.")
    process = subprocess.Popen(
        ["npm", "run", "preview", "--", "--host", HOST, "--port", str(PORT), "--strictPort"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True,
    )
    try:
        wait_for_preview(process)
        print("[test:browser-listening] Astro preview ready", flush=True)
        run_browser()
        print("[test:browser-listening] PASS — real Playwright preview test verified gesture-gated song and playlist requests, iframe cleanup, keyboard controls, fallback/status visibility, and mobile focus/no-overflow.")
    except AssertionError as error:
        fail(str(error))
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)


if __name__ == "__main__":
    main()
