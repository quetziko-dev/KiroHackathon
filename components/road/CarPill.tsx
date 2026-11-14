'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { ROAD_LENGTH_M } from '@/lib/physics/constants';
import type { Automovil } from '@/lib/physics/types';
import { cn } from '@/lib/utils';

export type CarKind = 'user' | 'connected' | 'ghost';

const SPRING = { stiffness: 260, damping: 32, mass: 0.6 };

const STYLES: Record<CarKind, { body: string; glow: string; label: string }> = {
  user: {
    body: 'border-emerald-200/80 bg-gradient-to-b from-emerald-300 to-emerald-500',
    glow: '0 0 18px rgba(52,211,153,0.85), 0 0 42px rgba(16,185,129,0.35)',
    label: 'text-emerald-300',
  },
  connected: {
    body: 'border-cyan-300/60 bg-gradient-to-b from-cyan-400/40 to-cyan-600/30',
    glow: '0 0 12px rgba(34,211,238,0.35)',
    label: 'text-cyan-300/70',
  },
  ghost: {
    body: 'border-rose-500 bg-gradient-to-b from-zinc-700 to-zinc-900',
    glow: '0 0 14px rgba(244,63,94,0.55)',
    label: 'text-rose-300',
  },
};

export default function CarPill({
  car,
  kind,
  selected,
  onSelect,
}: {
  car: Automovil;
  kind: CarKind;
  selected: boolean;
  onSelect(id: string): void;
}) {
  const pct = (car.y / ROAD_LENGTH_M) * 100;
  const spring = useSpring(pct, SPRING);
  const previous = useRef(pct);

  useEffect(() => {
    // Al dar la vuelta (200 m → 0 m) saltamos sin animar para que el auto no "regrese" por la vía.
    if (Math.abs(pct - previous.current) > 50) spring.jump(pct);
    else spring.set(pct);
    previous.current = pct;
  }, [pct, spring]);

  const bottom = useTransform(spring, (value) => `${value}%`);
  const braking = car.accel <= -3;
  const style = STYLES[kind];
  const kmh = Math.round(car.speed * 3.6);

  return (
    <motion.button
      type="button"
      onPointerDown={() => onSelect(car.id)}
      aria-label={`${car.id} ${car.description}${kind === 'ghost' ? ', vehículo sin conexión' : ''}, ${kmh} km/h`}
      className="group absolute z-10 -translate-x-1/2 translate-y-1/2 cursor-pointer outline-none"
      style={{ bottom, left: `${((car.lane + 0.5) / 3) * 100}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {kind === 'user' && (
        <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-400/70" />
      )}
      {selected && (
        <span className="pointer-events-none absolute -inset-1.5 rounded-full border border-white/70" />
      )}

      <span
        className={cn('relative block h-9 w-[22px] rounded-full border transition-shadow duration-200', style.body)}
        style={{ boxShadow: braking ? `${style.glow}, 0 10px 22px rgba(244,63,94,0.9)` : style.glow }}
      >
        {/* faros */}
        <span className="absolute left-1/2 top-1 flex -translate-x-1/2 gap-1">
          <span className="size-1 rounded-full bg-white/90" />
          <span className="size-1 rounded-full bg-white/90" />
        </span>
        {/* parabrisas */}
        <span className="absolute inset-x-1 top-2.5 h-2 rounded-sm bg-black/35" />
        {/* luces de freno */}
        <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
          <span className={cn('h-1 w-1.5 rounded-full transition-colors', braking ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]' : 'bg-rose-900/80')} />
          <span className={cn('h-1 w-1.5 rounded-full transition-colors', braking ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]' : 'bg-rose-900/80')} />
        </span>
        {kind === 'ghost' && (
          <TriangleAlert className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 text-rose-400" />
        )}
      </span>

      <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-left leading-tight">
        <span className={cn('block font-mono text-[10px] font-semibold', style.label)}>
          {kind === 'user' ? `TÚ · ${car.id}` : car.id}
        </span>
        <span className="block font-mono text-[9px] tabular-nums text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
          {kmh} km/h
        </span>
        {braking && <span className="block font-mono text-[9px] font-bold text-rose-400">−0.6G</span>}
      </span>
    </motion.button>
  );
}
