#!/usr/bin/env python3
"""
Run State Client for VibeLoop

Communicates with the VibeLoop backend to:
- Fetch task status
- Submit results
- Check run state
"""

import sys
import json
import requests
from typing import Optional, Dict, Any


class RunStateClient:
    def __init__(self, workspace_key: str, backend_url: str = "http://localhost:3001"):
        self.workspace_key = workspace_key
        self.backend_url = backend_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {workspace_key}',
            'Content-Type': 'application/json',
        }
    
    def _api_url(self, path: str) -> str:
        return f"{self.backend_url}/api{path}"
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current run status."""
        try:
            response = requests.get(
                self._api_url('/agent/status'),
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching status: {e}", file=sys.stderr)
            return {'active': False}
    
    def get_next_task(self) -> Optional[Dict[str, Any]]:
        """Fetch the next task from the backend."""
        try:
            response = requests.get(
                self._api_url('/agent/next-task'),
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 204:
                return None
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching task: {e}", file=sys.stderr)
            return None
    
    def submit_result(
        self,
        message: str,
        done: bool = False,
        compacted: bool = False,
        diff_summary: Optional[str] = None,
        files_touched: Optional[list] = None,
        commands_run: Optional[list] = None,
        test_results: Optional[str] = None,
        errors_found: Optional[list] = None,
        suggested_fixes: Optional[list] = None,
    ) -> Optional[Dict[str, Any]]:
        """Submit the agent result to the backend."""
        payload = {
            'message': message,
            'done': done,
            'compacted': compacted,
        }
        
        if diff_summary:
            payload['diffSummary'] = diff_summary
        if files_touched:
            payload['filesTouched'] = files_touched
        if commands_run:
            payload['commandsRun'] = commands_run
        if test_results:
            payload['testResults'] = test_results
        if errors_found:
            payload['errorsFound'] = errors_found
        if suggested_fixes:
            payload['suggestedFixes'] = suggested_fixes
        
        try:
            response = requests.post(
                self._api_url('/agent/result'),
                headers=self.headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error submitting result: {e}", file=sys.stderr)
            return None


def main():
    """Test the client."""
    if len(sys.argv) < 2:
        print("Usage: python run_state_client.py <workspace_key> [backend_url]")
        sys.exit(1)
    
    workspace_key = sys.argv[1]
    backend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3001"
    
    client = RunStateClient(workspace_key, backend_url)
    
    print("Checking status...")
    status = client.get_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    print("\nFetching next task...")
    task = client.get_next_task()
    if task:
        print(f"Task: {json.dumps(task, indent=2)}")
    else:
        print("No task available")


if __name__ == "__main__":
    main()
