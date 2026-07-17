#!/usr/bin/env python3
"""
OpenCode Controller

Handles GUI automation for OpenCode:
- Find and focus OpenCode window
- Navigate to a chat by name
- Paste prompts into the input area
- Switch modes with Ctrl + .
- Press Enter to submit
- Copy response text
"""

import sys
import time
import json
import os
from typing import Optional, Dict, Any

try:
    import pyautogui
    import pyperclip
    import pygetwindow as gw
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install pyautogui pyperclip pygetwindow")
    sys.exit(1)

BRIDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bridge')
CONFIG_PATH = os.path.join(BRIDGE_DIR, 'config.json')

# Safety: fail safe enabled (move mouse to corner to abort)
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3


class OpenCodeController:
    def __init__(self):
        self.config = self._load_config()
        self.window = None
        self._current_mode = 'plan'  # Track current mode (start in plan)

    def _load_config(self) -> Dict[str, Any]:
        """Load calibration config."""
        if not os.path.exists(CONFIG_PATH):
            raise RuntimeError(
                "Calibration config not found. Run calibration first:\n"
                "  python scripts/calibrate.py"
            )
        with open(CONFIG_PATH, 'r') as f:
            config = json.load(f)
        if not config.get('calibrated'):
            raise RuntimeError(
                "Calibration not complete. Run calibration first:\n"
                "  python scripts/calibrate.py"
            )
        return config

    def find_window(self) -> bool:
        """Find and focus the OpenCode window."""
        try:
            windows = gw.getWindowsWithTitle(self.config.get('windowTitle', 'OpenCode'))
            if not windows:
                return False
            self.window = windows[0]
            # Focus the window
            if self.window.isMinimized:
                self.window.restore()
            self.window.activate()
            time.sleep(0.5)
            return True
        except Exception as e:
            print(f"Error finding OpenCode window: {e}", file=sys.stderr)
            return False

    def focus_window(self):
        """Bring OpenCode window to focus."""
        if self.window:
            try:
                self.window.activate()
                time.sleep(0.3)
            except Exception:
                # Fallback: click on the window
                pyautogui.click(
                    self.window.left + self.window.width // 2,
                    self.window.top + self.window.height // 2
                )
                time.sleep(0.3)

    def click_chat(self, chat_name: str) -> bool:
        """Click on a chat in the sidebar by name."""
        pos = self.config['positions']['chatSidebar']

        # Click on the sidebar area
        self.focus_window()
        pyautogui.click(pos['x'], pos['y'])
        time.sleep(0.5)

        # Use OCR to find the chat name
        try:
            import pytesseract
            from PIL import Image

            # Capture the sidebar region
            screenshot = pyautogui.screenshot()
            # Get sidebar region (left 30% of screen, full height)
            sidebar_width = int(screenshot.width * 0.3)
            sidebar_region = screenshot.crop((0, 0, sidebar_width, screenshot.height))

            # OCR the sidebar
            text = pytesseract.image_to_string(sidebar_region)

            # Find the chat name in the OCR text
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if chat_name.lower() in line.lower():
                    # Calculate approximate click position
                    # Each line is roughly 20px tall
                    line_y = pos['y'] - (len(lines) // 2 - i) * 20
                    pyautogui.click(pos['x'], line_y)
                    time.sleep(0.5)
                    return True

            # If OCR didn't find it, try clicking at the saved position
            # (user calibrated this position for their specific chat)
            pyautogui.click(pos['x'], pos['y'])
            time.sleep(0.5)
            return True

        except Exception:
            # No pytesseract or Tesseract binary missing, just click the calibrated position
            pyautogui.click(pos['x'], pos['y'])
            time.sleep(0.5)
            return True

    def clear_input(self):
        """Clear the input area."""
        pos = self.config['positions']['inputArea']
        pyautogui.click(pos['x'], pos['y'])
        time.sleep(0.2)
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(0.1)
        pyautogui.press('delete')
        time.sleep(0.2)

    def paste_prompt(self, prompt: str):
        """Paste a prompt into the input area."""
        pos = self.config['positions']['inputArea']

        # Click on input area
        pyautogui.click(pos['x'], pos['y'])
        time.sleep(0.3)

        # Copy prompt to clipboard
        pyperclip.copy(prompt)
        time.sleep(0.1)

        # Paste
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)

    def switch_mode(self, mode: str):
        """Switch OpenCode to the target mode using Ctrl + ."""
        if mode == self._current_mode:
            print(f"[controller] Already in {mode} mode, no toggle needed")
            return

        # Toggle once: Ctrl+. switches between plan <-> build
        pyautogui.hotkey('ctrl', '.')
        time.sleep(0.5)
        self._current_mode = 'build' if self._current_mode == 'plan' else 'plan'
        print(f"[controller] Toggled to {self._current_mode} mode")

    def submit_prompt(self):
        """Press Enter to submit the prompt."""
        pyautogui.press('enter')
        time.sleep(0.3)

    def copy_response(self) -> Optional[str]:
        """Click the copy button to copy OpenCode's response."""
        pos = self.config['positions']['copyButton']

        # Click the copy button
        pyautogui.click(pos['x'], pos['y'])
        time.sleep(0.5)

        # Read from clipboard
        try:
            response = pyperclip.paste()
            return response if response else None
        except Exception:
            return None

    def execute_prompt(self, prompt: str, mode: str, chat_name: str) -> bool:
        """Full execution flow: find window, click chat, paste, switch mode, submit."""
        print(f"[controller] Finding OpenCode window...")
        if not self.find_window():
            print("[controller] ERROR: Could not find OpenCode window", file=sys.stderr)
            return False

        print(f"[controller] Clicking chat: {chat_name}")
        if not self.click_chat(chat_name):
            print(f"[controller] WARNING: Could not find chat '{chat_name}', proceeding anyway")

        print(f"[controller] Clearing input area...")
        self.clear_input()

        print(f"[controller] Pasting prompt ({len(prompt)} chars)...")
        self.paste_prompt(prompt)

        print(f"[controller] Switching to {mode} mode...")
        self.switch_mode(mode)

        print(f"[controller] Submitting prompt...")
        self.submit_prompt()

        print(f"[controller] Prompt submitted successfully")
        return True


def main():
    """Test the controller."""
    controller = OpenCodeController()

    if not controller.find_window():
        print("Could not find OpenCode window")
        sys.exit(1)

    print(f"Found OpenCode window: {controller.window.title}")
    print(f"Position: ({controller.window.left}, {controller.window.top})")
    print(f"Size: {controller.window.width}x{controller.window.height}")


if __name__ == "__main__":
    main()
