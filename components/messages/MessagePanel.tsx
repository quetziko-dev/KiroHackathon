'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FALLBACK_MESSAGES } from '@/lib/shared/fallbackMessages';
import { useTrafficStore } from '@/store/trafficStore';

const SOURCE_LABEL = {
  bedrock: 'Generado por Amazon Bedrock',
  fallback: 'Respaldo determinista',
  local: 'Aviso local',
} as const;

export default function MessagePanel() {
  const lastMessage = useTrafficStore((state) => state.lastMessage);
  const awaitingAgent = useTrafficStore((state) => state.awaitingAgent);
  const simulationError = useTrafficStore((state) => state.simulationError);

  return (
    <Card className="relative overflow-hidden" aria-live="polite">
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <CardHeader>
        <CardTitle>
          <Sparkles className="size-3.5 text-emerald-300" /> Indicación del copiloto
        </CardTitle>
        {lastMessage && <span className="text-[11px] text-zinc-600">{SOURCE_LABEL[lastMessage.source]}</span>}
      </CardHeader>
      <CardContent className="min-h-20">
        <AnimatePresence mode="wait">
          {awaitingAgent ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 py-3"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
              <span className="ml-2 text-sm text-zinc-500">Analizando el tramo…</span>
            </motion.div>
          ) : (
            <motion.p
              key={lastMessage?.text ?? 'empty'}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className={`text-lg leading-snug tracking-tight ${lastMessage ? 'text-zinc-100' : 'text-zinc-600'}`}
            >
              {lastMessage?.text ?? FALLBACK_MESSAGES.NO_MESSAGES}
            </motion.p>
          )}
        </AnimatePresence>
        {simulationError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-300">
            <CircleAlert className="size-4" /> {simulationError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
