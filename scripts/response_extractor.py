#!/usr/bin/env python3
"""
Response Extractor

Extracts OpenCode's response text from the screen after completion.
Uses OCR to read the response area and parse it into structured data.
"""

import sys
import os
import re
from typing import Optional, Dict, Any, List

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
        """Click the copy button and read from clipboard."""
        if not PYPERCLIP_AVAILABLE:
            return None

        pos = self.config.get('positions', {}).get('copyButton')
        if not pos:
            return None

        try:
            # Click the copy button
            pyautogui.click(pos['x'], pos['y'])
            import time
            time.sleep(0.5)

            # Read from clipboard
            text = pyperclip.paste()
            return text if text else None
        except Exception as e:
            print(f"Copy button extraction failed: {e}", file=sys.stderr)
            return None

    def extract_via_ocr(self) -> Optional[str]:
        """Capture the response area and extract text via OCR."""
        if not TESSERACT_AVAILABLE:
            return None

        try:
            screenshot = pyautogui.screenshot()

            # The response area is typically in the center-right of the screen
            # Capture right 60% of screen, top 70%
            width = screenshot.width
            height = screenshot.height

            left = int(width * 0.3)  # Start after sidebar
            top = int(height * 0.05)  # Start below header
            right = int(width * 0.95)  # Leave margin on right
            bottom = int(height * 0.85)  # Leave margin on bottom

            response_region = screenshot.crop((left, top, right, bottom))
            text = pytesseract.image_to_string(response_region)
            return text if text.strip() else None
        except Exception as e:
            print(f"OCR extraction failed: {e}", file=sys.stderr)
            return None

    def extract_response(self) -> Optional[str]:
        """Try to extract response using multiple methods."""
        # Method 1: Copy button (most reliable)
        response = self.extract_via_copy_button()
        if response:
            print("[extractor] Response extracted via copy button")
            return response

        # Method 2: OCR (fallback)
        response = self.extract_via_ocr()
        if response:
            print("[extractor] Response extracted via OCR")
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

        # Check for DONE marker
        result['done'] = 'DONE' in raw_text

        # Extract files touched (look for file paths)
        # Common patterns: "Modified: path/to/file", "Created: path/to/file"
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

        # Remove duplicates
        result['filesTouched'] = list(set(result['filesTouched']))
        result['errorsFound'] = list(set(result['errorsFound']))

        return result


def main():
    """Test the extractor."""
    extractor = ResponseExtractor()

    print("Testing response extractor...")
    print("Attempting to extract response...")

    response = extractor.extract_response()
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
        print(f"  Errors found: {len(parsed['errorsFound'])}")
    else:
        print("No response extracted")


if __name__ == "__main__":
    main()
