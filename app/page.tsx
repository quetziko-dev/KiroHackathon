'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

import ControlsPanel from '@/components/controls/ControlsPanel';
import CopilotHeader from '@/components/dashboard/CopilotHeader';
import MetricsGrid from '@/components/dashboard/MetricsGrid';
import MessagePanel from '@/components/messages/MessagePanel';
import LaneCanvas from '@/components/road/LaneCanvas';
import Speedometer from '@/components/speedometer/Speedometer';
import MicButton from '@/components/voice/MicButton';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';
import { useTrafficStore } from '@/store/trafficStore';

const PANELS = [CopilotHeader, Speedometer, MessagePanel, MetricsGrid, ControlsPanel, MicButton];

export default function Home() {
  useSimulationLoop();

  useEffect(() => {
    useTrafficStore.getState().setRunning(true);
  }, []);

  return (
    <main className="relative flex h-dvh w-full flex-col gap-4 overflow-hidden bg-zinc-950 p-4 md:flex-row">
      {/* Luz ambiental */}
      <div className="pointer-events-none absolute -left-40 top-0 size-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 size-[420px] rounded-full bg-cyan-500/5 blur-[120px]" />

      <motion.section
        className="relative h-[60dvh] md:h-full md:w-3/5"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <LaneCanvas />
      </motion.section>

      <aside className="scrollbar-thin relative flex flex-1 flex-col gap-4 overflow-y-auto pr-1 md:w-2/5">
        {PANELS.map((Panel, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.07, ease: 'easeOut' }}
          >
            <Panel />
          </motion.div>
        ))}
      </aside>
    </main>
  );
}
