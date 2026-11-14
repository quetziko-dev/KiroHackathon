import { create } from 'zustand';

import { MAX_BRAKE_EVENTS, MAX_SIGNAL_MISS_EVENTS } from '@/lib/physics/constants';
import { stepWorld, triggerHardBrake } from '@/lib/physics/engine';
import { createGhostCars, createInitialWorld } from '@/lib/physics/scenario';
import { greenWaveSpeedKmh, resolveUserCarId } from '@/lib/physics/signal';
import type { SignalMissEvent, TrafficState } from '@/lib/physics/types';
import type { AgentResponse, AgentTrigger } from '@/lib/shared/contracts';
import { FALLBACK_MESSAGES } from '@/lib/shared/fallbackMessages';
import { ROAD_CONTEXT } from '@/lib/shared/roadContext';

export interface TrafficStore extends TrafficState {
  status: 'running' | 'paused';
  selectedCarId: string | null;
  lastMessage: { text: string; source: 'bedrock' | 'fallback' | 'local' } | null;
  noAiMode: boolean;
  awaitingAgent: boolean;
  pendingTrigger: AgentTrigger | null; // qué acción espera respuesta (estados de carga)
  timeScale: number; // multiplicador de la simulación (0.25x–2x)
  simulationError: string | null;

  pendingSignalMiss: SignalMissEvent | null; // último evento aún no enviado al agente

  tick(dt: number): void;
  clearPendingSignalMiss(): void;
  toggleRunning(): void;
  setRunning(running: boolean): void;
  setDamper(enabled: boolean): void;
  injectChaos(): void;
  forceSignalMiss(): void;
  reset(): void;
  selectCar(id: string | null): void;
  applyAgentResponse(r: AgentResponse): void;
  setLocalMessage(text: string, isFallback: boolean): void;
  setAwaitingAgent(trigger: AgentTrigger | null): void;
  setTimeScale(scale: number): void;
}

function initialState() {
  return {
    world: createInitialWorld(),
    brakeEvents: [],
    signalMissEvents: [],
    signal: { color: 'green' as const, remainingS: ROAD_CONTEXT.signal.greenS, cycleIndex: 0 },
    pendingSignalMiss: null,
    selectedCarId: null,
    simulationError: null,
  };
}

export const useTrafficStore = create<TrafficStore>()((set, get) => ({
  ...initialState(),
  status: 'paused',
  lastMessage: null,
  noAiMode: false,
  awaitingAgent: false,
  pendingTrigger: null,
  timeScale: 1,

  tick: (dt) => {
    const state = get();
    if (state.status !== 'running') return;
    try {
      const result = stepWorld(state.world, dt);
      const newMiss = result.signalMissEvents.at(-1);
      set({
        world: result.world,
        signal: result.signal,
        brakeEvents: result.newEvents.length
          ? [...state.brakeEvents, ...result.newEvents].slice(-MAX_BRAKE_EVENTS)
          : state.brakeEvents,
        signalMissEvents: newMiss
          ? [...state.signalMissEvents, ...result.signalMissEvents].slice(-MAX_SIGNAL_MISS_EVENTS)
          : state.signalMissEvents,
        pendingSignalMiss: newMiss ?? state.pendingSignalMiss,
      });
    } catch (error) {
      console.error('[sim]', error);
      set({ status: 'paused', simulationError: FALLBACK_MESSAGES.SIMULATION_ERROR });
    }
  },

  clearPendingSignalMiss: () => set({ pendingSignalMiss: null }),

  toggleRunning: () => set((s) => ({ status: s.status === 'running' ? 'paused' : 'running' })),

  setRunning: (running) => set({ status: running ? 'running' : 'paused' }),

  setDamper: (enabled) => set((s) => ({ world: { ...s.world, damperEnabled: enabled } })),

  injectChaos: () => {
    const { world } = get();
    const ghostIds = world.cars.filter((car) => world.controls[car.id]?.isGhost).map((car) => car.id);
    if (ghostIds.length > 0) {
      set({ world: ghostIds.reduce(triggerHardBrake, world) });
      return;
    }
    const ghosts = createGhostCars(world.simTime);
    set({
      world: {
        ...world,
        cars: [...world.cars, ...ghosts.cars].sort((a, b) => a.id.localeCompare(b.id)),
        controls: { ...world.controls, ...ghosts.controls },
      },
    });
  },

  forceSignalMiss: () => {
    const { world, signal, signalMissEvents } = get();
    const userCarId = resolveUserCarId(world, world.userCarId);
    const car = world.cars.find((candidate) => candidate.id === userCarId);
    if (!car) return;

    const distance = Math.max(ROAD_CONTEXT.signal.y - car.y, 0.1);
    // En rojo, el próximo verde llega en remainingS; greenWaveSpeedKmh suma redS al verde restante.
    const greenRemaining = signal.color === 'green' ? signal.remainingS : signal.remainingS - ROAD_CONTEXT.signal.redS;
    const suggestedKmh = greenWaveSpeedKmh(car.y, greenRemaining);
    const event: SignalMissEvent = {
      carId: car.id,
      y: car.y,
      ttaS: car.speed > 0 ? distance / car.speed : Infinity,
      greenRemainingS: signal.color === 'green' ? signal.remainingS : 0,
      suggestedKmh,
      cycleIndex: signal.cycleIndex,
      t: world.simTime,
    };
    if (!Number.isFinite(event.ttaS)) event.ttaS = 999;

    set({
      world: {
        ...world,
        controls: {
          ...world.controls,
          [car.id]: {
            ...world.controls[car.id],
            greenWaveTargetMs: suggestedKmh / 3.6,
            targetSpeed: suggestedKmh / 3.6,
          },
        },
        lastSignalMissCycle: { ...world.lastSignalMissCycle, [car.id]: signal.cycleIndex },
      },
      signalMissEvents: [...signalMissEvents, event].slice(-MAX_SIGNAL_MISS_EVENTS),
      pendingSignalMiss: event,
    });
  },

  reset: () => set({ ...initialState() }),

  selectCar: (id) => set((s) => ({ selectedCarId: id, world: { ...s.world, userCarId: id } })),

  applyAgentResponse: (r) =>
    set((s) => ({
      lastMessage: { text: r.message, source: r.source },
      noAiMode: r.source === 'fallback',
      world:
        r.action === undefined
          ? s.world
          : { ...s.world, damperEnabled: r.action === 'enable_damper' },
    })),

  setLocalMessage: (text, isFallback) =>
    set({ lastMessage: { text, source: 'local' }, noAiMode: isFallback }),

  setAwaitingAgent: (trigger) => set({ awaitingAgent: trigger !== null, pendingTrigger: trigger }),

  setTimeScale: (scale) => set({ timeScale: Math.min(2, Math.max(0.25, scale)) }),
}));
