import 'server-only';

export const PRIMARY_MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';
export const FALLBACK_MODEL_ID = 'us.amazon.nova-micro-v1:0';
export const INFERENCE_CONFIG = { maxTokens: 200, temperature: 0.4 } as const;
export const BEDROCK_DEADLINE_MS = 10_000;
