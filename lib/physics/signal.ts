import {
  GREEN_WAVE_MAX_KMH,
  GREEN_WAVE_MIN_KMH,
  USER_CAR_ID,
} from '@/lib/physics/constants';
import type { SignalState, World } from '@/lib/physics/types';
import { ROAD_CONTEXT } from '@/lib/shared/roadContext';

/** Returns the deterministic signal phase for a simulation time in seconds. */
export function signalStateAt(simTime: number): SignalState {
  const { greenS, redS } = ROAD_CONTEXT.signal;
  const cycleS = greenS + redS;
  const phaseS = simTime % cycleS;

  return {
    color: phaseS < greenS ? 'green' : 'red',
    remainingS: phaseS < greenS ? greenS - phaseS : cycleS - phaseS,
    cycleIndex: Math.floor(simTime / cycleS),
  };
}

/** Calculates seconds to the stop line at the current speed. */
export function computeTta(y: number, speed: number): number {
  return speed === 0 ? Infinity : (ROAD_CONTEXT.signal.y - y) / speed;
}

/** Calculates the green-wave target in km/h, rounded down to a multiple of five. */
export function greenWaveSpeedKmh(y: number, greenRemainingS: number): number {
  const distanceM = ROAD_CONTEXT.signal.y - y;
  const arrivalS = greenRemainingS + ROAD_CONTEXT.signal.redS;
  const roundedKmh = Math.floor((distanceM / arrivalS) * 3.6 / 5) * 5;

  return Math.min(GREEN_WAVE_MAX_KMH, Math.max(GREEN_WAVE_MIN_KMH, roundedKmh));
}

/** Resolves the selected car, then the default user car, against the current world. */
export function resolveUserCarId(world: World, selectedId: string | null): string | null {
  if (selectedId !== null && world.cars.some((car) => car.id === selectedId)) return selectedId;
  return world.cars.some((car) => car.id === USER_CAR_ID) ? USER_CAR_ID : null;
}
