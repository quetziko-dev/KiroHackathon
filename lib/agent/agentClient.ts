import type { AgentResponse, AgentTrigger } from '@/lib/shared/contracts';
import { buildLocalFallback } from '@/lib/shared/fallbackMessages';
import { useTrafficStore } from '@/store/trafficStore';

const CLIENT_TIMEOUT_MS = 15_000;

export async function requestAgent(
  snapshotJson: string,
  command?: string,
  trigger?: AgentTrigger,
): Promise<AgentResponse> {
  const body =
    `{"snapshot":${snapshotJson}` +
    (command === undefined ? '' : `,"command":${JSON.stringify(command)}`) +
    (trigger === undefined ? '' : `,"trigger":${JSON.stringify(trigger)}`) +
    '}';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    return (await res.json()) as AgentResponse;
  } catch {
    const { world, brakeEvents } = useTrafficStore.getState();
    const carsById = Object.fromEntries(world.cars.map((car) => [car.id, car]));
    return {
      message: buildLocalFallback(brakeEvents.at(-1), carsById),
      source: 'fallback',
      errorCode: 'NETWORK_ERROR',
    };
  } finally {
    clearTimeout(timer);
  }
}
