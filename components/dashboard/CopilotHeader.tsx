'use client';

import { Bot, CloudOff, LoaderCircle, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useTrafficStore } from '@/store/trafficStore';

export default function CopilotHeader() {
  const awaitingAgent = useTrafficStore((state) => state.awaitingAgent);
  const noAiMode = useTrafficStore((state) => state.noAiMode);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex size-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
          <Bot className="size-5 text-emerald-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">Copiloto Micro-Flujo</h2>
          <p className="text-xs text-zinc-500">Asistente de Movilidad CDMX · Amazon Bedrock</p>
        </div>
      </div>
      {awaitingAgent ? (
        <Badge variant="amber">
          <LoaderCircle className="animate-spin" /> Analizando
        </Badge>
      ) : noAiMode ? (
        <Badge variant="danger">
          <CloudOff /> Modo sin IA
        </Badge>
      ) : (
        <Badge variant="emerald">
          <ShieldCheck /> En línea
        </Badge>
      )}
    </div>
  );
}
