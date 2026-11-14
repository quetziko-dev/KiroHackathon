import 'server-only';

import type { AgentAction, AgentTrigger, TrafficSnapshot } from '@/lib/shared/contracts';
import { buildSignalMissFallback } from '@/lib/shared/fallbackMessages';
import { nearestRamp, ROAD_CONTEXT } from '@/lib/shared/roadContext';

export const SYSTEM_PROMPT = `Eres el copiloto del Centro de Movilidad de la CDMX y monitoreas ${ROAD_CONTEXT.name}. Habla en español de México con tono operativo, breve y calmado, como un aviso de tráfico.
Para una solicitud normal, escribe como máximo 3 oraciones y 300 caracteres: primero indica qué se detectó y en qué incorporación usando nearestRamp; después explica qué hace el sistema, por ejemplo "Amortiguando onda de choque"; finalmente da una instrucción concreta usando suggestedSpeedKmh en km/h.
Menciona los automóviles normales únicamente por su description, nunca por su id. Describe cualquier Auto_Fantasma como "vehículo sin conexión".
Responde solamente JSON con esta forma exacta: {"message": string, "action": "enable_damper" | "disable_damper" | null}. Usa action únicamente cuando el comando de voz pida activar o desactivar el amortiguador.
Ejemplo de estilo: {"message":"Vehículo sin conexión detectado en la incorporación de Río Becerra. Amortiguando onda de choque. Reduce a 35 km/h para evitar frenado total en Viaducto.","action":null}
Si el contexto contiene "TRIGGER: signal_miss", ignora la estructura normal. Nombra el semáforo, di que el conductor no alcanza a pasar, pide que suelte el acelerador, usa exactamente la velocidad sugerida recibida y menciona el ahorro de gasolina. No calcules, redondees ni sustituyas ningún número. En este caso action debe ser null. Ejemplo: {"message":"No alcanzas el semáforo de Eje Central. Suelta el acelerador y mantén 20 km/h para llegar justo cuando cambie a verde, ahorrando gasolina.","action":null}`;

function suggestedSpeedKmh(snapshot: TrafficSnapshot): number {
  const latestBrake = snapshot.recentHardBrakes[0];
  if (!latestBrake) return 60;

  const laneSpeeds = snapshot.cars
    .filter((car) => car.lane === latestBrake.lane && Number.isFinite(car.speedKmh))
    .map((car) => car.speedKmh);
  if (laneSpeeds.length === 0) return 60;

  const roundedDown = Math.floor(Math.min(...laneSpeeds) / 5) * 5;
  return Math.min(60, Math.max(20, roundedDown));
}

export function buildUserText(
  snapshot: TrafficSnapshot,
  command?: string,
  trigger?: AgentTrigger,
): string {
  const latestBrake = snapshot.recentHardBrakes[0];
  const ramp = latestBrake ? nearestRamp(latestBrake.y).name : null;
  const effectiveTrigger = trigger === 'signal_miss' && snapshot.lastSignalMiss === null ? 'manual' : trigger;
  const context = {
    roadName: ROAD_CONTEXT.name,
    nearestRamp: ramp,
    suggestedSpeedKmh: suggestedSpeedKmh(snapshot),
    signal: snapshot.signal,
    trigger: effectiveTrigger ?? 'manual',
  };

  const sections = [
    'SNAPSHOT_TRAFICO:',
    JSON.stringify(snapshot),
    'CONTEXTO_DETERMINISTA:',
    JSON.stringify(context),
  ];

  if (command !== undefined) {
    sections.push('COMANDO_DE_VOZ:', command);
  }

  const miss = effectiveTrigger === 'signal_miss' ? snapshot.lastSignalMiss : null;
  if (miss) {
    const car = snapshot.cars.find((candidate) => candidate.id === miss.carId);
    sections.push(
      'TRIGGER: signal_miss',
      `Semáforo: ${snapshot.signal.name}`,
      `Auto: ${car?.description ?? 'tu auto'}`,
      `TTA: ${miss.ttaS} s · verde restante: ${miss.greenRemainingS} s`,
      `Velocidad sugerida EXACTA: ${miss.suggestedKmh} km/h`,
      `Redacta la instrucción de Semaforo_Perdido. Usa exactamente "${miss.suggestedKmh} km/h". No calcules otros números.`,
    );
  }

  return sections.join('\n');
}

function firstJsonObject(raw: string): unknown | undefined {
  const start = raw.indexOf('{');
  if (start < 0) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, index + 1));
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

function isAgentAction(value: unknown): value is AgentAction {
  return value === 'enable_damper' || value === 'disable_damper';
}

function trimMessage(message: string): string {
  const sentences = message.trim().match(/[^.!?]+(?:[.!?]+|$)/g);
  let trimmed = (sentences?.slice(0, 3).join('') ?? message.trim()).trim();
  if (trimmed.length <= 300) return trimmed;

  const candidate = trimmed.slice(0, 300);
  const lastSpace = candidate.lastIndexOf(' ');
  trimmed = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
  return trimmed.trimEnd();
}

export function parseModelOutput(
  raw: string,
  command?: string,
): { message: string; action?: AgentAction } {
  const parsed = firstJsonObject(raw);
  const parsedRecord =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  const parsedMessage =
    parsedRecord &&
    typeof parsedRecord.message === 'string' &&
    parsedRecord.message.trim().length > 0
      ? parsedRecord.message
      : undefined;
  const validJson = parsedMessage !== undefined;

  const message = trimMessage(parsedMessage ?? raw);
  let action: AgentAction | undefined;

  if (validJson && parsedRecord && isAgentAction(parsedRecord.action)) {
    action = parsedRecord.action;
  } else if (!validJson && command) {
    if (/\b(desactiva|apaga)\w*\b.*amortigu/i.test(command)) action = 'disable_damper';
    else if (/\b(activa|enciende|prende)\w*\b.*amortigu/i.test(command)) action = 'enable_damper';
  }

  return action ? { message, action } : { message };
}

export function enforceSignalMissMessage(message: string, kmh: number): string {
  if (message.includes(`${kmh} km/h`)) return message;
  return `${buildSignalMissFallback(kmh).replace(/\.$/, '')}, ahorrando gasolina.`;
}
