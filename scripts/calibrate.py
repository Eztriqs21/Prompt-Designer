#!/usr/bin/env python3
"""
VibeLoop Calibration Script

Run this once to calibrate screen positions for OpenCode GUI automation.
The script will ask you to click on specific UI elements and save the positions.

Usage:
    python scripts/calibrate.py
"""

import json
import sys
import time
import os

try:
    import pyautogui
    import pygetwindow as gw
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install pyautogui pygetwindow")
    sys.exit(1)

BRIDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bridge')
CONFIG_PATH = os.path.join(BRIDGE_DIR, 'config.json')


def find_opencode_window():
    """Find the OpenCode window by title."""
    try:
        windows = gw.getWindowsWithTitle('OpenCode')
        if windows:
            return windows[0]
    except Exception:
        pass
    return None


def wait_for_click(prompt_text):
    """Wait for user to click somewhere and return the position."""
    print(f"\n{prompt_text}")
    print("  Move your mouse to the position and press ENTER to capture it.")
    input("  Press ENTER when ready...")

    # Give user time to move mouse
    time.sleep(0.5)
    pos = pyautogui.position()
    print(f"  Captured position: ({pos.x}, {pos.y})")
    return {"x": pos.x, "y": pos.y}


def main():
    print("=" * 60)
    print("  VibeLoop Calibration Script")
    print("=" * 60)
    print()
    print("This script calibrates screen positions for OpenCode automation.")
    print("You will be asked to click on 3 UI elements in OpenCode.")
    print()
    print("Prerequisites:")
    print("  1. OpenCode must be open")
    print("  2. You must have a chat open in OpenCode")
    print("  3. OpenCode window should be visible (not minimized)")
    print()

    # Check for OpenCode window
    opencode_window = find_opencode_window()
    if opencode_window:
        print(f"Found OpenCode window: '{opencode_window.title}'")
        print(f"  Position: ({opencode_window.left}, {opencode_window.top})")
        print(f"  Size: {opencode_window.width}x{opencode_window.height}")
    else:
        print("WARNING: Could not find OpenCode window by title 'OpenCode'.")
        print("Make sure OpenCode is open and visible.")
        print()

    input("Press ENTER to start calibration...")

    # Capture chat name
    print("\n--- Step 0: Chat Name ---")
    chat_name = input("Enter the name of the chat to use in OpenCode: ").strip()
    if not chat_name:
        print("Chat name cannot be empty.")
        sys.exit(1)

    # Capture positions
    print("\n--- Step 1: Chat Sidebar ---")
    print("In OpenCode's sidebar, find the chat you want to use.")
    pos1 = wait_for_click("Click on the chat name in the sidebar, then press ENTER:")

    print("\n--- Step 2: Input Area ---")
    print("In OpenCode, find the text input area where you type prompts.")
    pos2 = wait_for_click("Click in the center of the input area, then press ENTER:")

    print("\n--- Step 3: Copy Button ---")
    print("After OpenCode replies, there is a copy button near the response.")
    print("(If you can't see it now, estimate its position.)")
    pos3 = wait_for_click("Click where the copy button appears, then press ENTER:")

    # Build config
    config = {
        "chatName": chat_name,
        "windowTitle": "OpenCode",
        "positions": {
            "chatSidebar": pos1,
            "inputArea": pos2,
            "copyButton": pos3,
        },
        "calibrated": True,
        "calibratedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    }

    # Save config
    os.makedirs(BRIDGE_DIR, exist_ok=True)
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)

    print("\n" + "=" * 60)
    print("  Calibration Complete!")
    print("=" * 60)
    print(f"\nConfig saved to: {CONFIG_PATH}")
    print(f"Chat name: {chat_name}")
    print(f"Chat sidebar position: ({pos1['x']}, {pos1['y']})")
    print(f"Input area position: ({pos2['x']}, {pos2['y']})")
    print(f"Copy button position: ({pos3['x']}, {pos3['y']})")
    print()
    print("You can now run the automation with:")
    print(f"  python scripts/run.py --chat-name \"{chat_name}\"")


if __name__ == "__main__":
    main()
