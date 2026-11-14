'use client';

import { useEffect } from 'react';

import { askAgent } from '@/lib/agent/askAgent';
import { LOOP_MAX_DT_S } from '@/lib/physics/constants';
import { useTrafficStore } from '@/store/trafficStore';

export function useSimulationLoop(): void {
  useEffect(() => {
    let frame = 0;
    let last: number | null = null;

    const loop = (ts: number) => {
      const dt = last === null ? 0 : Math.min((ts - last) / 1000, LOOP_MAX_DT_S);
      last = ts;
      if (dt > 0) {
        const state = useTrafficStore.getState();
        state.tick(dt * state.timeScale);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const unsubscribe = useTrafficStore.subscribe((state) => {
      if (state.pendingSignalMiss && !state.awaitingAgent) {
        state.clearPendingSignalMiss();
        void askAgent(undefined, 'signal_miss');
      }
    });

    if (process.env.NODE_ENV === 'development') {
      (window as unknown as { __sim: typeof useTrafficStore }).__sim = useTrafficStore;
    }

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);
}
