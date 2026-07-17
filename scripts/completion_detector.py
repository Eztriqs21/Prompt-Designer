#!/usr/bin/env python3
"""
Completion Detector

Detects when OpenCode has finished a task using:
1. Audio monitoring via sounddevice (microphone picks up speaker sound)
2. Continuous background monitoring with callback (no blocking, no dead zones)
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
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except ImportError:
    SOUNDDEVICE_AVAILABLE = False
    print("Warning: sounddevice not installed. Sound detection disabled.", file=sys.stderr)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


class AudioMonitor:
    """Continuously monitors audio via sounddevice callback (non-blocking)."""

    def __init__(self, history_seconds: int = 10):
        self.history_seconds = history_seconds
        self._running = False
        self._stream = None
        self._rms_history = deque(maxlen=history_seconds * 30)
        self._lock = threading.Lock()
        self._last_spike_time = 0
        self._spike_cooldown = 2.0
        self.rms_threshold = 0.005
        self._device_id = None
        self._device_name = "none"

    def start(self) -> bool:
        """Start audio monitoring using sounddevice callback."""
        if not SOUNDDEVICE_AVAILABLE:
            print("[detector] sounddevice not installed")
            return False

        # Try Stereo Mix first, then default input
        for dev_id in self._find_devices():
            if self._try_device(dev_id):
                return True

        print("[detector] No audio input device available")
        return False

    def _find_devices(self) -> list:
        """Find candidate devices: Stereo Mix first, then default input."""
        devices = sd.query_devices()
        candidates = []

        # Stereo Mix (captures system audio output)
        for i, d in enumerate(devices):
            if "stereo mix" in d["name"].lower() and d["max_input_channels"] > 0:
                candidates.append(i)

        # Default input
        try:
            default_idx = sd.default.device[0]
            if default_idx not in candidates:
                candidates.append(default_idx)
        except Exception:
            pass

        # Any microphone as last resort
        for i, d in enumerate(devices):
            if d["max_input_channels"] > 0 and i not in candidates:
                candidates.append(i)

        return candidates

    def _try_device(self, device_id: int) -> bool:
        """Try to start monitoring on a specific device."""
        try:
            info = sd.query_devices(device_id)
        except Exception:
            return False

        channels = min(info["max_input_channels"], 2)
        rate = int(info["default_samplerate"])

        try:
            stream = sd.InputStream(
                device=device_id,
                channels=channels,
                samplerate=rate,
                blocksize=1024,
                callback=self._audio_callback,
            )
            stream.start()
        except Exception as e:
            print(f"[detector] Device {device_id} ({info['name']}) failed: {e}")
            return False

        # Verify data flows
        self._device_id = device_id
        self._device_name = info["name"]
        self._stream = stream
        self._running = True
        time.sleep(2)

        with self._lock:
            has_data = len(self._rms_history) > 0

        if has_data:
            print(f"[detector] Audio active: {info['name']} ({rate}Hz, {channels}ch)")
            return True
        else:
            print(f"[detector] {info['name']}: no data, trying next...")
            stream.stop()
            stream.close()
            self._stream = None
            self._running = False
            return False

    def _audio_callback(self, indata, frames, time_info, status):
        """Called by sounddevice on audio thread. Non-blocking."""
        rms = float(np.sqrt(np.mean(indata.astype(np.float32) ** 2)))
        with self._lock:
            self._rms_history.append((time.time(), rms))

    def stop(self):
        self._running = False
        if self._stream:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None

    def get_recent_rms(self, seconds: float = 3.0) -> list:
        cutoff = time.time() - seconds
        with self._lock:
            return [rms for ts, rms in self._rms_history if ts >= cutoff]

    def detect_spike(self, window_seconds: float = 3.0) -> Dict[str, Any]:
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
        time.sleep(duration)
        recent = self.get_recent_rms(duration)
        if not recent:
            return self.rms_threshold

        ambient = float(np.mean(recent))
        peak = float(max(recent))

        if "stereo mix" in self._device_name.lower():
            self.rms_threshold = max(ambient * 3, 0.003)
        else:
            self.rms_threshold = max(ambient * 50, 0.001)

        print(f"[detector] Calibrated ({self._device_name}): ambient={ambient:.6f}, peak={peak:.6f}, threshold={self.rms_threshold:.6f}")
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
        result = {
            'sound_detected': False, 'done_detected': False,
            'compaction_detected': False, 'is_complete': False, 'reason': '',
        }

        result['sound_detected'] = self.detect_sound()
        if not result['sound_detected']:
            result['reason'] = 'No sound detected'
            return result

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
            result['reason'] = 'Sound detected (no OCR)'

        return result

    def wait_for_completion(self, timeout_seconds: int = 600, check_interval: float = 3.0) -> Dict[str, Any]:
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
