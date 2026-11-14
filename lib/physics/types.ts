// Tipos del Motor_Fisico (Integrante 2). Contrato compartido, ver design.md "Data Models".

export type Lane = 0 | 1 | 2;

/** Atributos públicos del Automovil (Req. 3.1). */
export interface Automovil {
  id: string;
  description: string; // 1..50 caracteres, "Marca Modelo color"
  y: number; // [0, 200) m
  lane: Lane;
  speed: number; // [0, 27.8] m/s
  accel: number; // [-5.88, 3.0] m/s²
}

/** Estado de control interno del motor, separado de Automovil para no ampliar la entidad. */
export interface CarControl {
  isGhost: boolean;
  targetSpeed: number; // velocidad objetivo actual (= cruiseSpeed, o la de Onda Verde)
  cruiseSpeed: number; // velocidad de crucero original del escenario (nunca cambia)
  hardBrakeRemaining: number; // s restantes de Frenado_Brusco disparado (0 = inactivo)
  proximityBraking: boolean; // frenando por hueco < 8 m
  savedAccel: number; // aceleración previa al frenado por proximidad (Req. 3.8)
  scheduledBrakeAt: number | null; // solo fantasmas: simTime en que dispara el frenado
  signalStopping: boolean; // frenando o detenido por el rojo (Req. 16.3)
  amberExempt: boolean; // dilema de la luz ámbar: puede cruzar en rojo (Req. 16.4)
  greenWaveTargetMs: number | null; // Onda Verde activa (m/s) o null (Req. 17.5)
}

export interface BrakeEvent {
  carId: string;
  lane: Lane;
  y: number; // m
  t: number; // s de simulación
}

/** Estado del Semaforo en un instante (Req. 16.1, 16.7). */
export interface SignalState {
  color: 'green' | 'red';
  remainingS: number; // s restantes de la fase actual, (0, 15]
  cycleIndex: number; // floor(simTime / 30)
}

/** Evento Semaforo_Perdido (Req. 17.2). Valores sin redondear; el snapshot redondea. */
export interface SignalMissEvent {
  carId: string;
  y: number; // m
  ttaS: number; // s hasta la línea de alto
  greenRemainingS: number; // s de verde restantes
  suggestedKmh: number; // múltiplo de 5 en [10, 60]
  cycleIndex: number;
  t: number; // s de simulación
}

export interface World {
  simTime: number; // s
  damperEnabled: boolean;
  cars: Automovil[]; // ordenados por id
  controls: Record<string, CarControl>;
  userCarId: string | null; // Auto_Usuario; null → se resuelve a 'c02' con resolveUserCarId
  lastSignalMissCycle: Record<string, number>; // carId → último cycleIndex con evento (1 por ciclo)
}

export interface TrafficState {
  world: World;
  brakeEvents: BrakeEvent[]; // máx. 500, el más antiguo primero
  signalMissEvents: SignalMissEvent[]; // máx. 50, el más antiguo primero
  signal: SignalState; // estado del último tick
}
