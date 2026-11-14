'use client';

import { motion } from 'framer-motion';
import { Activity, Timer, Waves, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { ROAD_CONTEXT } from '@/lib/shared/roadContext';
import { cn } from '@/lib/utils';
import { useTrafficStore } from '@/store/trafficStore';

function Metric({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: ReactNode; hint: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur-md">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {icon}
        {label}
      </p>
      <div className={cn('mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white', tone)}>{value}</div>
      <p className="truncate text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

export default function MetricsGrid() {
  const signal = useTrafficStore((state) => state.signal);
  const hardBrakes = useTrafficStore((state) => state.brakeEvents.length);
  const cars = useTrafficStore((state) => state.world.cars);
  const damperEnabled = useTrafficStore((state) => state.world.damperEnabled);
  const avgKmh = cars.length ? Math.round((cars.reduce((sum, car) => sum + car.speed, 0) / cars.length) * 3.6) : 0;
  const isGreen = signal.color === 'green';

  return (
    <div className="grid grid-cols-2 gap-3">
      <Metric
        icon={<Timer className="size-3" />}
        label="Semáforo"
        value={
          <span className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', isGreen ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-rose-400 shadow-[0_0_10px_#fb7185]')} />
            {Math.ceil(signal.remainingS)}s
          </span>
        }
        hint={`${ROAD_CONTEXT.signal.name} · ${isGreen ? 'verde' : 'rojo'}`}
        tone={isGreen ? 'text-emerald-200' : 'text-rose-200'}
      />
      <Metric
        icon={<Zap className="size-3" />}
        label="Frenados −0.6G"
        value={
          <motion.span key={hardBrakes} initial={{ scale: 1.35, color: '#fb7185' }} animate={{ scale: 1, color: '#ffffff' }} className="inline-block">
            {hardBrakes}
          </motion.span>
        }
        hint="Ondas de choque detectadas"
      />
      <Metric icon={<Activity className="size-3" />} label="Flujo medio" value={`${avgKmh} km/h`} hint={`${cars.length} vehículos en el tramo`} />
      <Metric
        icon={<Waves className="size-3" />}
        label="Amortiguador"
        value={damperEnabled ? 'Activo' : 'Inactivo'}
        hint={damperEnabled ? 'Absorbiendo ondas de choque' : 'Sin intervención'}
        tone={damperEnabled ? 'text-emerald-300' : 'text-zinc-400'}
      />
    </div>
  );
}
