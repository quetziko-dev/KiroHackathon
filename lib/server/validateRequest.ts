import 'server-only';

import {
  AGENT_TRIGGERS,
  type AgentTrigger,
  type TrafficSnapshot,
} from '@/lib/shared/contracts';

const SNAPSHOT_MAX_BYTES = 8192;
const REQUEST_OVERHEAD_BYTES = 2048;
const COMMAND_MAX_CHARACTERS = 500;

export type ValidationResult =
  | { ok: true; snapshot: TrafficSnapshot; command?: string; trigger?: AgentTrigger }
  | { ok: false; reason: 'NOT_JSON' | 'MISSING_FIELD' | 'WRONG_TYPE' | 'TOO_LARGE'; detail: string };

type ValidationFailure = Extract<ValidationResult, { ok: false }>;
type UnknownRecord = Record<string, unknown>;

const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isLane = (value: unknown): value is 0 | 1 | 2 =>
  value === 0 || value === 1 || value === 2;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

function requiredField(
  value: UnknownRecord,
  key: string,
  path: string,
  accepts: (candidate: unknown) => boolean,
): ValidationFailure | null {
  if (!hasOwn(value, key)) {
    return { ok: false, reason: 'MISSING_FIELD', detail: path };
  }

  if (!accepts(value[key])) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  return null;
}
function validateCar(value: unknown, path: string): ValidationFailure | null {
  if (!isRecord(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  return (
    requiredField(value, 'id', `${path}.id`, (field) => typeof field === 'string') ??
    requiredField(value, 'description', `${path}.description`, (field) => typeof field === 'string') ??
    requiredField(value, 'lane', `${path}.lane`, isLane) ??
    requiredField(value, 'y', `${path}.y`, isFiniteNumber) ??
    requiredField(value, 'speedKmh', `${path}.speedKmh`, isFiniteNumber) ??
    requiredField(value, 'accel', `${path}.accel`, isFiniteNumber) ??
    requiredField(value, 'isGhost', `${path}.isGhost`, (field) => typeof field === 'boolean')
  );
}

function validateBrakeEvent(value: unknown, path: string): ValidationFailure | null {
  if (!isRecord(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  return (
    requiredField(value, 'carId', `${path}.carId`, (field) => typeof field === 'string') ??
    requiredField(value, 'lane', `${path}.lane`, isLane) ??
    requiredField(value, 'y', `${path}.y`, isFiniteNumber) ??
    requiredField(value, 't', `${path}.t`, isFiniteNumber)
  );
}

function validateSignal(value: unknown, path: string): ValidationFailure | null {
  if (!isRecord(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  return (
    requiredField(value, 'name', `${path}.name`, (field) => typeof field === 'string') ??
    requiredField(value, 'color', `${path}.color`, (field) => field === 'green' || field === 'red') ??
    requiredField(value, 'remainingS', `${path}.remainingS`, isFiniteNumber)
  );
}

function validateSignalMiss(value: unknown, path: string): ValidationFailure | null {
  if (!isRecord(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  return (
    requiredField(value, 'carId', `${path}.carId`, (field) => typeof field === 'string') ??
    requiredField(value, 'y', `${path}.y`, isFiniteNumber) ??
    requiredField(value, 'ttaS', `${path}.ttaS`, isFiniteNumber) ??
    requiredField(value, 'greenRemainingS', `${path}.greenRemainingS`, isFiniteNumber) ??
    requiredField(value, 'suggestedKmh', `${path}.suggestedKmh`, isFiniteNumber) ??
    requiredField(value, 'cycleIndex', `${path}.cycleIndex`, isFiniteNumber) ??
    requiredField(value, 't', `${path}.t`, isFiniteNumber)
  );
}

function validateArrayItems(
  value: unknown,
  path: string,
  validateItem: (item: unknown, itemPath: string) => ValidationFailure | null,
): ValidationFailure | null {
  if (!Array.isArray(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: path };
  }

  for (let index = 0; index < value.length; index += 1) {
    const failure = validateItem(value[index], `${path}[${index}]`);
    if (failure) return failure;
  }

  return null;
}
function validateSnapshot(value: unknown): ValidationFailure | null {
  if (!isRecord(value)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: 'snapshot' };
  }

  const scalarFailure =
    requiredField(value, 'timestamp', 'snapshot.timestamp', (field) => typeof field === 'string') ??
    requiredField(value, 'damperEnabled', 'snapshot.damperEnabled', (field) => typeof field === 'boolean') ??
    requiredField(value, 'totalCars', 'snapshot.totalCars', isFiniteNumber) ??
    requiredField(value, 'truncated', 'snapshot.truncated', (field) => typeof field === 'boolean');
  if (scalarFailure) return scalarFailure;

  if (!hasOwn(value, 'cars')) {
    return { ok: false, reason: 'MISSING_FIELD', detail: 'snapshot.cars' };
  }
  const carsFailure = validateArrayItems(value.cars, 'snapshot.cars', validateCar);
  if (carsFailure) return carsFailure;

  if (!hasOwn(value, 'recentHardBrakes')) {
    return { ok: false, reason: 'MISSING_FIELD', detail: 'snapshot.recentHardBrakes' };
  }
  const brakesFailure = validateArrayItems(
    value.recentHardBrakes,
    'snapshot.recentHardBrakes',
    validateBrakeEvent,
  );
  if (brakesFailure) return brakesFailure;

  if (!hasOwn(value, 'signal')) {
    return { ok: false, reason: 'MISSING_FIELD', detail: 'snapshot.signal' };
  }
  const signalFailure = validateSignal(value.signal, 'snapshot.signal');
  if (signalFailure) return signalFailure;

  if (!hasOwn(value, 'lastSignalMiss')) {
    return { ok: false, reason: 'MISSING_FIELD', detail: 'snapshot.lastSignalMiss' };
  }
  if (value.lastSignalMiss !== null) {
    const missFailure = validateSignalMiss(value.lastSignalMiss, 'snapshot.lastSignalMiss');
    if (missFailure) return missFailure;
  }

  return null;
}

function isAgentTrigger(value: unknown): value is AgentTrigger {
  return typeof value === 'string' && AGENT_TRIGGERS.includes(value as AgentTrigger);
}

export function validateAgentRequest(rawBody: string): ValidationResult {
  if (byteLength(rawBody) > SNAPSHOT_MAX_BYTES + REQUEST_OVERHEAD_BYTES) {
    return { ok: false, reason: 'TOO_LARGE', detail: 'body' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: 'NOT_JSON', detail: 'body' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: 'WRONG_TYPE', detail: 'body' };
  }
  if (!hasOwn(parsed, 'snapshot')) {
    return { ok: false, reason: 'MISSING_FIELD', detail: 'snapshot' };
  }

  const snapshotFailure = validateSnapshot(parsed.snapshot);
  if (snapshotFailure) return snapshotFailure;

  let snapshotJson: string;
  try {
    snapshotJson = JSON.stringify(parsed.snapshot);
  } catch {
    return { ok: false, reason: 'WRONG_TYPE', detail: 'snapshot' };
  }
  if (byteLength(snapshotJson) > SNAPSHOT_MAX_BYTES) {
    return { ok: false, reason: 'TOO_LARGE', detail: 'snapshot' };
  }

  let command: string | undefined;
  if (hasOwn(parsed, 'command')) {
    if (typeof parsed.command !== 'string') {
      return { ok: false, reason: 'WRONG_TYPE', detail: 'command' };
    }
    command = parsed.command.slice(0, COMMAND_MAX_CHARACTERS);
  }

  let trigger: AgentTrigger | undefined;
  if (hasOwn(parsed, 'trigger')) {
    if (!isAgentTrigger(parsed.trigger)) {
      return { ok: false, reason: 'WRONG_TYPE', detail: 'trigger' };
    }
    trigger = parsed.trigger;
  }

  return {
    ok: true,
    snapshot: parsed.snapshot as unknown as TrafficSnapshot,
    ...(command === undefined ? {} : { command }),
    ...(trigger === undefined ? {} : { trigger }),
  };
}
