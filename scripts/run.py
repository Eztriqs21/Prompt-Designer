#!/usr/bin/env python3
"""
VibeLoop Automation Runner

Main orchestrator that ties together:
- Bridge file reading (prompts from website)
- OpenCode controller (GUI automation)
- Completion detector (sound + OCR)
- Response extractor (copy + OCR)
- Bridge file writing (responses to website)

Usage:
    python scripts/run.py --chat-name "My Chat"
    python scripts/run.py --chat-name "My Chat" --backend-url http://localhost:3001
"""

import sys
import os
import json
import time
import argparse
import signal
from typing import Optional, Dict, Any

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(__file__))

from opencode_controller import OpenCodeController
from completion_detector import CompletionDetector
from response_extractor import ResponseExtractor

BRIDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bridge')
PROMPT_PATH = os.path.join(BRIDGE_DIR, 'prompt.json')
RESPONSE_PATH = os.path.join(BRIDGE_DIR, 'response.json')
CONFIG_PATH = os.path.join(BRIDGE_DIR, 'config.json')

# Global flag for graceful shutdown
running = True


def signal_handler(sig, frame):
    global running
    print("\n[runner] Shutting down gracefully...")
    running = False


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def read_prompt_file() -> Optional[Dict[str, Any]]:
    """Read the prompt file from the bridge."""
    if not os.path.exists(PROMPT_PATH):
        return None
    try:
        with open(PROMPT_PATH, 'r') as f:
            data = json.load(f)
        if data.get('status') != 'pending' or not data.get('prompt'):
            return None
        return data
    except Exception:
        return None


def write_response_file(response: Dict[str, Any]):
    """Write the response file to the bridge."""
    os.makedirs(BRIDGE_DIR, exist_ok=True)
    with open(RESPONSE_PATH, 'w') as f:
        json.dump(response, f, indent=2)


def update_prompt_status(prompt_id: str, status: str):
    """Update the prompt file status."""
    if not os.path.exists(PROMPT_PATH):
        return
    try:
        with open(PROMPT_PATH, 'r') as f:
            data = json.load(f)
        if data.get('id') == prompt_id:
            data['status'] = status
            if status in ('completed', 'failed'):
                data['completedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
            with open(PROMPT_PATH, 'w') as f:
                json.dump(data, f, indent=2)
    except Exception:
        pass


class AutomationRunner:
    def __init__(self, chat_name: str, poll_interval: float = 3.0, max_retries: int = 3):
        self.chat_name = chat_name
        self.poll_interval = poll_interval
        self.max_retries = max_retries
        self.controller = OpenCodeController()
        self.detector = CompletionDetector()
        self.extractor = ResponseExtractor()
        self.current_prompt_id = None

    def process_prompt(self, prompt_data: Dict[str, Any]) -> bool:
        """Process a single prompt: execute, wait for completion, extract response."""
        prompt_id = prompt_data['id']
        mode = prompt_data['mode']
        prompt_text = prompt_data['prompt']
        chat_name = prompt_data.get('chatName', self.chat_name)

        self.current_prompt_id = prompt_id
        print(f"\n{'='*60}")
        print(f"[runner] Processing prompt: {prompt_id}")
        print(f"[runner] Mode: {mode}")
        print(f"[runner] Chat: {chat_name}")
        print(f"[runner] Prompt length: {len(prompt_text)} chars")
        print(f"{'='*60}\n")

        # Update status to in_progress
        update_prompt_status(prompt_id, 'in_progress')

        # Execute the prompt in OpenCode
        print("[runner] Step 1: Executing prompt in OpenCode...")
        success = False
        for attempt in range(self.max_retries):
            try:
                success = self.controller.execute_prompt(prompt_text, mode, chat_name)
                if success:
                    break
                print(f"[runner] Attempt {attempt + 1} failed, retrying...")
                time.sleep(2)
            except Exception as e:
                print(f"[runner] Attempt {attempt + 1} error: {e}")
                time.sleep(2)

        if not success:
            print("[runner] ERROR: Could not execute prompt after max retries")
            update_prompt_status(prompt_id, 'failed')
            self._write_error_response(prompt_id, "Failed to execute prompt in OpenCode")
            return False

        # Wait for completion
        print("\n[runner] Step 2: Waiting for OpenCode to complete...")
        completion_result = self.detector.wait_for_completion(
            timeout_seconds=600,
            check_interval=5.0
        )

        if not completion_result['is_complete']:
            print(f"[runner] WARNING: {completion_result['reason']}")
            # Still try to extract whatever response is available

        # Extract response (only for plan mode)
        print(f"\n[runner] Step 3: Extracting response (mode: {mode})...")
        raw_response = self.extractor.extract_response(mode=mode)

        # Parse response (or create minimal response for build mode)
        if raw_response:
            parsed = self.extractor.parse_response(raw_response)
        else:
            # Build mode: no response needed, just completion confirmation
            parsed = {
                'message': f'Build task completed (iteration completed)',
                'filesTouched': [],
                'errorsFound': [],
                'done': completion_result.get('done_detected', False),
            }

        # Write response to bridge
        print("\n[runner] Step 4: Writing response to bridge...")
        response = {
            'promptId': prompt_id,
            'response': parsed['message'],
            'done': parsed['done'],
            'compacted': completion_result.get('compaction_detected', False),
            'filesTouched': parsed['filesTouched'],
            'errorsFound': parsed['errorsFound'],
            'completedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        }
        write_response_file(response)

        # Update prompt status
        update_prompt_status(prompt_id, 'completed')

        print(f"\n[runner] Prompt {prompt_id} completed successfully")
        print(f"[runner] Done: {parsed['done']}")
        print(f"[runner] Files touched: {len(parsed['filesTouched'])}")
        print(f"[runner] Errors: {len(parsed['errorsFound'])}")

        return True

    def _write_error_response(self, prompt_id: str, error: str):
        """Write an error response to the bridge."""
        response = {
            'promptId': prompt_id,
            'response': f"ERROR: {error}",
            'done': False,
            'compacted': False,
            'filesTouched': [],
            'errorsFound': [error],
            'completedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        }
        write_response_file(response)

    def run(self):
        """Main run loop: poll for prompts, process them, repeat."""
        print(f"\n{'='*60}")
        print(f"  VibeLoop Automation Runner")
        print(f"{'='*60}")
        print(f"Chat name: {self.chat_name}")
        print(f"Poll interval: {self.poll_interval}s")
        print(f"Max retries: {self.max_retries}")
        print(f"Bridge directory: {BRIDGE_DIR}")
        print(f"Press Ctrl+C to stop")
        print(f"{'='*60}\n")

        # Find OpenCode window
        print("[runner] Finding OpenCode window...")
        if not self.controller.find_window():
            print("[runner] ERROR: Could not find OpenCode window")
            print("[runner] Make sure OpenCode is open and visible")
            sys.exit(1)

        print(f"[runner] Found OpenCode: {self.controller.window.title}")
        print(f"[runner] Window position: ({self.controller.window.left}, {self.controller.window.top})")
        print(f"[runner] Window size: {self.controller.window.width}x{self.controller.window.height}")

        # Main loop
        print("\n[runner] Starting main loop...")
        while running:
            try:
                # Check for new prompt
                prompt_data = read_prompt_file()
                if prompt_data:
                    print(f"\n[runner] New prompt detected: {prompt_data['id']}")
                    self.process_prompt(prompt_data)
                else:
                    # No prompt, wait and check again
                    time.sleep(self.poll_interval)

            except KeyboardInterrupt:
                print("\n[runner] Interrupted by user")
                break
            except Exception as e:
                print(f"[runner] Error in main loop: {e}", file=sys.stderr)
                time.sleep(self.poll_interval)

        print("\n[runner] Automation stopped")


def main():
    parser = argparse.ArgumentParser(description='VibeLoop Automation Runner')
    parser.add_argument('--chat-name', required=True, help='Name of the OpenCode chat to use')
    parser.add_argument('--poll-interval', type=float, default=3.0, help='Poll interval in seconds (default: 3.0)')
    parser.add_argument('--max-retries', type=int, default=3, help='Max retries on failure (default: 3)')

    args = parser.parse_args()

    runner = AutomationRunner(
        chat_name=args.chat_name,
        poll_interval=args.poll_interval,
        max_retries=args.max_retries,
    )
    runner.run()


if __name__ == "__main__":
    main()
