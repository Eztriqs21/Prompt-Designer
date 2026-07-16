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

// ─── Structured debug logging ───────────────────────────
// Single consistent format: ISO-time | [scope] message | k=v
// so a single requestId can be traced across tiers.
export function logStep(scope: string, msg: string, fields: Record<string, unknown> = {}): void {
  const parts = Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
  console.log(`${new Date().toISOString()} | [${scope}] ${msg}${parts.length ? ' | ' + parts.join(' ') : ''}`);
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
  requestId?: string,
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

  const startedAt = Date.now();
  logStep('gen:call', 'fetch-start', { requestId, model });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // Per-model hard cap of 5 minutes (300s) so a single model can never
    // hang forever. The caller also passes its own signal (used to cancel
    // losers once a winner is known); that takes precedence when present.
    signal: signal ?? AbortSignal.timeout(300000),
  });

  // KEY diagnostic: log the moment the HTTP response actually arrives.
  // If this line is ABSENT for a model that OpenCode usage says completed,
  // the local abort killed the fetch before the response was read.
  logStep('gen:call', 'http-receipt', {
    requestId,
    model,
    httpStatus: response.status,
    receivedAtMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`OpenCode API error ${response.status}: ${errorText}`) as any;
    error.status = response.status;
    logStep('gen:call', 'http-error', { requestId, model, httpStatus: response.status });
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
 * - A per-model hard cap of 5 minutes (300s) prevents any single model from
 *   hanging forever. Free OpenCode models can take minutes to reply, so this is
 *   deliberately generous — far above the old 45s that caused false timeouts.
 * - The only other abort is the winner-cancels-losers signal: once one model
 *   returns a usable prompt, the still-pending losers are aborted and marked
 *   `aborted` in `meta.attempts`.
 * - `attempts` is ALWAYS fully populated — successful, failed, aborted, and
 *   timed-out models all get an entry — so callers and logs see the true picture.
 * - On all-fail, the AggregateError from Promise.any is converted into a single
 *   error that still carries the complete `attempts` list.
 */
export async function generateWithFallback(
  messages: ChatMessage[],
  config?: ChatConfig,
  reqId?: string,
): Promise<GenerationResult> {
  const primary = process.env.OPENCODE_MODEL || FALLBACK_MODELS[0];
  const modelsToTry = [primary, ...FALLBACK_MODELS];
  // Deduplicate while preserving order, capped so we stay fast and cheap.
  const uniqueModels = [...new Set(modelsToTry)].slice(0, 3);

  // Prefer a caller-provided id (frontend correlation) else mint one.
  const requestId = reqId || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const attempts: AttemptMeta[] = [];
  logStep('gen', 'start', {
    requestId,
    models: uniqueModels,
    strategy: 'parallel-first-success',
  });

  interface TaskState {
    modelName: string;
    controller: AbortController;
    abortedReason: 'timeout' | 'cancelled' | null;
    timer: ReturnType<typeof setTimeout>;
  }

  // Per-model hard cap: a single model has up to 5 minutes (300s) to
  // return a usable response. Far above realistic free-model latency, but
  // it guarantees a hung model can never block the request forever.
  const PER_MODEL_TIMEOUT_MS = 300000;

  const taskStates: TaskState[] = uniqueModels.map((modelName) => {
    const state: TaskState = {
      modelName,
      controller: new AbortController(),
      abortedReason: null,
      timer: 0 as unknown as ReturnType<typeof setTimeout>,
    };

    const startedAt = Date.now();

    // Fire the local cap only if the model hasn't already resolved or been
    // cancelled by a winning sibling.
    state.timer = setTimeout(() => {
      state.abortedReason = 'timeout';
      state.controller.abort();
    }, PER_MODEL_TIMEOUT_MS);

    const promise = callOpenCode(messages, modelName, config, state.controller.signal, requestId)
      .then((result) => {
        clearTimeout(state.timer);
        const durationMs = Date.now() - startedAt;
        attempts.push({ model: modelName, status: 'success', durationMs });
        logStep('gen:model', 'success', { requestId, model: modelName, durationMs });
        return { modelName, result };
      })
      .catch((err: any) => {
        clearTimeout(state.timer);
        const durationMs = Date.now() - startedAt;
        let status: AttemptMeta['status'] = 'failed';
        let reasonKind = 'provider-error';
        if (state.abortedReason === 'timeout') { status = 'timeout'; reasonKind = 'timeout-local'; }
        else if (state.abortedReason === 'cancelled') { status = 'aborted'; reasonKind = 'aborted-by-winner'; }
        // Safety net: an unexpected AbortError without our reason flag.
        else if (err?.name === 'AbortError') { status = 'aborted'; reasonKind = 'aborted-unexpected'; }

        const reason = String(err?.message || 'unknown error');
        attempts.push({ model: modelName, status, durationMs, error: reason });
        // Explicit, non-ambiguous reason so a local cap is never mistaken
        // for a real provider timeout in the logs.
        logStep('gen:model', reasonKind, {
          requestId,
          model: modelName,
          durationMs,
          httpStatus: err?.status,
          note: reasonKind === 'timeout-local'
            ? 'local 5m cap fired; provider may still be completing'
            : undefined,
          error: reason,
        });
        return Promise.reject({ modelName, status, durationMs, error: reason });
      });

    // Attach the promise to the state for Promise.any / allSettled below.
    (state as any).promise = promise;
    return state;
  });

  const promises = taskStates.map((t) => (t as any).promise as Promise<{ modelName: string; result: ChatResult }>);

  let winner: { modelName: string; result: ChatResult } | null = null;

  const genStart = Date.now();
  try {
    winner = await Promise.any(promises);
  } catch {
    // Promise.any rejects with AggregateError only when EVERY candidate failed.
    // `attempts` is already complete because all promises rejected above.
    const err = new Error('All OpenCode models failed') as any;
    err.code = 'UPSTREAM_ERROR';
    err.attempts = attempts;
    logStep('gen', 'all-failed', {
      requestId,
      totalMs: Date.now() - genStart,
      attempts,
    });
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
  logStep('gen', 'success', {
    requestId,
    winner: winner.modelName,
    totalMs: Date.now() - genStart,
    winnerMs: winningMeta?.durationMs,
    attempts: orderedAttempts,
  });

  return {
    ...winner.result,
    meta: {
      model: winner.modelName,
      attempts: orderedAttempts,
    },
  };
}

export type { ChatMessage, ChatConfig, ChatResult };
