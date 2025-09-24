import { useMemo } from 'react';
import { AppShell } from './components/AppShell';
import { SocialMediaIntel } from './components/SocialMediaIntel';
import { ReconPanel } from './components/ReconPanel';
import { FusionWorkbench } from './components/FusionWorkbench';
import { ReportComposer } from './components/ReportComposer';
import { ResourceBoard } from './components/ResourceBoard';
import { ActivityFeed } from './components/ActivityFeed';
import { BreachIntel } from './components/BreachIntel';
import { useIntelLog } from './hooks/useIntelLog';
import type { IntelContribution } from './types';
import { motion } from 'framer-motion';

const secondaryGradient =
  'absolute inset-0 -z-10 overflow-hidden rounded-[2.75rem] before:absolute before:inset-[-40%] before:animate-[spin_18s_linear_infinite] before:bg-[conic-gradient(from_120deg,rgba(255,255,255,0.3),rgba(116,130,255,0.05),rgba(255,255,255,0.3))] before:opacity-40';

const App = () => {
  const { entries, register, remove } = useIntelLog();

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  );

  const handleIntel = (intel: IntelContribution) => {
    register(intel);
  };

  return (
    <AppShell
      title="Bleeding-edge OSINT orchestration"
      subtitle="Fuse persona intelligence, infrastructure recon, and breach telemetry into a living intelligence picture. Viveye orchestrates high-confidence signals with cinematic clarity."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative">
            <div className={secondaryGradient} />
            <SocialMediaIntel onIntelCapture={handleIntel} />
          </div>
          <BreachIntel onIntelCapture={handleIntel} />
        </div>
        <ReconPanel onIntelCapture={handleIntel} />
        <ReportComposer contributions={sortedEntries} />
      </div>
      <div className="space-y-8">
        <FusionWorkbench contributions={sortedEntries} />
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className={secondaryGradient} />
          <ActivityFeed contributions={sortedEntries} onRemove={remove} />
        </motion.div>
        <ResourceBoard />
      </div>
    </AppShell>
  );
};

export default App;
