'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Square } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { askAgent } from '@/lib/agent/askAgent';
import { FALLBACK_MESSAGES } from '@/lib/shared/fallbackMessages';
import { cn } from '@/lib/utils';
import { getRecognitionCtor, startListening } from '@/lib/voice/recognition';
import { useTrafficStore } from '@/store/trafficStore';

const VOICE_COMMANDS = [
  'Activa el amortiguador',
  'Desactiva el amortiguador',
  '¿Cómo está el tráfico en Viaducto?',
  '¿A qué velocidad llego en verde a Eje Central?',
];

const noop = () => () => {};

export default function MicButton() {
  const supported = useSyncExternalStore(noop, () => getRecognitionCtor() !== null, () => false);
  const pendingTrigger = useTrafficStore((state) => state.pendingTrigger);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const session = useRef<{ stop(): void } | null>(null);

  const send = (text: string) => {
    setHeard(text);
    void askAgent(text, 'voice');
  };

  const toggle = () => {
    if (listening) {
      session.current?.stop();
      return;
    }
    session.current = startListening({
      onFinal: send,
      onFail: () => useTrafficStore.getState().setLocalMessage(FALLBACK_MESSAGES.VOICE_CAPTURE_ERROR, false),
      onEnd: () => {
        setListening(false);
        session.current = null;
      },
    });
    setListening(session.current !== null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Mic className="size-3.5" /> Comandos de voz
        </CardTitle>
        <span className="text-[11px] text-zinc-600">Web Speech API · es-MX</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            disabled={!supported}
            aria-label={listening ? 'Detener escucha' : 'Hablar con el copiloto'}
            className={cn(
              'relative flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40',
              listening
                ? 'border-rose-400/60 bg-rose-500/15 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]',
            )}
          >
            {listening && (
              <>
                <span className="pulse-ring absolute inset-0 rounded-full border border-rose-400/60" />
                <span className="pulse-ring absolute inset-0 rounded-full border border-rose-400/40 [animation-delay:0.5s]" />
              </>
            )}
            {!supported ? <MicOff className="size-5" /> : listening ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">
              {!supported ? 'Voz no disponible' : listening ? 'Escuchando…' : 'Habla con tu copiloto'}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={heard ?? 'hint'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="truncate text-xs text-zinc-500"
              >
                {heard ? `“${heard}”` : supported ? 'Toca el micrófono o elige un comando' : 'Usa Chrome o Edge para dictar'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VOICE_COMMANDS.map((command) => (
            <button
              key={command}
              type="button"
              disabled={pendingTrigger !== null}
              onClick={() => send(command)}
              className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-40"
            >
              {command}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
