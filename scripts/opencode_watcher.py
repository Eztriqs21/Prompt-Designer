#!/usr/bin/env python3
"""
VibeLoop OpenCode Watcher

This script watches for OpenCode completion signals and notifies the backend.
It combines:
1. Sound detection (completion sound)
2. Screen verification (check for 'session compacted')
3. Agent output parsing (check for 'DONE')

Usage:
    python scripts/opencode_watcher.py <workspace_key> [backend_url]
"""

import sys
import time
import json
import subprocess
import requests
from typing import Optional, Dict, Any

from audio_detector import AudioDetector
from screen_checker import ScreenChecker
from run_state_client import RunStateClient


class OpenCodeWatcher:
    def __init__(self, workspace_key: str, backend_url: str):
        self.workspace_key = workspace_key
        self.client = RunStateClient(workspace_key, backend_url)
        self.audio_detector = AudioDetector()
        self.screen_checker = ScreenChecker()
        self.last_check_time = time.time()
        
    def check_completion_signals(self) -> Dict[str, Any]:
        """Check all completion signals and return combined result."""
        signals = {
            'done_detected': False,
            'sound_detected': False,
            'compaction_detected': False,
            'timestamp': time.time(),
        }
        
        # Check for DONE in recent output
        # This would integrate with OpenCode's output capture
        # For now, we'll check the screen
        screen_text = self.screen_checker.capture_screen_text()
        if screen_text:
            signals['done_detected'] = 'DONE' in screen_text
            signals['compaction_detected'] = 'session compacted' in screen_text.lower()
        
        # Check for completion sound
        signals['sound_detected'] = self.audio_detector.detect_completion_sound()
        
        return signals
    
    def determine_completion(self, signals: Dict[str, Any]) -> str:
        """
        Determine completion status based on signals.
        
        Returns:
            'complete' - Agent is done and ready for audit
            'compacted' - Context exhaustion, not completion
            'none' - No completion signal detected
        """
        # Main path: DONE + no compaction + backend-ready
        if signals['done_detected'] and not signals['compaction_detected']:
            return 'complete'
        
        # Compaction detected - context exhaustion
        if signals['compaction_detected']:
            return 'compacted'
        
        # Sound alone is not enough
        if signals['sound_detected'] and signals['done_detected']:
            return 'complete'
        
        return 'none'
    
    def notify_backend(self, status: str, signals: Dict[str, Any]):
        """Notify the backend of the completion status."""
        try:
            if status == 'complete':
                self.client.submit_result(
                    message="Agent completed task",
                    done=True,
                    compacted=False
                )
            elif status == 'compacted':
                self.client.submit_result(
                    message="Context was compacted",
                    done=False,
                    compacted=True
                )
        except Exception as e:
            print(f"Error notifying backend: {e}", file=sys.stderr)
    
    def run(self, poll_interval: float = 5.0):
        """Main watch loop."""
        print(f"Starting OpenCode watcher for workspace: {self.workspace_key[:12]}...")
        print(f"Poll interval: {poll_interval}s")
        print("Press Ctrl+C to stop")
        
        while True:
            try:
                # Check if run is still active
                status = self.client.get_status()
                if not status.get('active'):
                    print("Run is no longer active. Stopping watcher.")
                    break
                
                # Check completion signals
                signals = self.check_completion_signals()
                completion_status = self.determine_completion(signals)
                
                if completion_status != 'none':
                    print(f"Completion signal detected: {completion_status}")
                    self.notify_backend(completion_status, signals)
                
                time.sleep(poll_interval)
                
            except KeyboardInterrupt:
                print("\nStopping watcher...")
                break
            except Exception as e:
                print(f"Error in watch loop: {e}", file=sys.stderr)
                time.sleep(poll_interval)


def main():
    if len(sys.argv) < 2:
        print("Usage: python opencode_watcher.py <workspace_key> [backend_url]")
        sys.exit(1)
    
    workspace_key = sys.argv[1]
    backend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3001"
    
    watcher = OpenCodeWatcher(workspace_key, backend_url)
    watcher.run()


if __name__ == "__main__":
    main()
