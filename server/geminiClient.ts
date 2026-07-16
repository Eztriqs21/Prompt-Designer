const FALLBACK_MODELS = [
  'mimo-v2.5-free',
  'deepseek-v4-flash-free',
  'nemotron-3-ultra-free',
];

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatConfig {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  responseFormat?: { type: string };
}

interface ChatResult {
  content: string;
  model: string;
}

// ─── Per-model attempt metadata ──────────────────────────────

export type AttemptStatus = 'success' | 'failed' | 'aborted' | 'timeout';

export interface AttemptMeta {
  model: string;
  status: AttemptStatus;
  durationMs?: number;
  error?: string;
}

// Result returned to callers: the winning content + full attempt breakdown.
export interface GenerationResult extends ChatResult {
  meta: {
    model?: string;
    attempts: AttemptMeta[];
  };
}

function getApiKey(): string {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) {
    throw new Error('OPENCODE_API_KEY is not set in environment variables. Add it to your .env file.');
  }
  return key;
}

function getBaseUrl(): string {
  return process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1/chat/completions';
}

// ─── Single model call ──────────────────────────────────────

async function callOpenCode(
  messages: ChatMessage[],
  model: string,
  config?: ChatConfig,
  signal?: AbortSignal,
): Promise<ChatResult> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const body = {
    model,
    messages,
    temperature: config?.temperature ?? 0.6,
    top_p: config?.topP ?? 0.9,
    max_tokens: config?.maxTokens ?? 8192,
    response_format: config?.responseFormat ?? { type: 'json_object' },
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // Use the caller-provided signal (per-model abort) when present,
    // otherwise fall back to a 45s hard cap so a single model can never hang forever.
    signal: signal ?? AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`OpenCode API error ${response.status}: ${errorText}`) as any;
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenCode API');
  }

  return { content, model: data.model || model };
}

// ─── Parallel first-success with full attempt tracking ───────

/**
 * Try every candidate model in PARALLEL and return the first to succeed.
 *
 * Design notes:
 * - Each model runs its own fetch with its own AbortController so we can cancel
 *   the losers the moment a winner is known (no wasted work / cost).
 * - A 45s timer per model marks that attempt as `timeout` if it overruns.
 * - `attempts` is ALWAYS fully populated — successful, failed, aborted, and
 *   timed-out models all get an entry — so callers and logs see the true picture.
 * - On all-fail, the AggregateError from Promise.any is converted into a single
 *   error that still carries the complete `attempts` list.
 */
export async function generateWithFallback(
  messages: ChatMessage[],
  config?: ChatConfig,
): Promise<GenerationResult> {
  const primary = process.env.OPENCODE_MODEL || FALLBACK_MODELS[0];
  const modelsToTry = [primary, ...FALLBACK_MODELS];
  // Deduplicate while preserving order, capped so we stay fast and cheap.
  const uniqueModels = [...new Set(modelsToTry)].slice(0, 3);

  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const attempts: AttemptMeta[] = [];

  interface TaskState {
    modelName: string;
    controller: AbortController;
    abortedReason: 'timeout' | 'cancelled' | null;
    timer: ReturnType<typeof setTimeout>;
  }

  const taskStates: TaskState[] = uniqueModels.map((modelName) => {
    const state: TaskState = {
      modelName,
      controller: new AbortController(),
      abortedReason: null,
      timer: 0 as unknown as ReturnType<typeof setTimeout>,
    };

    const startedAt = Date.now();

    state.timer = setTimeout(() => {
      state.abortedReason = 'timeout';
      state.controller.abort();
    }, 45000);

    const promise = callOpenCode(messages, modelName, config, state.controller.signal)
      .then((result) => {
        clearTimeout(state.timer);
        const durationMs = Date.now() - startedAt;
        attempts.push({ model: modelName, status: 'success', durationMs });
        return { modelName, result };
      })
      .catch((err: any) => {
        clearTimeout(state.timer);
        const durationMs = Date.now() - startedAt;
        let status: AttemptMeta['status'] = 'failed';
        if (state.abortedReason === 'timeout') status = 'timeout';
        else if (state.abortedReason === 'cancelled') status = 'aborted';
        // Safety net for aborts that bypassed our reason flag.
        else if (err?.name === 'TimeoutError' || err?.name === 'AbortError') status = 'timeout';

        const reason = String(err?.message || 'unknown error');
        attempts.push({ model: modelName, status, durationMs, error: reason });
        console.warn(
          `[${requestId}] model=${modelName} status=${status} durationMs=${durationMs} error=${reason}`,
        );
        return Promise.reject({ modelName, status, durationMs, error: reason });
      });

    // Attach the promise to the state for Promise.any / allSettled below.
    (state as any).promise = promise;
    return state;
  });

  const promises = taskStates.map((t) => (t as any).promise as Promise<{ modelName: string; result: ChatResult }>);

  let winner: { modelName: string; result: ChatResult } | null = null;

  try {
    winner = await Promise.any(promises);
  } catch {
    // Promise.any rejects with AggregateError only when EVERY candidate failed.
    // `attempts` is already complete because all promises rejected above.
    const err = new Error('All OpenCode models failed') as any;
    err.code = 'UPSTREAM_ERROR';
    err.attempts = attempts;
    console.error(`[${requestId}] all models failed:`, JSON.stringify(attempts));
    throw err;
  }

  // A model succeeded first: cancel the still-pending losers (fast reject).
  for (const t of taskStates) {
    if (t.modelName !== winner.modelName) {
      t.abortedReason = 'cancelled';
      t.controller.abort();
    }
  }

  // Let the aborted losers record their `aborted` status before we return.
  await Promise.allSettled(promises);

  // Re-order attempts to match the requested model order for readability.
  const orderedAttempts = uniqueModels
    .map((m) => attempts.find((a) => a.model === m))
    .filter((a): a is AttemptMeta => Boolean(a));

  const winningMeta = orderedAttempts.find((a) => a.model === winner!.modelName);
  console.log(
    `[${requestId}] winner=${winner.modelName} durationMs=${winningMeta?.durationMs} attempts=${orderedAttempts.length}`,
  );

  return {
    ...winner.result,
    meta: {
      model: winner.modelName,
      attempts: orderedAttempts,
    },
  };
}

export type { ChatMessage, ChatConfig, ChatResult };
