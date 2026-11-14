import { requestAgent } from '@/lib/agent/agentClient';
import { buildSnapshot, serializeSnapshot } from '@/lib/agent/snapshot';
import type { AgentTrigger } from '@/lib/shared/contracts';
import { buildSignalMissFallback, FALLBACK_MESSAGES } from '@/lib/shared/fallbackMessages';
import { speak } from '@/lib/voice/speech';
import { useTrafficStore } from '@/store/trafficStore';

export async function askAgent(command?: string, trigger?: AgentTrigger): Promise<void> {
  const store = useTrafficStore.getState();
  let snapshotJson: string;
  try {
    snapshotJson = serializeSnapshot(buildSnapshot(store, new Date().toISOString()));
  } catch {
    store.setLocalMessage(FALLBACK_MESSAGES.SNAPSHOT_ERROR, true);
    return;
  }

  store.setAwaitingAgent(trigger ?? 'manual');
  try {
    const response = await requestAgent(snapshotJson, command, trigger);
    const miss = useTrafficStore.getState().signalMissEvents.at(-1);
    if (trigger === 'signal_miss' && response.source === 'fallback' && miss) {
      response.message = buildSignalMissFallback(miss.suggestedKmh);
    }
    useTrafficStore.getState().applyAgentResponse(response);
    speak(response.message);
  } finally {
    useTrafficStore.getState().setAwaitingAgent(null);
  }
}
