// Contratos compartidos cliente/servidor (Integrante 1). No contienen secretos.

export interface SnapshotCar {
  id: string;
  description: string;
  lane: 0 | 1 | 2;
  y: number;
  speedKmh: number;
  accel: number;
  isGhost: boolean; // números con 1 decimal
}

export interface SnapshotBrakeEvent {
  carId: string;
  lane: 0 | 1 | 2;
  y: number;
  t: number;
}

export interface SnapshotSignal {
  name: string;
  color: 'green' | 'red';
  remainingS: number; // 1 decimal
}

export interface SnapshotSignalMiss {
  carId: string;
  y: number; // 1 decimal
  ttaS: number; // 1 decimal
  greenRemainingS: number; // 1 decimal
  suggestedKmh: number; // entero, múltiplo de 5
  cycleIndex: number;
  t: number; // 1 decimal
}

export interface TrafficSnapshot {
  timestamp: string; // ISO 8601
  damperEnabled: boolean;
  totalCars: number; // total real, aunque se recorte la lista
  truncated: boolean;
  cars: SnapshotCar[]; // [] si no hay autos
  recentHardBrakes: SnapshotBrakeEvent[]; // 0..5, el más reciente primero
  signal: SnapshotSignal; // Req. 8.1, 18.1
  lastSignalMiss: SnapshotSignalMiss | null;
}

export type AgentTrigger = 'manual' | 'voice' | 'signal_miss';
export const AGENT_TRIGGERS: readonly AgentTrigger[] = ['manual', 'voice', 'signal_miss'];

export interface AgentRequest {
  snapshot: TrafficSnapshot;
  command?: string; // ≤ 500
  trigger?: AgentTrigger;
}

export type AgentAction = 'enable_damper' | 'disable_damper';

export type ErrorCode =
  | 'CONFIG_MISSING'
  | 'AUTH_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'BEDROCK_ERROR'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR';

export interface AgentResponse {
  message: string;
  source: 'bedrock' | 'fallback';
  errorCode?: ErrorCode;
  action?: AgentAction;
  missing?: string[]; // solo con CONFIG_MISSING: nombres, nunca valores
  detail?: string; // solo con INVALID_REQUEST
}
