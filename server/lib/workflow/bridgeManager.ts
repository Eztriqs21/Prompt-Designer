import { v4 as uuidv4 } from 'uuid';
import type { Run, Workspace } from '../../src/types/vibeloop.js';

const fs = await import('fs');
const path = await import('path');

const BRIDGE_DIR = path.join(process.cwd(), 'bridge');
const PROMPT_PATH = path.join(BRIDGE_DIR, 'prompt.json');
const RESPONSE_PATH = path.join(BRIDGE_DIR, 'response.json');
const CONFIG_PATH = path.join(BRIDGE_DIR, 'config.json');

function ensureBridgeExists() {
  if (!fs.existsSync(BRIDGE_DIR)) {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
  }
}

export interface BridgePrompt {
  id: string;
  mode: 'plan' | 'build';
  prompt: string;
  chatName: string;
  workspaceId: string;
  status: 'idle' | 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string | null;
  completedAt: string | null;
}

export interface BridgeResponse {
  promptId: string | null;
  response: string | null;
  done: boolean;
  compacted: boolean;
  filesTouched: string[];
  errorsFound: string[];
  completedAt: string | null;
}

export interface BridgeConfig {
  chatName: string;
  windowTitle: string;
  positions: {
    chatSidebar: { x: number; y: number };
    inputArea: { x: number; y: number };
    copyButton: { x: number; y: number };
  };
  calibrated: boolean;
  calibratedAt: string | null;
}

export function writePromptFile(
  mode: 'plan' | 'build',
  prompt: string,
  chatName: string,
  workspaceId: string = ''
): BridgePrompt {
  ensureBridgeExists();

  const bridgePrompt: BridgePrompt = {
    id: uuidv4(),
    mode,
    prompt,
    chatName,
    workspaceId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  fs.writeFileSync(PROMPT_PATH, JSON.stringify(bridgePrompt, null, 2), 'utf-8');
  return bridgePrompt;
}

export function readPromptFile(): BridgePrompt | null {
  ensureBridgeExists();

  if (!fs.existsSync(PROMPT_PATH)) {
    return null;
  }

  const data = fs.readFileSync(PROMPT_PATH, 'utf-8');
  return JSON.parse(data);
}

export function updatePromptStatus(
  id: string,
  status: BridgePrompt['status']
): void {
  const prompt = readPromptFile();
  if (!prompt || prompt.id !== id) return;

  prompt.status = status;
  if (status === 'completed' || status === 'failed') {
    prompt.completedAt = new Date().toISOString();
  }

  fs.writeFileSync(PROMPT_PATH, JSON.stringify(prompt, null, 2), 'utf-8');
}

export function writeResponseFile(response: BridgeResponse): void {
  ensureBridgeExists();
  fs.writeFileSync(RESPONSE_PATH, JSON.stringify(response, null, 2), 'utf-8');
}

export function readResponseFile(): BridgeResponse | null {
  ensureBridgeExists();

  if (!fs.existsSync(RESPONSE_PATH)) {
    return null;
  }

  const data = fs.readFileSync(RESPONSE_PATH, 'utf-8');
  return JSON.parse(data);
}

export function clearResponseFile(): void {
  ensureBridgeExists();

  const empty: BridgeResponse = {
    promptId: null,
    response: null,
    done: false,
    compacted: false,
    filesTouched: [],
    errorsFound: [],
    completedAt: null,
  };

  fs.writeFileSync(RESPONSE_PATH, JSON.stringify(empty, null, 2), 'utf-8');
}

export function readConfigFile(): BridgeConfig | null {
  ensureBridgeExists();

  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }

  const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(data);
}

export function writeConfigFile(config: BridgeConfig): void {
  ensureBridgeExists();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function isPromptReady(): boolean {
  const prompt = readPromptFile();
  return prompt !== null && prompt.status === 'pending' && prompt.prompt !== null;
}

export function isResponseReady(promptId: string): boolean {
  const response = readResponseFile();
  return response !== null && response.promptId === promptId && response.response !== null;
}

export function waitForResponse(
  promptId: string,
  timeoutMs: number = 600000
): Promise<BridgeResponse | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = 2000;

    const check = () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve(null);
        return;
      }

      const response = readResponseFile();
      if (response && response.promptId === promptId && response.response !== null) {
        resolve(response);
        return;
      }

      setTimeout(check, checkInterval);
    };

    check();
  });
}
