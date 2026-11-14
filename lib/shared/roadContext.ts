// Contexto vial CDMX compartido (cliente y servidor). No contiene secretos.

export interface Ramp {
  name: string;
  y: number; // y en metros dentro del tramo de 200 m
}

export const ROAD_CONTEXT = {
  name: 'Viaducto Miguel Alemán',
  direction: 'Sentido oriente → poniente',
  segment: 'Tramo Río Becerra – Av. Revolución',
  ramps: [
    { name: 'Río Becerra', y: 40 },
    { name: 'Av. Patriotismo', y: 110 },
    { name: 'Av. Revolución', y: 170 },
  ] as Ramp[],
  signal: { name: 'Eje Central', y: 200, greenS: 15, redS: 15 },
} as const;

/** La incorporación con menor |ramp.y - y|. */
export function nearestRamp(y: number): Ramp {
  let best = ROAD_CONTEXT.ramps[0];
  for (const ramp of ROAD_CONTEXT.ramps) {
    if (Math.abs(ramp.y - y) < Math.abs(best.y - y)) best = ramp;
  }
  return best;
}
