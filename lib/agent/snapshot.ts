import type { TrafficState } from '@/lib/physics/types';
import type { TrafficSnapshot } from '@/lib/shared/contracts';
import { ROAD_CONTEXT } from '@/lib/shared/roadContext';

export const SNAPSHOT_MAX_BYTES = 8192;

export class SnapshotTooLargeError extends Error {
  constructor() {
    super('El snapshot excede el tamaño máximo');
    this.name = 'SnapshotTooLargeError';
  }
}

function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function buildSnapshot(state: TrafficState, nowIso: string): TrafficSnapshot {
  const cars = [...state.world.cars]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((car) => ({
      id: car.id,
      description: car.description,
      lane: car.lane,
      y: round1(car.y),
      speedKmh: round1(car.speed * 3.6),
      accel: round1(car.accel),
      isGhost: state.world.controls[car.id].isGhost,
    }));

  const recentHardBrakes = state.brakeEvents
    .slice(-5)
    .reverse()
    .map((event) => ({
      carId: event.carId,
      lane: event.lane,
      y: round1(event.y),
      t: round1(event.t),
    }));

  const miss = state.signalMissEvents.at(-1);

  return {
    timestamp: nowIso,
    damperEnabled: state.world.damperEnabled,
    totalCars: cars.length,
    truncated: false,
    cars,
    recentHardBrakes,
    signal: {
      name: ROAD_CONTEXT.signal.name,
      color: state.signal.color,
      remainingS: round1(state.signal.remainingS),
    },
    lastSignalMiss: miss
      ? {
          carId: miss.carId,
          y: round1(miss.y),
          ttaS: round1(miss.ttaS),
          greenRemainingS: round1(miss.greenRemainingS),
          suggestedKmh: miss.suggestedKmh,
          cycleIndex: miss.cycleIndex,
          t: round1(miss.t),
        }
      : null,
  };
}

export function serializeSnapshot(snapshot: TrafficSnapshot): string {
  const serializable: TrafficSnapshot = {
    ...snapshot,
    totalCars: snapshot.totalCars,
    truncated: snapshot.truncated,
    cars: [...snapshot.cars],
    recentHardBrakes: [...snapshot.recentHardBrakes],
    signal: { ...snapshot.signal },
    lastSignalMiss: snapshot.lastSignalMiss ? { ...snapshot.lastSignalMiss } : null,
  };

  let json = JSON.stringify(serializable);

  while (new TextEncoder().encode(json).length > SNAPSHOT_MAX_BYTES) {
    const normalCarIndex = serializable.cars.findLastIndex((car) => !car.isGhost);

    if (normalCarIndex < 0) {
      throw new SnapshotTooLargeError();
    }

    serializable.cars.splice(normalCarIndex, 1);
    serializable.truncated = true;
    json = JSON.stringify(serializable);
  }

  return json;
}
