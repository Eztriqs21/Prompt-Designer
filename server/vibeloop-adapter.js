#!/usr/bin/env node
/**
 * VibeLoop ↔ OpenCode Adapter
 *
 * This script bridges VibeLoop's API and OpenCode CLI.
 * It polls VibeLoop for tasks, runs them in OpenCode, and submits results.
 *
 * Usage:
 *   node server/vibeloop-adapter.js <workspace-key> [backend-url]
 *
 * Example:
 *   node server/vibeloop-adapter.js vloop_abc123xyz https://prompt-designer-api.onrender.com
 *   node server/vibeloop-adapter.js vloop_abc123xyz http://localhost:3001
 */

const WORKSPACE_KEY = process.argv[2];
const BACKEND_URL = process.argv[3] || 'http://localhost:3001';

if (!WORKSPACE_KEY) {
  console.error('Usage: node vibeloop-adapter.js <workspace-key> [backend-url]');
  process.exit(1);
}

const POLL_INTERVAL = 5000; // 5 seconds
const { execSync } = require('child_process');

const headers = {
  'Authorization': `Bearer ${WORKSPACE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body) {
  const url = `${BACKEND_URL}/api${path}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function checkStatus() {
  try {
    const status = await api('GET', '/agent/status');
    return status;
  } catch (err) {
    console.error('[adapter] Status check failed:', err.message);
    return null;
  }
}

async function getNextTask() {
  try {
    const task = await api('GET', '/agent/next-task');
    return task;
  } catch (err) {
    console.error('[adapter] Next-task fetch failed:', err.message);
    return null;
  }
}

function runOpenCode(task) {
  console.log(`[adapter] Running OpenCode — iteration ${task.iteration}, stage: ${task.stage}`);

  // Build the prompt for OpenCode
  const prompt = task.prompt;

  // Run OpenCode via CLI and capture output
  // OpenCode CLI: opencode run "prompt" or similar
  // Adapt this to your OpenCode CLI invocation
  try {
    const result = execSync(
      `opencode run "${prompt.replace(/"/g, '\\"')}"`,
      {
        encoding: 'utf-8',
        timeout: 300000, // 5 minutes
        cwd: process.cwd(),
      }
    );
    return result;
  } catch (err) {
    console.error('[adapter] OpenCode execution failed:', err.message);
    return null;
  }
}

function parseAgentResponse(output) {
  // Parse OpenCode output into structured AgentResponse
  // This is a basic parser — adapt to your OpenCode output format
  return {
    message: output || 'No output captured',
    diffSummary: '',
    filesTouched: [],
    commandsRun: [],
    testResults: '',
    errorsFound: [],
    suggestedFixes: [],
  };
}

async function submitResult(result) {
  try {
    const response = await api('POST', '/agent/result', result);
    console.log('[adapter] Result submitted. Stage:', response.run?.stage);
    return response;
  } catch (err) {
    console.error('[adapter] Result submission failed:', err.message);
    return null;
  }
}

async function pollLoop() {
  console.log('[adapter] Starting poll loop...');
  console.log(`[adapter] Backend: ${BACKEND_URL}`);
  console.log(`[adapter] Key: ${WORKSPACE_KEY.slice(0, 12)}...`);
  console.log('');

  while (true) {
    try {
      // Check connection
      const status = await checkStatus();
      if (!status?.active) {
        console.log('[adapter] No active run. Waiting...');
        await sleep(POLL_INTERVAL * 2);
        continue;
      }

      console.log(`[adapter] Run active — stage: ${status.stage}, iteration: ${status.iteration}`);

      // Fetch next task
      const task = await getNextTask();
      if (!task) {
        console.log('[adapter] No task available. Waiting...');
        await sleep(POLL_INTERVAL);
        continue;
      }

      console.log(`[adapter] Got task: ${task.stage}`);

      // Run OpenCode
      const output = runOpenCode(task);
      if (!output) {
        console.error('[adapter] OpenCode returned no output. Skipping...');
        await sleep(POLL_INTERVAL);
        continue;
      }

      console.log(`[adapter] OpenCode completed (${output.length} chars)`);

      // Parse and submit
      const result = parseAgentResponse(output);
      await submitResult(result);

    } catch (err) {
      console.error('[adapter] Loop error:', err.message);
    }

    await sleep(POLL_INTERVAL);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[adapter] Shutting down...');
  process.exit(0);
});

// Start
console.log('╔══════════════════════════════════════╗');
console.log('║   VibeLoop ↔ OpenCode Adapter       ║');
console.log('╚══════════════════════════════════════╝');
console.log('');
pollLoop();
