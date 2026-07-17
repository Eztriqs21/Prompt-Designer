#!/usr/bin/env python3
"""
Screen Checker for VibeLoop

Captures and analyzes the OpenCode window to detect:
- 'session compacted' text (context exhaustion)
- 'DONE' text (completion signal)
- Other relevant states
"""

import sys
import time
import re
from typing import Optional, Dict, Any

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    print("Warning: pyautogui not installed. Screen checking disabled.", file=sys.stderr)
    print("Install with: pip install pyautogui", file=sys.stderr)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not installed. OCR disabled.", file=sys.stderr)
    print("Install with: pip install pytesseract", file=sys.stderr)


class ScreenChecker:
    def __init__(self):
        self.screen_available = PYAUTOGUI_AVAILABLE
        self.ocr_available = TESSERACT_AVAILABLE
    
    def capture_screen_text(self) -> Optional[str]:
        """
        Capture the screen and extract text using OCR.
        
        Returns the extracted text, or None if capture fails.
        """
        if not self.screen_available or not self.ocr_available:
            return None
        
        try:
            # Take screenshot
            screenshot = pyautogui.screenshot()
            
            # Convert to text using OCR
            text = pytesseract.image_to_string(screenshot)
            return text
            
        except Exception as e:
            print(f"Screen capture error: {e}", file=sys.stderr)
            return None
    
    def check_for_compaction(self, text: str) -> bool:
        """Check if 'session compacted' is present in the text."""
        if not text:
            return False
        return 'session compacted' in text.lower()
    
    def check_for_done(self, text: str) -> bool:
        """Check if 'DONE' is present in the text."""
        if not text:
            return False
        # Look for DONE as a standalone word
        return bool(re.search(r'\bDONE\b', text))
    
    def analyze_screen(self) -> Dict[str, Any]:
        """
        Analyze the current screen state.
        
        Returns a dictionary with detection results.
        """
        text = self.capture_screen_text()
        
        if not text:
            return {
                'text_captured': False,
                'compaction_detected': False,
                'done_detected': False,
            }
        
        return {
            'text_captured': True,
            'compaction_detected': self.check_for_compaction(text),
            'done_detected': self.check_for_done(text),
            'text_length': len(text),
        }


def main():
    """Test the screen checker."""
    checker = ScreenChecker()
    
    print("Analyzing screen...")
    result = checker.analyze_screen()
    
    print(f"Text captured: {result['text_captured']}")
    if result['text_captured']:
        print(f"Compaction detected: {result['compaction_detected']}")
        print(f"Done detected: {result['done_detected']}")
        print(f"Text length: {result['text_length']}")


if __name__ == "__main__":
    main()
