// Constantes del Motor_Fisico (Integrante 2). Ver design.md "lib/physics/constants.ts".

export const ROAD_LENGTH_M = 200;
export const LANES = 3;
export const MAX_SPEED_MS = 27.8;
export const HARD_BRAKE_MS2 = -5.88; // -0.6 G
export const HARD_BRAKE_DURATION_S = 2.0;
export const MIN_GAP_M = 8;
export const DAMPER_LOOKAHEAD_M = 30;
export const DAMPER_MIN_DECEL_MS2 = 0.5;
export const DAMPER_MAX_DECEL_MS2 = 2.94; // 0.3 G
export const MAX_ACCEL_MS2 = 3.0;
export const ENGINE_MAX_DT_S = 0.1;
export const LOOP_MAX_DT_S = 0.05;
export const RECOVERY_ACCEL_MS2 = 1.0;
export const RECOVERY_GAP_M = 30;
export const MAX_BRAKE_EVENTS = 500;

// Semáforo y Onda Verde (Req. 16, 17). Las duraciones y la posición viven en ROAD_CONTEXT.signal.
export const USER_CAR_ID = 'c02'; // Honda Fit azul, Auto_Usuario por defecto
export const SIGNAL_STOP_MIN_DECEL_MS2 = 1.5; // Req. 16.3: debajo de esto aún no frena por el rojo
export const SIGNAL_HOLD_Y_M = 199.9; // Req. 3.10: tope en rojo
export const QUEUE_STOPPED_SPEED_MS = 0.5; // líder "detenido en la fila"
export const GREEN_WAVE_MIN_KMH = 10;
export const GREEN_WAVE_MAX_KMH = 60;
export const GREEN_WAVE_GAIN_S = 1.0; // a = -(v - target) / 1.0 s
export const MAX_SIGNAL_MISS_EVENTS = 50;
