#!/usr/bin/env python3
"""
VibeLoop Automation Runner

Main orchestrator that ties together:
- Bridge communication (file or HTTP API)
- OpenCode controller (GUI automation)
- Completion detector (sound + OCR)
- Response extractor (copy + OCR)

Usage:
    # Local mode (localhost)
    python scripts/run.py --chat-name "My Chat"

    # Live mode (remote backend)
    python scripts/run.py --chat-name "My Chat" --backend-url https://prompt-designer-api.onrender.com
"""

import sys
import os
import json
import time
import argparse
import signal
import requests
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


class BridgeClient:
    """Handles communication with the backend (file or HTTP API)."""

    def __init__(self, backend_url: Optional[str] = None, workspace_key: Optional[str] = None):
        self.backend_url = backend_url.rstrip('/') if backend_url else None
        self.workspace_key = workspace_key
        self.use_http = self.backend_url is not None

    def _api_url(self, path: str) -> str:
        return f"{self.backend_url}/api{path}"

    def _headers(self) -> Dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        if self.workspace_key:
            headers['Authorization'] = f'Bearer {self.workspace_key}'
        return headers

    def get_prompt(self) -> Optional[Dict[str, Any]]:
        """Get the next pending prompt from the bridge."""
        if self.use_http:
            return self._get_prompt_http()
        return self._get_prompt_file()

    def _get_prompt_http(self) -> Optional[Dict[str, Any]]:
        """Get prompt via HTTP API."""
        try:
            # Get the full prompt data
            resp = requests.get(
                self._api_url('/bridge/prompt'),
                headers=self._headers(),
                timeout=10
            )
            if resp.status_code == 204:
                return None
            if resp.status_code != 200:
                return None

            prompt_data = resp.json()
            if not prompt_data or prompt_data.get('status') != 'pending':
                return None

            return prompt_data

        except Exception as e:
            print(f"[bridge] HTTP error: {e}", file=sys.stderr)
            return None

    def _get_prompt_file(self) -> Optional[Dict[str, Any]]:
        """Get prompt from local file."""
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

    def submit_response(self, response: Dict[str, Any]):
        """Submit the response back to the bridge."""
        if self.use_http:
            self._submit_response_http(response)
        else:
            self._submit_response_file(response)

    def _submit_response_http(self, response: Dict[str, Any]):
        """Submit response via HTTP API."""
        try:
            resp = requests.post(
                self._api_url('/agent/result'),
                headers=self._headers(),
                json=response,
                timeout=10
            )
            if resp.status_code == 200:
                print("[bridge] Response submitted via HTTP")
            else:
                print(f"[bridge] HTTP submit failed: {resp.status_code}", file=sys.stderr)
        except Exception as e:
            print(f"[bridge] HTTP error: {e}", file=sys.stderr)

    def _submit_response_file(self, response: Dict[str, Any]):
        """Submit response to local file."""
        os.makedirs(BRIDGE_DIR, exist_ok=True)
        with open(RESPONSE_PATH, 'w') as f:
            json.dump(response, f, indent=2)
        print("[bridge] Response written to file")

    def update_prompt_status(self, prompt_id: str, status: str):
        """Update prompt status."""
        if not self.use_http:
            self._update_prompt_status_file(prompt_id, status)

    def _update_prompt_status_file(self, prompt_id: str, status: str):
        """Update prompt status in local file."""
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
    def __init__(self, chat_name: str, backend_url: Optional[str] = None,
                 workspace_key: Optional[str] = None, poll_interval: float = 3.0,
                 max_retries: int = 3):
        self.chat_name = chat_name
        self.poll_interval = poll_interval
        self.max_retries = max_retries
        self.controller = OpenCodeController()
        self.detector = CompletionDetector()
        self.extractor = ResponseExtractor()
        self.bridge = BridgeClient(backend_url, workspace_key)
        self.current_prompt_id = None

    def process_prompt(self, prompt_data: Dict[str, Any]) -> bool:
        """Process a single prompt: execute, wait for completion, extract response."""
        prompt_id = prompt_data['id']
        mode = prompt_data.get('mode', 'build')
        prompt_text = prompt_data.get('prompt', '')
        chat_name = prompt_data.get('chatName', self.chat_name)

        # For HTTP mode, we might not have the full prompt text yet
        # The prompt text should be in the prompt_data
        if not prompt_text:
            print("[runner] WARNING: No prompt text found in prompt data")
            return False

        self.current_prompt_id = prompt_id
        print(f"\n{'='*60}")
        print(f"[runner] Processing prompt: {prompt_id}")
        print(f"[runner] Mode: {mode}")
        print(f"[runner] Chat: {chat_name}")
        print(f"[runner] Prompt length: {len(prompt_text)} chars")
        print(f"{'='*60}\n")

        # Update status to in_progress
        self.bridge.update_prompt_status(prompt_id, 'in_progress')

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
            self.bridge.update_prompt_status(prompt_id, 'failed')
            self._submit_error_response(prompt_id, "Failed to execute prompt in OpenCode")
            return False

        # Wait for completion
        print("\n[runner] Step 2: Waiting for OpenCode to complete...")
        completion_result = self.detector.wait_for_completion(
            timeout_seconds=600,
            check_interval=5.0
        )

        if not completion_result['is_complete']:
            print(f"[runner] WARNING: {completion_result['reason']}")

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

        # Submit response to bridge
        print("\n[runner] Step 4: Submitting response to bridge...")
        response = {
            'promptId': prompt_id,
            'response': parsed['message'],
            'done': parsed['done'],
            'compacted': completion_result.get('compaction_detected', False),
            'filesTouched': parsed['filesTouched'],
            'errorsFound': parsed['errorsFound'],
            'completedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        }
        self.bridge.submit_response(response)

        # Update prompt status
        self.bridge.update_prompt_status(prompt_id, 'completed')

        print(f"\n[runner] Prompt {prompt_id} completed successfully")
        print(f"[runner] Done: {parsed['done']}")
        print(f"[runner] Files touched: {len(parsed['filesTouched'])}")
        print(f"[runner] Errors: {len(parsed['errorsFound'])}")

        return True

    def _submit_error_response(self, prompt_id: str, error: str):
        """Submit an error response to the bridge."""
        response = {
            'promptId': prompt_id,
            'response': f"ERROR: {error}",
            'done': False,
            'compacted': False,
            'filesTouched': [],
            'errorsFound': [error],
            'completedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        }
        self.bridge.submit_response(response)

    def run(self):
        """Main run loop: poll for prompts, process them, repeat."""
        mode = "HTTP API" if self.bridge.use_http else "Local Files"
        print(f"\n{'='*60}")
        print(f"  VibeLoop Automation Runner")
        print(f"{'='*60}")
        print(f"Chat name: {self.chat_name}")
        print(f"Mode: {mode}")
        if self.bridge.use_http:
            print(f"Backend: {self.bridge.backend_url}")
        print(f"Poll interval: {self.poll_interval}s")
        print(f"Max retries: {self.max_retries}")
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
                prompt_data = self.bridge.get_prompt()
                if prompt_data:
                    print(f"\n[runner] New prompt detected: {prompt_data.get('id', 'unknown')}")
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
    parser.add_argument('--backend-url', help='Backend URL for live mode (e.g., https://prompt-designer-api.onrender.com)')
    parser.add_argument('--workspace-key', help='Workspace key for authentication (required for live mode)')
    parser.add_argument('--poll-interval', type=float, default=3.0, help='Poll interval in seconds (default: 3.0)')
    parser.add_argument('--max-retries', type=int, default=3, help='Max retries on failure (default: 3)')

    args = parser.parse_args()

    # Validate live mode requires workspace key
    if args.backend_url and not args.workspace_key:
        parser.error("--workspace-key is required when using --backend-url")

    runner = AutomationRunner(
        chat_name=args.chat_name,
        backend_url=args.backend_url,
        workspace_key=args.workspace_key,
        poll_interval=args.poll_interval,
        max_retries=args.max_retries,
    )
    runner.run()


if __name__ == "__main__":
    main()
