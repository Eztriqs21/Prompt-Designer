#!/usr/bin/env python3
"""
Completion Detector

Detects when OpenCode has finished a task using:
1. System audio loopback via soundcard (captures speaker output directly)
2. Continuous background monitoring (no dead zones)
3. Screen OCR fallback (check for "DONE" marker) — optional, requires Tesseract
"""

import sys
import time
import os
import threading
from collections import deque
from typing import Optional, Dict, Any

try:
    import pyautogui
    import numpy as np
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install pyautogui numpy")
    sys.exit(1)

try:
    import soundcard as sc
    SOUNDCARD_AVAILABLE = True
except ImportError:
    SOUNDCARD_AVAILABLE = False
    print("Warning: soundcard not installed. Sound detection disabled.", file=sys.stderr)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


class AudioMonitor:
    """Continuously monitors system audio via loopback in a background thread."""

    def __init__(self, history_seconds: int = 10):
        self.history_seconds = history_seconds
        self._running = False
        self._thread = None
        self._recorder = None
        self._rms_history = deque(maxlen=history_seconds * 30)
        self._lock = threading.Lock()
        self._last_spike_time = 0
        self._spike_cooldown = 2.0
        self.rms_threshold = 0.005

    def start(self) -> bool:
        """Start background audio monitoring via loopback."""
        if not SOUNDCARD_AVAILABLE:
            print("[detector] soundcard not installed")
            return False

        # Find loopback microphone
        mics = sc.all_microphones(include_loopback=True)
        loopback_mic = None
        for mic in mics:
            if mic.isloopback:
                loopback_mic = mic
                break

        if not loopback_mic:
            print("[detector] No loopback microphone found")
            return False

        print(f"[detector] Loopback device: {loopback_mic.name}")

        try:
            self._recorder = loopback_mic.recorder(samplerate=48000, channels=[0])
            self._recorder.__enter__()
        except Exception as e:
            print(f"[detector] Failed to open loopback recorder: {e}")
            return False

        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        print("[detector] Audio monitor started (loopback)")
        return True

    def _monitor_loop(self):
        """Background loop: read audio, compute RMS, store in history."""
        while self._running:
            try:
                data = self._recorder.record(numframes=4096)
                if data is not None and len(data) > 0:
                    mono = data.flatten().astype(np.float32)
                    rms = float(np.sqrt(np.mean(mono ** 2)))
                    with self._lock:
                        self._rms_history.append((time.time(), rms))
            except Exception:
                pass

    def stop(self):
        """Stop background monitoring."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self._recorder:
            try:
                self._recorder.__exit__(None, None, None)
            except Exception:
                pass
            self._recorder = None

    def get_recent_rms(self, seconds: float = 3.0) -> list:
        cutoff = time.time() - seconds
        with self._lock:
            return [rms for ts, rms in self._rms_history if ts >= cutoff]

    def detect_spike(self, window_seconds: float = 3.0) -> Dict[str, Any]:
        """Check if there was a recent audio spike (sound played)."""
        recent = self.get_recent_rms(window_seconds)
        if not recent:
            return {'spike_detected': False, 'peak_rms': 0, 'avg_rms': 0, 'threshold': self.rms_threshold}

        peak = max(recent)
        avg = float(np.mean(recent))
        spike = peak > self.rms_threshold

        now = time.time()
        if spike and (now - self._last_spike_time) > self._spike_cooldown:
            self._last_spike_time = now
            return {'spike_detected': True, 'peak_rms': peak, 'avg_rms': avg, 'threshold': self.rms_threshold}

        return {'spike_detected': False, 'peak_rms': peak, 'avg_rms': avg, 'threshold': self.rms_threshold}

    def auto_calibrate(self, duration: float = 3.0) -> float:
        """Measure ambient noise level and set threshold above it."""
        time.sleep(duration)
        recent = self.get_recent_rms(duration)
        if not recent:
            return self.rms_threshold

        ambient = float(np.mean(recent))
        peak = float(max(recent))
        self.rms_threshold = max(ambient * 3, 0.003)

        print(f"[detector] Calibrated: ambient={ambient:.6f}, peak={peak:.6f}, threshold={self.rms_threshold:.6f}")
        return self.rms_threshold


class CompletionDetector:
    def __init__(self):
        self.done_marker = "DONE"
        self.monitor = AudioMonitor()
        self._audio_started = False

    def _ensure_audio(self):
        if not self._audio_started:
            self._audio_started = self.monitor.start()
            if self._audio_started:
                self.monitor.auto_calibrate()

    def detect_sound(self) -> bool:
        self._ensure_audio()
        if not self._audio_started:
            return False
        result = self.monitor.detect_spike(window_seconds=3.0)
        if result['spike_detected']:
            print(f"[detector] Sound spike! peak={result['peak_rms']:.6f} threshold={result['threshold']:.6f}")
        return result['spike_detected']

    def capture_screen_text(self) -> Optional[str]:
        if not TESSERACT_AVAILABLE:
            return None
        try:
            screenshot = pyautogui.screenshot()
            return pytesseract.image_to_string(screenshot)
        except Exception:
            return None

    def check_completion(self) -> Dict[str, Any]:
        """Check all completion signals and return combined result."""
        result = {
            'sound_detected': False,
            'done_detected': False,
            'compaction_detected': False,
            'is_complete': False,
            'reason': '',
        }

        result['sound_detected'] = self.detect_sound()
        if not result['sound_detected']:
            result['reason'] = 'No sound detected'
            return result

        # Sound detected — check OCR if available
        if TESSERACT_AVAILABLE:
            text = self.capture_screen_text()
            if text:
                result['done_detected'] = 'DONE' in text
                result['compaction_detected'] = 'session compacted' in text.lower()
                if result['compaction_detected']:
                    result['reason'] = 'Context exhausted (session compacted)'
                elif result['done_detected']:
                    result['is_complete'] = True
                    result['reason'] = 'Sound + DONE marker'
                else:
                    result['is_complete'] = True
                    result['reason'] = 'Sound detected'
            else:
                result['is_complete'] = True
                result['reason'] = 'Sound detected (no OCR)'
        else:
            result['is_complete'] = True
            result['reason'] = 'Sound detected'

        return result

    def wait_for_completion(self, timeout_seconds: int = 600, check_interval: float = 3.0) -> Dict[str, Any]:
        """Wait for OpenCode to complete by monitoring system audio."""
        self._ensure_audio()
        print(f"[detector] Waiting for completion (timeout: {timeout_seconds}s)...")
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            result = self.check_completion()
            if result['sound_detected']:
                print(f"[detector] Sound detected! {result['reason']}")
                if result['is_complete']:
                    print(f"[detector] COMPLETED: {result['reason']}")
                    return result
            else:
                elapsed = int(time.time() - start_time)
                if elapsed % 30 == 0 and elapsed > 0:
                    print(f"[detector] Still waiting... ({elapsed}s elapsed)")
            time.sleep(check_interval)

        return {
            'sound_detected': False, 'done_detected': False, 'compaction_detected': False,
            'is_complete': False, 'reason': f'Timeout after {timeout_seconds} seconds',
        }

    def cleanup(self):
        self.monitor.stop()


def main():
    detector = CompletionDetector()
    print("Testing completion detector...")
    detector._ensure_audio()
    print("Listening for 10 seconds...")
    time.sleep(10)
    result = detector.monitor.detect_spike(window_seconds=10.0)
    print(f"Result: {result}")
    detector.cleanup()


if __name__ == "__main__":
    main()
