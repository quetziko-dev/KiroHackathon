'use client';

import { motion } from 'framer-motion';

import { ROAD_CONTEXT } from '@/lib/shared/roadContext';
import { useTrafficStore } from '@/store/trafficStore';

const LAMPS = [
  { color: 'red', on: '#fb7185', glow: 'rgba(244,63,94,0.9)', cx: 26 },
  { color: 'green', on: '#34d399', glow: 'rgba(16,185,129,0.9)', cx: 66 },
] as const;

export default function TrafficLight() {
  const signal = useTrafficStore((state) => state.signal);
  const phaseS = signal.color === 'green' ? ROAD_CONTEXT.signal.greenS : ROAD_CONTEXT.signal.redS;
  const progress = Math.max(0, Math.min(1, signal.remainingS / phaseS));
  const isGreen = signal.color === 'green';

  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
      aria-label={`Semáforo ${ROAD_CONTEXT.signal.name}: ${isGreen ? 'verde' : 'rojo'}, ${Math.ceil(signal.remainingS)} segundos`}
    >
      <svg viewBox="0 0 92 40" className="h-10 w-[92px]" aria-hidden>
        <defs>
          <linearGradient id="tl-housing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <filter id="tl-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect x={1} y={1} width={90} height={38} rx={19} fill="url(#tl-housing)" stroke="rgba(255,255,255,0.12)" />
        {LAMPS.map((lamp) => {
          const active = lamp.color === signal.color;
          return (
            <g key={lamp.color}>
              <motion.circle
                cx={lamp.cx}
                cy={20}
                r={11}
                fill={lamp.glow}
                filter="url(#tl-glow)"
                animate={{ opacity: active ? 0.85 : 0 }}
                transition={{ duration: 0.35 }}
              />
              <circle cx={lamp.cx} cy={20} r={11} fill="#18181b" stroke="rgba(255,255,255,0.06)" />
              <motion.circle
                cx={lamp.cx}
                cy={20}
                r={9}
                fill={lamp.on}
                animate={{ opacity: active ? 1 : 0.08 }}
                transition={{ duration: 0.35 }}
              />
              <circle cx={lamp.cx - 3} cy={16} r={2.5} fill="white" opacity={active ? 0.5 : 0.05} />
            </g>
          );
        })}
      </svg>

      <div className="min-w-[110px]">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Semáforo</p>
        <p className="text-sm font-semibold text-zinc-100">{ROAD_CONTEXT.signal.name}</p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={isGreen ? 'h-full bg-emerald-400' : 'h-full bg-rose-400'}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.25, ease: 'linear' }}
          />
        </div>
      </div>

      <div className="text-right">
        <p
          className={`font-mono text-3xl font-semibold tabular-nums leading-none ${isGreen ? 'text-emerald-300' : 'text-rose-300'}`}
          style={{ textShadow: isGreen ? '0 0 18px rgba(52,211,153,0.6)' : '0 0 18px rgba(251,113,133,0.6)' }}
        >
          {Math.ceil(signal.remainingS)}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">seg</p>
      </div>
    </div>
  );
}
