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
  // Deduplicate while preserving order
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError: any = null;

  for (const modelName of uniqueModels) {
    // Retry same model once
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const result = await callOpenCode(messages, modelName, config);
        console.log(`OpenCode: success with ${result.model}`);
        return result;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || 0;
        const msg = err?.message || '';

        // Don't retry on auth errors or bad requests
        if (status === 400 || status === 401 || status === 403) {
          console.error(`OpenCode: fatal error with ${modelName} (${status}), not retrying`);
          throw err;
        }

        // Rate limit / overloaded — retry with delay
        if (status === 429 || status === 503 || msg.includes('overloaded') || msg.includes('busy') || msg.includes('rate')) {
          const delay = attempt === 0 ? 1500 : 3000;
          console.warn(`OpenCode: ${modelName} busy/rate-limited (attempt ${attempt + 1}), retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Other errors — break to next model
        console.warn(`OpenCode: ${modelName} failed: ${msg}, trying next model...`);
        break;
      }
    }
  }

  throw lastError || new Error('All OpenCode models failed');
}

export type { ChatMessage, ChatConfig, ChatResult };
