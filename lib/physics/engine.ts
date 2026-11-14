// Motor_Fisico puro. Sin imports de React, store ni red.
import {
  DAMPER_LOOKAHEAD_M,
  DAMPER_MAX_DECEL_MS2,
  DAMPER_MIN_DECEL_MS2,
  ENGINE_MAX_DT_S,
  GREEN_WAVE_GAIN_S,
  HARD_BRAKE_DURATION_S,
  HARD_BRAKE_MS2,
  MAX_ACCEL_MS2,
  MAX_SPEED_MS,
  MIN_GAP_M,
  QUEUE_STOPPED_SPEED_MS,
  RECOVERY_ACCEL_MS2,
  RECOVERY_GAP_M,
  ROAD_LENGTH_M,
  SIGNAL_HOLD_Y_M,
  SIGNAL_STOP_MIN_DECEL_MS2,
} from '@/lib/physics/constants';
import { computeTta, greenWaveSpeedKmh, resolveUserCarId, signalStateAt } from '@/lib/physics/signal';
import type {
  Automovil,
  BrakeEvent,
  CarControl,
  SignalMissEvent,
  SignalState,
  World,
} from '@/lib/physics/types';

export interface StepResult {
  world: World;
  newEvents: BrakeEvent[];
  signalMissEvents: SignalMissEvent[];
  signal: SignalState;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function cloneControls(controls: Record<string, CarControl>): Record<string, CarControl> {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, { ...control }]));
}
export function stepWorld(world: World, dtInput: number): StepResult {
  const previousSignal = signalStateAt(world.simTime);
  if (!Number.isFinite(dtInput) || dtInput <= 0) {
    return { world, newEvents: [], signalMissEvents: [], signal: previousSignal };
  }

  const dt = Math.min(dtInput, ENGINE_MAX_DT_S);
  const simTime = world.simTime + dt;
  const signal = signalStateAt(simTime);
  const cars = [...world.cars].sort((left, right) => left.id.localeCompare(right.id));
  const controls = cloneControls(world.controls);
  const lastSignalMissCycle = { ...world.lastSignalMissCycle };
  const newEvents: BrakeEvent[] = [];
  const signalMissEvents: SignalMissEvent[] = [];
  const userCarId = resolveUserCarId(world, world.userCarId);
  const turnedRed = previousSignal.color === 'green' && signal.color === 'red';
  const turnedGreen = previousSignal.color === 'red' && signal.color === 'green';

  if (turnedRed) {
    for (const car of cars) {
      if (car.y >= ROAD_LENGTH_M) continue;
      const distance = ROAD_LENGTH_M - car.y;
      const requiredDecel = car.speed ** 2 / (2 * distance);
      if (requiredDecel > Math.abs(HARD_BRAKE_MS2)) controls[car.id].amberExempt = true;
    }
  }

  if (turnedGreen) {
    for (const control of Object.values(controls)) control.signalStopping = false;
  }

  const leaderById = Object.fromEntries(cars.map((car) => [car.id, findLeader(cars, car)]));
  const nextAccel: Record<string, number> = {};

  for (const car of cars) {
    const control = controls[car.id];
    const leader = leaderById[car.id];
    const leaderControl = leader ? controls[leader.id] : undefined;
    const gap = leader ? leader.y - car.y : Infinity;
    const wasBraking = control.hardBrakeRemaining > 0 || control.proximityBraking;
    let restore: number | undefined;

    if (control.scheduledBrakeAt !== null && simTime >= control.scheduledBrakeAt) {
      control.scheduledBrakeAt = null;
      control.hardBrakeRemaining = HARD_BRAKE_DURATION_S;
    }

    if (gap < MIN_GAP_M) {
      if (!control.proximityBraking) {
        control.savedAccel = wasBraking ? 0 : car.accel;
        control.proximityBraking = true;
      }
    } else if (control.proximityBraking) {
      control.proximityBraking = false;
      restore = control.savedAccel;
    }

    const redBlocked = signal.color === 'red' && !control.amberExempt && car.y < ROAD_LENGTH_M;
    const leaderQueued = leader !== undefined && leaderControl !== undefined
      && (leaderControl.signalStopping
        || (leader.speed < QUEUE_STOPPED_SPEED_MS && leader.y >= SIGNAL_HOLD_Y_M - 0.9));

    let accel: number;
    if (control.proximityBraking) {
      accel = HARD_BRAKE_MS2;
    } else if (control.hardBrakeRemaining > 0) {
      accel = HARD_BRAKE_MS2;
    } else {
      const requiredSignalDecel = redBlocked
        ? car.speed ** 2 / (2 * Math.max(ROAD_LENGTH_M - car.y, 0.1))
        : 0;

      if (redBlocked && requiredSignalDecel >= SIGNAL_STOP_MIN_DECEL_MS2) {
        accel = -Math.min(requiredSignalDecel, Math.abs(HARD_BRAKE_MS2));
        control.signalStopping = true;
      } else if (leaderQueued) {
        const closingSpeed = car.speed - leader.speed;
        accel = closingSpeed > 0
          ? -Math.min(
            closingSpeed ** 2 / (2 * Math.max(gap - MIN_GAP_M, 0.5)),
            Math.abs(HARD_BRAKE_MS2),
          )
          : 0;
        if (car.speed < QUEUE_STOPPED_SPEED_MS) {
          control.signalStopping = control.signalStopping || redBlocked;
        }
      } else if (
        world.damperEnabled
        && leader !== undefined
        && leaderControl !== undefined
        && (leaderControl.hardBrakeRemaining > 0 || leaderControl.proximityBraking)
        && gap > MIN_GAP_M
        && gap <= DAMPER_LOOKAHEAD_M
      ) {
        const closingSpeed = Math.max(car.speed - leader.speed, 0);
        const requiredDecel = closingSpeed ** 2 / (2 * Math.max(gap - MIN_GAP_M, 0.5));
        accel = -clamp(requiredDecel, DAMPER_MIN_DECEL_MS2, DAMPER_MAX_DECEL_MS2);
      } else if (control.greenWaveTargetMs !== null) {
        accel = car.speed > control.greenWaveTargetMs
          ? -clamp(
            (car.speed - control.greenWaveTargetMs) / GREEN_WAVE_GAIN_S,
            DAMPER_MIN_DECEL_MS2,
            DAMPER_MAX_DECEL_MS2,
          )
          : 0;
      } else if (restore !== undefined) {
        accel = restore;
      } else if (
        car.speed < control.targetSpeed
        && gap >= RECOVERY_GAP_M
        && !(redBlocked && control.signalStopping)
      ) {
        accel = RECOVERY_ACCEL_MS2;
      } else {
        accel = 0;
      }
    }

    nextAccel[car.id] = clamp(accel, HARD_BRAKE_MS2, MAX_ACCEL_MS2);
    if (!wasBraking && (control.hardBrakeRemaining > 0 || control.proximityBraking)) {
      newEvents.push({ carId: car.id, lane: car.lane, y: car.y, t: simTime });
    }
  }

  const nextCars = cars.map((car) => {
    const control = controls[car.id];
    let accel = nextAccel[car.id];
    let speed = clamp(car.speed + accel * dt, 0, MAX_SPEED_MS);
    let y = car.y + speed * dt;

    if (y >= ROAD_LENGTH_M) {
      if (signal.color === 'green' || control.amberExempt) {
        y -= ROAD_LENGTH_M;
        control.amberExempt = false;
        control.signalStopping = false;
        if (car.id === userCarId && control.greenWaveTargetMs !== null) {
          control.greenWaveTargetMs = null;
          control.targetSpeed = control.cruiseSpeed;
        }
      } else {
        y = SIGNAL_HOLD_Y_M;
        speed = 0;
        control.signalStopping = true;
      }
    }

    if (control.hardBrakeRemaining > 0) {
      control.hardBrakeRemaining = Math.max(control.hardBrakeRemaining - dt, 0);
      if (speed === 0) control.hardBrakeRemaining = 0;
      if (control.hardBrakeRemaining === 0 && !control.proximityBraking) accel = 0;
    }

    return { ...car, y, speed, accel };
  });

  if (userCarId !== null) {
    const userCar = nextCars.find((car) => car.id === userCarId);
    if (userCar) {
      const tta = computeTta(userCar.y, userCar.speed);
      if (
        signal.color === 'green'
        && userCar.speed > 0
        && userCar.y < ROAD_LENGTH_M
        && signal.remainingS < tta
        && lastSignalMissCycle[userCar.id] !== signal.cycleIndex
      ) {
        const suggestedKmh = greenWaveSpeedKmh(userCar.y, signal.remainingS);
        signalMissEvents.push({
          carId: userCar.id,
          y: userCar.y,
          ttaS: tta,
          greenRemainingS: signal.remainingS,
          suggestedKmh,
          cycleIndex: signal.cycleIndex,
          t: simTime,
        });
        controls[userCar.id].greenWaveTargetMs = suggestedKmh / 3.6;
        controls[userCar.id].targetSpeed = suggestedKmh / 3.6;
        lastSignalMissCycle[userCar.id] = signal.cycleIndex;
      }
    }
  }

  return {
    world: {
      ...world,
      simTime,
      cars: nextCars,
      controls,
      lastSignalMissCycle,
    },
    newEvents,
    signalMissEvents,
    signal,
  };
}

export function findLeader(cars: Automovil[], car: Automovil): Automovil | undefined {
  let leader: Automovil | undefined;
  for (const candidate of cars) {
    if (candidate.id === car.id || candidate.lane !== car.lane || candidate.y <= car.y) continue;
    if (leader === undefined || candidate.y < leader.y) leader = candidate;
  }
  return leader;
}

export function triggerHardBrake(world: World, carId: string): World {
  if (!world.cars.some((car) => car.id === carId) || world.controls[carId] === undefined) return world;

  return {
    ...world,
    controls: {
      ...world.controls,
      [carId]: {
        ...world.controls[carId],
        hardBrakeRemaining: HARD_BRAKE_DURATION_S,
      },
    },
  };
}
