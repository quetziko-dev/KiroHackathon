'use client';

import { motion } from 'framer-motion';
import { Gauge, Navigation, TrendingDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveUserCarId } from '@/lib/physics/signal';
import { useTrafficStore } from '@/store/trafficStore';

const MAX_KMH = 100;
// Arco de 240° (radio 52) para el velocímetro.
const ARC = 'M 24.97 90 A 52 52 0 1 1 115.03 90';

export default function Speedometer() {
  const world = useTrafficStore((state) => state.world);
  const selectedCarId = useTrafficStore((state) => state.selectedCarId);
  const lastMiss = useTrafficStore((state) => state.signalMissEvents.at(-1));

  const userCarId = resolveUserCarId(world, selectedCarId);
  const car = world.cars.find((candidate) => candidate.id === userCarId);
  const control = car ? world.controls[car.id] : undefined;
  const kmh = car ? Math.round(car.speed * 3.6) : 0;
  const greenWave = control?.greenWaveTargetMs != null;
  const suggestedKmh = greenWave
    ? Math.round(control!.greenWaveTargetMs! * 3.6)
    : lastMiss && lastMiss.carId === car?.id
      ? lastMiss.suggestedKmh
      : control
        ? Math.round(control.targetSpeed * 3.6)
        : null;
  const delta = suggestedKmh === null ? 0 : kmh - suggestedKmh;
  const over = delta > 2;
  const braking = (car?.accel ?? 0) <= -3;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Gauge className="size-3.5" /> Velocidad
        </CardTitle>
        {car && (
          <span className="truncate text-xs text-zinc-500">
            {car.description} <span className="font-mono text-zinc-600">· {car.id}</span>
          </span>
        )}
      </CardHeader>

      <CardContent>
        {car ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-end gap-2">
                <span
                  className={`text-8xl font-semibold leading-[0.85] tracking-tighter tabular-nums transition-colors ${
                    braking ? 'text-rose-300' : 'text-white'
                  }`}
                >
                  {kmh}
                </span>
                <span className="pb-2 text-sm font-medium text-zinc-500">km/h</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={over ? 'amber' : 'emerald'} className="px-3 py-1 text-xs">
                  <Navigation /> Sugerida {suggestedKmh ?? '—'} km/h
                </Badge>
                {greenWave && (
                  <Badge variant="cyan" className="px-3 py-1 text-xs">
                    Onda Verde
                  </Badge>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                {over ? (
                  <>
                    <TrendingDown className="size-3.5 text-amber-300" /> Reduce {delta} km/h para fluir sin frenar
                  </>
                ) : (
                  'Ritmo óptimo para el tramo'
                )}
              </p>
            </div>

            <svg viewBox="0 0 140 110" className="w-36 shrink-0" aria-hidden>
              <defs>
                <linearGradient id="speed-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#34d399" />
                  <stop offset="100%" stopColor={over ? '#fbbf24' : '#6ee7b7'} />
                </linearGradient>
              </defs>
              <path d={ARC} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} strokeLinecap="round" />
              <motion.path
                d={ARC}
                fill="none"
                stroke="url(#speed-grad)"
                strokeWidth={9}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.6))' }}
                animate={{ pathLength: Math.min(kmh, MAX_KMH) / MAX_KMH }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
              {suggestedKmh !== null && (
                <g transform={`rotate(${(Math.min(suggestedKmh, MAX_KMH) / MAX_KMH) * 240 - 120} 70 64)`}>
                  <line x1={70} y1={6} x2={70} y2={18} stroke="#fafafa" strokeWidth={2.5} strokeLinecap="round" />
                </g>
              )}
              <text x={70} y={70} textAnchor="middle" className="fill-zinc-500 font-mono" fontSize={9}>
                0 – {MAX_KMH}
              </text>
            </svg>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">— Sin selección —</p>
        )}
      </CardContent>
    </Card>
  );
}
