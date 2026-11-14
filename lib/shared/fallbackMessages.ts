// Todos los Mensaje_Respaldo (Req. 11.6). Usable en cliente y servidor, sin secretos.
import type { BrakeEvent } from '@/lib/physics/types';

import { ROAD_CONTEXT } from './roadContext';

export const FALLBACK_MESSAGES = {
  CONFIG_MISSING: 'Modo sin IA: faltan credenciales de AWS. La simulación sigue funcionando.',
  AUTH_ERROR: 'Modo sin IA: no hay acceso al modelo en AWS Bedrock. Mantén tu distancia y frena con suavidad.',
  QUOTA_EXCEEDED: 'Modo sin IA: se alcanzó el límite de uso del agente. Conserva 8 metros con el auto de enfrente.',
  TIMEOUT: 'Modo sin IA: el agente tardó demasiado. Reduce la velocidad de forma gradual.',
  EMPTY_RESPONSE: 'Modo sin IA: el agente no generó respuesta. Mantén una distancia segura.',
  BEDROCK_ERROR: 'Modo sin IA: el agente no está disponible. Mantén una distancia segura.',
  NETWORK_ERROR: 'Modo sin IA: sin conexión con el agente. Mantén una distancia segura.',
  INVALID_REQUEST: 'No se pudo procesar la solicitud al agente.',
  SNAPSHOT_ERROR: 'No se pudo obtener el contexto del tráfico.',
  VOICE_CAPTURE_ERROR: 'No se pudo capturar el comando de voz. Intenta de nuevo.',
  SIMULATION_ERROR: 'La simulación se detuvo por un error.',
  NO_MESSAGES: 'Aún no hay mensajes.',
  // Plantilla de Semaforo_Perdido (Req. 11.6, 17.9). {signal} y {kmh} se sustituyen en buildSignalMissFallback.
  SIGNAL_MISS:
    'No alcanzas el semáforo de {signal}. Suelta el acelerador y mantén {kmh} km/h para llegar en verde.',
} as const;

/**
 * Mensaje de respaldo local (sin servidor). Con evento y auto existente menciona descripción y carril
 * (lane + 1); sin evento o con auto inexistente devuelve el mensaje genérico.
 */
export function buildLocalFallback(
  lastEvent: BrakeEvent | undefined,
  carsById: Record<string, { description: string }>,
): string {
  const car = lastEvent ? carsById[lastEvent.carId] : undefined;
  if (!lastEvent || !car) return FALLBACK_MESSAGES.NETWORK_ERROR;
  return `Modo sin IA: ${car.description} frenó de golpe en el carril ${lastEvent.lane + 1}. Mantén tu distancia y frena con suavidad.`;
}

/**
 * Mensaje de respaldo para Semaforo_Perdido (Req. 17.9). Sin prefijo "Modo sin IA:" porque el texto es exacto.
 * buildSignalMissFallback(20) === 'No alcanzas el semáforo de Eje Central. Suelta el acelerador y mantén 20 km/h para llegar en verde.'
 */
export function buildSignalMissFallback(kmh: number): string {
  return FALLBACK_MESSAGES.SIGNAL_MISS.replace('{signal}', ROAD_CONTEXT.signal.name).replace(
    '{kmh}',
    String(kmh),
  );
}
