#!/usr/bin/env python3
"""
Audio Detector for VibeLoop

Detects OpenCode's completion sound using the system's audio output.
This requires the `pyaudio` library for audio capture.
"""

import sys
import time
import numpy as np
from typing import Optional

try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    print("Warning: pyaudio not installed. Audio detection disabled.", file=sys.stderr)
    print("Install with: pip install pyaudio", file=sys.stderr)


class AudioDetector:
    def __init__(self, sample_rate: int = 44100, chunk_size: int = 1024):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.audio: Optional[pyaudio.PyAudio] = None
        self.stream: Optional[pyaudio.Stream] = None
        
        if PYAUDIO_AVAILABLE:
            self.audio = pyaudio.PyAudio()
    
    def detect_completion_sound(self, duration: float = 1.0) -> bool:
        """
        Detect OpenCode's completion sound.
        
        The completion sound is a specific frequency pattern that
        OpenCode plays when a task is complete.
        
        Returns True if the completion sound is detected.
        """
        if not PYAUDIO_AVAILABLE or not self.audio:
            return False
        
        try:
            # Open audio stream
            stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            
            # Read audio data
            frames = []
            for _ in range(0, int(self.sample_rate / self.chunk_size * duration)):
                data = stream.read(self.chunk_size, exception_on_overflow=False)
                frames.append(np.frombuffer(data, dtype=np.float32))
            
            stream.stop_stream()
            stream.close()
            
            # Analyze audio
            audio_data = np.concatenate(frames)
            return self._analyze_for_completion_sound(audio_data)
            
        except Exception as e:
            print(f"Audio detection error: {e}", file=sys.stderr)
            return False
    
    def _analyze_for_completion_sound(self, audio_data: np.ndarray) -> bool:
        """
        Analyze audio data for OpenCode's completion sound pattern.
        
        The completion sound typically has:
        - A specific frequency range (800-1200 Hz)
        - A rising then falling pattern
        - Duration of about 0.5-1 second
        """
        # Simple frequency analysis using FFT
        if len(audio_data) == 0:
            return False
        
        # Apply FFT
        fft = np.fft.fft(audio_data)
        freqs = np.fft.fftfreq(len(fft), 1.0 / self.sample_rate)
        
        # Look for energy in the completion sound frequency range
        mask = (freqs >= 800) & (freqs <= 1200)
        energy_in_range = np.abs(fft[mask]).mean()
        
        # Threshold for detection (would need calibration)
        threshold = 0.1
        
        return energy_in_range > threshold
    
    def __del__(self):
        if self.audio:
            self.audio.terminate()
