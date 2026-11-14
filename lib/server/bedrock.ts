import 'server-only';

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

import {
  isRetryableForFallback,
  mapError,
  type BedrockErrorCode,
} from '@/lib/server/errors';
import {
  FALLBACK_MODEL_ID,
  INFERENCE_CONFIG,
  PRIMARY_MODEL_ID,
} from '@/lib/server/models';

export type BedrockOutcome =
  | { ok: true; text: string; modelId: string }
  | { ok: false; errorCode: BedrockErrorCode };

type ConverseArgs = {
  config: { accessKeyId: string; secretAccessKey: string; region: string };
  system: string;
  userText: string;
  signal: AbortSignal;
};

function commandFor(modelId: string, system: string, userText: string): ConverseCommand {
  return new ConverseCommand({
    modelId,
    system: [{ text: system }],
    messages: [{ role: 'user', content: [{ text: userText }] }],
    inferenceConfig: INFERENCE_CONFIG,
  });
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined;
  return typeof error.name === 'string' ? error.name : undefined;
}

function logFailure(code: BedrockErrorCode, error: unknown, modelId: string): void {
  console.error('[agent]', code, errorName(error), modelId);
}

function outputText(output: ConverseCommandOutput): string {
  return (output.output?.message?.content ?? [])
    .map((block) => (typeof block.text === 'string' ? block.text : ''))
    .join('');
}

export async function converseWithFallback(args: ConverseArgs): Promise<BedrockOutcome> {
  if (args.signal.aborted) return { ok: false, errorCode: 'TIMEOUT' };

  const client = new BedrockRuntimeClient({
    region: args.config.region,
    credentials: {
      accessKeyId: args.config.accessKeyId,
      secretAccessKey: args.config.secretAccessKey,
    },
    maxAttempts: 1,
  });

  let output: ConverseCommandOutput;
  let modelId = PRIMARY_MODEL_ID;

  try {
    output = await client.send(commandFor(modelId, args.system, args.userText), {
      abortSignal: args.signal,
    });
  } catch (error) {
    const code = args.signal.aborted ? 'TIMEOUT' : mapError(error);
    logFailure(code, error, modelId);

    if (args.signal.aborted || !isRetryableForFallback(error)) {
      return { ok: false, errorCode: code };
    }

    modelId = FALLBACK_MODEL_ID;
    try {
      output = await client.send(commandFor(modelId, args.system, args.userText), {
        abortSignal: args.signal,
      });
    } catch (fallbackError) {
      const fallbackCode = args.signal.aborted ? 'TIMEOUT' : mapError(fallbackError);
      logFailure(fallbackCode, fallbackError, modelId);
      return { ok: false, errorCode: fallbackCode };
    }
  }

  const text = outputText(output);
  if (text.trim() === '') return { ok: false, errorCode: 'EMPTY_RESPONSE' };
  return { ok: true, text, modelId };
}
