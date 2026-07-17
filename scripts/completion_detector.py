#!/usr/bin/env python3
"""
Completion Detector

Detects when OpenCode has finished a task using:
1. Sound detection (OpenCode plays a sound when done)
2. Screen OCR (check for "DONE" marker)
3. Compaction check (check for "session compacted" text)

Logic:
- When sound is detected → capture screen → check for "session compacted"
- If "session compacted" is NOT present → task is complete
- If "session compacted" IS present → context exhaustion, not completion
"""

import sys
import time
import os
from typing import Optional, Dict, Any

try:
    import pyautogui
    import numpy as np
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install pyautogui numpy")
    sys.exit(1)

try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    print("Warning: pyaudio not installed. Sound detection disabled.", file=sys.stderr)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not installed. OCR disabled.", file=sys.stderr)


class CompletionDetector:
    def __init__(self, sample_rate: int = 44100, chunk_size: int = 1024):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.audio = None
        self.done_marker = "DONE"

        if PYAUDIO_AVAILABLE:
            self.audio = pyaudio.PyAudio()

    def detect_sound(self, duration: float = 2.0) -> bool:
        """
        Detect if OpenCode played its completion sound.
        Listens for audio output for the specified duration.
        """
        if not PYAUDIO_AVAILABLE or not self.audio:
            return False

        try:
            stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )

            frames = []
            for _ in range(0, int(self.sample_rate / self.chunk_size * duration)):
                data = stream.read(self.chunk_size, exception_on_overflow=False)
                frames.append(np.frombuffer(data, dtype=np.float32))

            stream.stop_stream()
            stream.close()

            audio_data = np.concatenate(frames)

            # Check if there's significant audio (sound detected)
            # RMS amplitude threshold
            rms = np.sqrt(np.mean(audio_data ** 2))
            return rms > 0.01  # Threshold for "sound detected"

        except Exception as e:
            print(f"Sound detection error: {e}", file=sys.stderr)
            return False

    def capture_screen_text(self) -> Optional[str]:
        """Capture the screen and extract text using OCR."""
        if not TESSERACT_AVAILABLE:
            return None

        try:
            screenshot = pyautogui.screenshot()
            text = pytesseract.image_to_string(screenshot)
            return text
        except Exception as e:
            print(f"Screen capture error: {e}", file=sys.stderr)
            return None

    def check_for_done(self, text: str) -> bool:
        """Check if DONE marker is present in the text."""
        if not text:
            return False
        return self.done_marker in text

    def check_for_compaction(self, text: str) -> bool:
        """Check if 'session compacted' is present in the text."""
        if not text:
            return False
        return 'session compacted' in text.lower()

    def check_completion(self) -> Dict[str, Any]:
        """
        Check all completion signals and return combined result.

        Returns:
            {
                'sound_detected': bool,
                'done_detected': bool,
                'compaction_detected': bool,
                'is_complete': bool,
                'reason': str
            }
        """
        result = {
            'sound_detected': False,
            'done_detected': False,
            'compaction_detected': False,
            'is_complete': False,
            'reason': '',
        }

        # Check for sound
        result['sound_detected'] = self.detect_sound()

        if not result['sound_detected']:
            result['reason'] = 'No sound detected'
            return result

        # Sound detected - check screen
        print("[detector] Sound detected, checking screen...")
        text = self.capture_screen_text()

        if not text:
            result['reason'] = 'Could not capture screen text'
            return result

        result['done_detected'] = self.check_for_done(text)
        result['compaction_detected'] = self.check_for_compaction(text)

        # Decision logic
        if result['compaction_detected']:
            result['is_complete'] = False
            result['reason'] = 'Context exhausted (session compacted) - not done yet'
        elif result['done_detected']:
            result['is_complete'] = True
            result['reason'] = 'DONE detected + no compaction = complete'
        else:
            result['is_complete'] = False
            result['reason'] = 'Sound detected but no DONE marker found'

        return result

    def wait_for_completion(
        self,
        timeout_seconds: int = 600,
        check_interval: float = 5.0
    ) -> Dict[str, Any]:
        """
        Wait for OpenCode to complete.

        Args:
            timeout_seconds: Max time to wait (default 10 minutes)
            check_interval: How often to check (default 5 seconds)

        Returns:
            Same as check_completion() result
        """
        print(f"[detector] Waiting for completion (timeout: {timeout_seconds}s)...")
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            result = self.check_completion()

            if result['sound_detected']:
                print(f"[detector] Sound detected! Checking completion...")
                if result['is_complete']:
                    print(f"[detector] COMPLETED: {result['reason']}")
                    return result
                else:
                    print(f"[detector] Not done yet: {result['reason']}")
                    # Wait more - might be compaction sound, not done sound
                    time.sleep(check_interval)
            else:
                # No sound yet, wait and check again
                elapsed = int(time.time() - start_time)
                if elapsed % 30 == 0:  # Print status every 30 seconds
                    print(f"[detector] Still waiting... ({elapsed}s elapsed)")
                time.sleep(check_interval)

        # Timeout
        return {
            'sound_detected': False,
            'done_detected': False,
            'compaction_detected': False,
            'is_complete': False,
            'reason': f'Timeout after {timeout_seconds} seconds',
        }

    def __del__(self):
        if self.audio:
            self.audio.terminate()


def main():
    """Test the detector."""
    detector = CompletionDetector()

    print("Testing completion detector...")
    print("Listening for sound (5 seconds)...")

    result = detector.detect_sound(duration=5.0)
    print(f"Sound detected: {result}")

    if result:
        print("Capturing screen text...")
        text = detector.capture_screen_text()
        if text:
            print(f"Screen text length: {len(text)}")
            print(f"Contains DONE: {detector.check_for_done(text)}")
            print(f"Contains compaction: {detector.check_for_compaction(text)}")


if __name__ == "__main__":
    main()
