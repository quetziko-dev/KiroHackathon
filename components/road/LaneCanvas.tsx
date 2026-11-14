'use client';

import { AnimatePresence } from 'framer-motion';
import { Navigation, Radio } from 'lucide-react';

import { ROAD_LENGTH_M } from '@/lib/physics/constants';
import { resolveUserCarId } from '@/lib/physics/signal';
import { ROAD_CONTEXT } from '@/lib/shared/roadContext';
import { useTrafficStore } from '@/store/trafficStore';

import CarPill, { type CarKind } from './CarPill';
import TrafficLight from './TrafficLight';

const RULER = [0, 50, 100, 150, 200];

const LEGEND: { kind: CarKind; label: string; dot: string }[] = [
  { kind: 'user', label: 'Tú', dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]' },
  { kind: 'connected', label: 'Conectado', dot: 'bg-cyan-400/70 shadow-[0_0_8px_#22d3ee]' },
  { kind: 'ghost', label: 'Fantasma', dot: 'bg-zinc-700 ring-1 ring-rose-500' },
];

export default function LaneCanvas() {
  const world = useTrafficStore((state) => state.world);
  const selectedCarId = useTrafficStore((state) => state.selectedCarId);
  const selectCar = useTrafficStore((state) => state.selectCar);
  const status = useTrafficStore((state) => state.status);
  const userCarId = resolveUserCarId(world, selectedCarId);

  return (
    <div className="radar-grid relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10">
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400/80">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Radar de vía · en vivo
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{ROAD_CONTEXT.name}</h1>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Navigation className="size-3" /> {ROAD_CONTEXT.direction} · {ROAD_CONTEXT.segment}
          </p>
        </div>
        <TrafficLight />
      </header>

      <div className="relative mx-5 mb-4 mt-4 flex flex-1 gap-3" data-paused={status !== 'running'}>
        {/* Incorporaciones (gutter izquierdo) */}
        <div className="relative w-24 shrink-0">
          {ROAD_CONTEXT.ramps.map((ramp) => (
            <div
              key={ramp.name}
              className="absolute right-0 flex translate-y-1/2 items-center"
              style={{ bottom: `${(ramp.y / ROAD_LENGTH_M) * 100}%` }}
            >
              <span className="rounded-md border border-emerald-400/20 bg-emerald-400/5 px-1.5 py-0.5 text-right text-[10px] font-medium leading-tight text-emerald-300/90 backdrop-blur-sm">
                {ramp.name}
              </span>
            </div>
          ))}
        </div>

        {/* Asfalto */}
        <div className="asphalt relative flex-1 overflow-hidden rounded-2xl border border-white/10 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-y-0 left-2 w-px bg-white/25" />
          <div className="absolute inset-y-0 right-2 w-px bg-white/25" />
          {[1, 2].map((index) => (
            <div
              key={index}
              className="lane-divider absolute inset-y-0 w-[2px] -translate-x-1/2"
              style={{ left: `${(index / 3) * 100}%` }}
            />
          ))}
          {/* Línea de alto en Eje Central */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent" />
          {ROAD_CONTEXT.ramps.map((ramp) => (
            <div
              key={ramp.name}
              className="absolute inset-x-0 h-px bg-gradient-to-r from-emerald-400/50 via-emerald-400/10 to-transparent"
              style={{ bottom: `${(ramp.y / ROAD_LENGTH_M) * 100}%` }}
            />
          ))}

          <AnimatePresence>
            {world.cars.map((car) => (
              <CarPill
                key={car.id}
                car={car}
                kind={car.id === userCarId ? 'user' : world.controls[car.id]?.isGhost ? 'ghost' : 'connected'}
                selected={car.id === selectedCarId}
                onSelect={selectCar}
              />
            ))}
          </AnimatePresence>

          {world.damperEnabled && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(16,185,129,0.15)] ring-1 ring-inset ring-emerald-400/30" />
          )}
        </div>

        {/* Regla de distancia */}
        <div className="relative w-9 shrink-0">
          {RULER.map((m) => (
            <span
              key={m}
              className="absolute left-0 flex translate-y-1/2 items-center gap-1 font-mono text-[10px] tabular-nums text-zinc-600"
              style={{ bottom: `${(m / ROAD_LENGTH_M) * 100}%` }}
            >
              <span className="h-px w-1.5 bg-zinc-600" />
              {m}m
            </span>
          ))}
        </div>
      </div>

      <footer className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-[11px] text-zinc-500">
        <div className="flex items-center gap-4">
          {LEGEND.map((item) => (
            <span key={item.kind} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${item.dot}`} />
              {item.label}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5">
          <Radio className="size-3" /> {world.cars.length} vehículos · toca uno para seguirlo
        </span>
      </footer>
    </div>
  );
}
