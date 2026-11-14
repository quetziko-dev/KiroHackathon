'use client';

import { Ghost, LoaderCircle, Pause, Play, RotateCcw, Sparkles, TrafficCone, Waves } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { askAgent } from '@/lib/agent/askAgent';
import { cn } from '@/lib/utils';
import { useTrafficStore } from '@/store/trafficStore';

function ScenarioButton({
  icon,
  title,
  description,
  accent,
  loading,
  loadingText,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: 'rose' | 'amber';
  loading: boolean;
  loadingText: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white/[0.02] p-3 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]',
        accent === 'rose'
          ? 'border-rose-400/20 hover:border-rose-400/50 hover:shadow-[0_0_24px_rgba(244,63,94,0.15)]'
          : 'border-amber-400/20 hover:border-amber-400/50 hover:shadow-[0_0_24px_rgba(251,191,36,0.15)]',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg border',
          accent === 'rose' ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300',
        )}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="block truncate text-xs text-zinc-500">{loading ? loadingText : description}</span>
      </span>
    </button>
  );
}

export default function ControlsPanel() {
  const status = useTrafficStore((state) => state.status);
  const damperEnabled = useTrafficStore((state) => state.world.damperEnabled);
  const pendingTrigger = useTrafficStore((state) => state.pendingTrigger);
  const timeScale = useTrafficStore((state) => state.timeScale);
  const ghostActive = useTrafficStore((state) =>
    Object.values(state.world.controls).some(
      (control) => control.isGhost && (control.hardBrakeRemaining > 0 || control.scheduledBrakeAt !== null),
    ),
  );
  const { toggleRunning, injectChaos, forceSignalMiss, reset, setDamper, setTimeScale } = useTrafficStore.getState();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escenarios de demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <ScenarioButton
            icon={<Ghost className="size-5" />}
            title="Simular Coche Fantasma (-0.6G)"
            description="Frenado brusco sin conexión"
            accent="rose"
            loading={ghostActive}
            loadingText="Frenando a −0.6G…"
            onClick={injectChaos}
          />
          <ScenarioButton
            icon={<TrafficCone className="size-5" />}
            title="Semaforo_Perdido"
            description="Onda Verde en Eje Central"
            accent="amber"
            loading={pendingTrigger === 'signal_miss'}
            loadingText="Calculando velocidad…"
            onClick={forceSignalMiss}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleRunning}>
            {status === 'running' ? <Pause /> : <Play />}
            {status === 'running' ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw /> Reiniciar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDamper(!damperEnabled)}
            className={cn(damperEnabled && 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15')}
          >
            <Waves /> Amortiguador {damperEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pendingTrigger !== null}
            onClick={() => void askAgent(undefined, 'manual')}
            className="ml-auto border-emerald-400/30 text-emerald-200 hover:border-emerald-400/60"
          >
            {pendingTrigger === 'manual' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            Pedir asistencia
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="shrink-0 text-xs text-zinc-500">Velocidad de simulación</span>
          <Slider min={0.25} max={2} step={0.25} value={[timeScale]} onValueChange={([value]) => setTimeScale(value)} />
          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-300">{timeScale}x</span>
        </div>
      </CardContent>
    </Card>
  );
}
