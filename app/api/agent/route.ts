import type { AgentResponse } from '@/lib/shared/contracts';
import { FALLBACK_MESSAGES } from '@/lib/shared/fallbackMessages';
import { converseWithFallback } from '@/lib/server/bedrock';
import { getAwsConfig } from '@/lib/server/config';
import { BEDROCK_DEADLINE_MS } from '@/lib/server/models';
import { buildUserText, enforceSignalMissMessage, parseModelOutput, SYSTEM_PROMPT } from '@/lib/server/prompt';
import { validateAgentRequest } from '@/lib/server/validateRequest';

// Nota Next.js 16 con `cacheComponents: true` (next.config.ts): los exports `runtime` y `dynamic`
// NO están soportados y deben omitirse. Las Route Handlers POST nunca se cachean y ya corren en
// Node.js por defecto, que es lo que el diseño buscaba con runtime='nodejs' + dynamic='force-dynamic'.
// `maxDuration` sí sigue disponible.
export const maxDuration = 15;

function reply(body: AgentResponse, status: number): Response {
  return Response.json(body, { status });
}

export async function POST(req: Request): Promise<Response> {
  const validation = validateAgentRequest(await req.text());
  if (!validation.ok) {
    return reply(
      {
        message: FALLBACK_MESSAGES.INVALID_REQUEST,
        source: 'fallback',
        errorCode: 'INVALID_REQUEST',
        detail: `${validation.reason}: ${validation.detail}`,
      },
      400,
    );
  }

  const config = getAwsConfig();
  if (!config.ok) {
    return reply(
      {
        message: FALLBACK_MESSAGES.CONFIG_MISSING,
        source: 'fallback',
        errorCode: 'CONFIG_MISSING',
        missing: config.missing,
      },
      503,
    );
  }

  const { snapshot, command, trigger } = validation;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BEDROCK_DEADLINE_MS);

  try {
    const outcome = await converseWithFallback({
      config,
      system: SYSTEM_PROMPT,
      userText: buildUserText(snapshot, command, trigger),
      signal: controller.signal,
    });

    if (!outcome.ok) {
      return reply(
        { message: FALLBACK_MESSAGES[outcome.errorCode], source: 'fallback', errorCode: outcome.errorCode },
        503,
      );
    }

    const parsed = parseModelOutput(outcome.text, command);
    const miss = trigger === 'signal_miss' ? snapshot.lastSignalMiss : null;
    if (miss) {
      return reply(
        { message: enforceSignalMissMessage(parsed.message, miss.suggestedKmh), source: 'bedrock' },
        200,
      );
    }
    return reply({ ...parsed, source: 'bedrock' }, 200);
  } finally {
    clearTimeout(timer);
  }
}
