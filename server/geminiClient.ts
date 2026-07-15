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

async function callOpenCode(
  messages: ChatMessage[],
  model: string,
  config?: ChatConfig
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
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`OpenCode API error ${response.status}: ${errorText}`) as any;
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenCode API');
  }

  return { content, model: data.model || model };
}

/**
 * Generate chat completion with automatic fallback across free models on failure.
 * Retries the same model once on rate-limit/overload, then falls through to fallback models.
 */
export async function generateWithFallback(
  messages: ChatMessage[],
  config?: ChatConfig
): Promise<ChatResult> {
  const modelsToTry = [
    process.env.OPENCODE_MODEL || FALLBACK_MODELS[0],
    ...FALLBACK_MODELS,
  ];
  // Deduplicate while preserving order, but cap the list so we fail fast instead of hanging.
  const uniqueModels = [...new Set(modelsToTry)].slice(0, 3);

  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      const result = await callOpenCode(messages, modelName, config);
      console.log(`OpenCode: success with ${result.model}`);
      return result;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || 0;
      const msg = err?.message || '';

      // Input / auth errors are fatal — do not retry (e.g. model does not support image input).
      if (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        /image|does not support|unsupported|invalid.*content|content.*policy/i.test(msg)
      ) {
        const friendly = /image|does not support|unsupported/i.test(msg)
          ? 'The AI model does not support image inputs. Please describe your idea in text and try again.'
          : msg;
        const wrapped: any = new Error(friendly);
        wrapped.status = status || 400;
        wrapped.code = 'INVALID_REQUEST';
        console.error(`OpenCode: fatal error with ${modelName}: ${friendly}`);
        throw wrapped;
      }

      // Rate limit / overloaded — brief pause, then try the next model.
      if (status === 429 || status === 503 || /overloaded|busy|rate|too many/i.test(msg)) {
        console.warn(`OpenCode: ${modelName} busy/rate-limited, trying next model...`);
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }

      // Any other error — move to the next model instead of hanging.
      console.warn(`OpenCode: ${modelName} failed: ${msg}, trying next model...`);
    }
  }

  throw lastError || new Error('All OpenCode models failed');
}

export type { ChatMessage, ChatConfig, ChatResult };
