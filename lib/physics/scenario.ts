// Escenario fijo (sin aleatoriedad ni reloj del sistema).
import type { Automovil, CarControl, Lane, World } from '@/lib/physics/types';

interface ScenarioCar {
  id: string;
  description: string;
  lane: Lane;
  y: number;
  speed: number;
}

const INITIAL_CARS: readonly ScenarioCar[] = [
  { id: 'c01', description: 'Nissan Versa blanco', lane: 0, y: 10, speed: 22 },
  { id: 'c02', description: 'Honda Fit azul', lane: 0, y: 50, speed: 22 },
  { id: 'c03', description: 'Chevrolet Aveo rojo', lane: 0, y: 95, speed: 22 },
  { id: 'c04', description: 'Volkswagen Jetta gris', lane: 0, y: 140, speed: 22 },
  { id: 'c05', description: 'Mazda 3 negro', lane: 1, y: 20, speed: 24 },
  { id: 'c06', description: 'Toyota Corolla plata', lane: 1, y: 80, speed: 24 },
  { id: 'c07', description: 'Kia Rio verde', lane: 1, y: 145, speed: 24 },
  { id: 'c08', description: 'Seat Ibiza amarillo', lane: 2, y: 30, speed: 20 },
  { id: 'c09', description: 'Hyundai Accent café', lane: 2, y: 90, speed: 20 },
  { id: 'c10', description: 'Renault Kwid naranja', lane: 2, y: 150, speed: 20 },
];

const GHOST_CARS: readonly ScenarioCar[] = [
  { id: 'g01', description: 'Auto fantasma Tsuru morado', lane: 0, y: 120, speed: 22 },
  { id: 'g02', description: 'Auto fantasma Sentra rosa', lane: 1, y: 115, speed: 24 },
];

function createCar(data: ScenarioCar): Automovil {
  return { ...data, accel: 0 };
}

function createControl(speed: number, isGhost: boolean, scheduledBrakeAt: number | null): CarControl {
  return {
    isGhost,
    targetSpeed: speed,
    cruiseSpeed: speed,
    hardBrakeRemaining: 0,
    proximityBraking: false,
    savedAccel: 0,
    scheduledBrakeAt,
    signalStopping: false,
    amberExempt: false,
    greenWaveTargetMs: null,
  };
}

export function createInitialWorld(): World {
  const cars = INITIAL_CARS.map(createCar).sort((a, b) => a.id.localeCompare(b.id));
  const controls = Object.fromEntries(
    cars.map((car) => [car.id, createControl(car.speed, false, null)]),
  );

  return {
    simTime: 0,
    damperEnabled: false,
    cars,
    controls,
    userCarId: null,
    lastSignalMissCycle: {},
  };
}

export function createGhostCars(simTime: number): {
  cars: Automovil[];
  controls: Record<string, CarControl>;
} {
  const cars = GHOST_CARS.map(createCar).sort((a, b) => a.id.localeCompare(b.id));
  const controls = Object.fromEntries(
    cars.map((car, index) => [car.id, createControl(car.speed, true, simTime + index + 1)]),
  );

  return { cars, controls };
}
