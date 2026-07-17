#!/usr/bin/env python3
"""
Response Extractor

Extracts OpenCode's response text from the screen after completion.

Strategy:
- Plan mode: Use copy button (fixed position, no file changes)
- Build mode: Use OCR (copy button Y position unpredictable due to file changes)
"""

import sys
import os
import re
import time
from typing import Optional, Dict, Any

try:
    import pyautogui
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install pyautogui")
    sys.exit(1)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not installed. OCR disabled.", file=sys.stderr)

try:
    import pyperclip
    PYPERCLIP_AVAILABLE = True
except ImportError:
    PYPERCLIP_AVAILABLE = False
    print("Warning: pyperclip not installed. Clipboard copy disabled.", file=sys.stderr)

BRIDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bridge')
CONFIG_PATH = os.path.join(BRIDGE_DIR, 'config.json')


class ResponseExtractor:
    def __init__(self):
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load calibration config."""
        if not os.path.exists(CONFIG_PATH):
            return {}
        import json
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)

    def extract_via_copy_button(self) -> Optional[str]:
        """Click the copy button and read from clipboard. Only works for Plan mode."""
        if not PYPERCLIP_AVAILABLE:
            return None

        pos = self.config.get('positions', {}).get('copyButton')
        if not pos:
            return None

        try:
            pyautogui.click(pos['x'], pos['y'])
            time.sleep(0.5)
            text = pyperclip.paste()
            return text if text else None
        except Exception as e:
            print(f"Copy button extraction failed: {e}", file=sys.stderr)
            return None

    def extract_via_ocr(self) -> Optional[str]:
        """Capture the response area and extract text via OCR. Works for all modes."""
        if not TESSERACT_AVAILABLE:
            return None

        try:
            screenshot = pyautogui.screenshot()
            width = screenshot.width
            height = screenshot.height

            # Response area: right 65% of screen, full height below header
            left = int(width * 0.3)
            top = int(height * 0.05)
            right = int(width * 0.95)
            bottom = int(height * 0.90)

            response_region = screenshot.crop((left, top, right, bottom))
            text = pytesseract.image_to_string(response_region)
            return text if text.strip() else None
        except Exception as e:
            print(f"OCR extraction failed: {e}", file=sys.stderr)
            return None

    def extract_response(self, mode: str = 'build') -> Optional[str]:
        """
        Extract response based on mode.

        Args:
            mode: 'plan' uses copy button to capture full response
                  'build' returns None (no copy needed, just completion detection)
        """
        if mode == 'build':
            # Build mode: no need to copy response, just detect completion
            print("[extractor] Build mode: skipping response extraction")
            return None

        # Plan mode: use copy button (fixed position, no file changes)
        response = self.extract_via_copy_button()
        if response:
            print("[extractor] Response extracted via copy button (plan mode)")
            return response

        # Fallback to OCR if copy button fails
        print("[extractor] Copy button failed, falling back to OCR")
        response = self.extract_via_ocr()
        if response:
            print("[extractor] Response extracted via OCR (fallback)")
            return response

        print("[extractor] Could not extract response", file=sys.stderr)
        return None

    def parse_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse raw response text into structured data."""
        result = {
            'message': raw_text,
            'filesTouched': [],
            'commandsRun': [],
            'errorsFound': [],
            'testResults': '',
            'done': False,
        }

        if not raw_text:
            return result

        result['done'] = 'DONE' in raw_text

        # Extract files touched
        file_patterns = [
            r'(?:Modified|Created|Updated|Changed|Added|Deleted):\s*(.+)',
            r'(?:file|File):\s*(.+)',
            r'`([^`]+\.(?:ts|tsx|js|jsx|py|css|html|json|md))`',
        ]
        for pattern in file_patterns:
            matches = re.findall(pattern, raw_text)
            result['filesTouched'].extend(matches)

        # Extract errors
        error_patterns = [
            r'(?:Error|ERROR):\s*(.+)',
            r'(?:Failed|FAILED):\s*(.+)',
            r'(?:Bug|BUG):\s*(.+)',
        ]
        for pattern in error_patterns:
            matches = re.findall(pattern, raw_text)
            result['errorsFound'].extend(matches)

        result['filesTouched'] = list(set(result['filesTouched']))
        result['errorsFound'] = list(set(result['errorsFound']))

        return result


def main():
    """Test the extractor."""
    extractor = ResponseExtractor()

    print("Testing response extractor...")
    print("Attempting to extract response (plan mode)...")

    response = extractor.extract_response(mode='plan')
    if response:
        print(f"\nExtracted response ({len(response)} chars):")
        print("-" * 40)
        print(response[:500])
        if len(response) > 500:
            print("...")
        print("-" * 40)

        parsed = extractor.parse_response(response)
        print(f"\nParsed data:")
        print(f"  Done: {parsed['done']}")
        print(f"  Files touched: {len(parsed['filesTouched'])}")
        print(f"  Errors: {len(parsed['errorsFound'])}")
    else:
        print("No response extracted")


if __name__ == "__main__":
    main()
