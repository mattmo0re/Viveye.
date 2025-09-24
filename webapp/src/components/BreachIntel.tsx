import { useEffect, useState } from 'react';
import { fetchSampleBreaches, BreachItem } from '../lib/api';
import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { ShieldAlert } from 'lucide-react';

interface BreachIntelProps {
  onIntelCapture: (intel: IntelContribution) => void;
}

export const BreachIntel = ({ onIntelCapture }: BreachIntelProps) => {
  const [breaches, setBreaches] = useState<BreachItem[]>([]);

  useEffect(() => {
    fetchSampleBreaches().then(setBreaches);
  }, []);

  const handleCapture = (breach: BreachItem) => {
    onIntelCapture({
      id: `breach-${breach.Name}`,
      category: 'breach',
      headline: `Breach context: ${breach.Name}`,
      summary: `${breach.PwnCount.toLocaleString()} records exposed • ${breach.Domain}`,
      createdAt: new Date().toISOString(),
      confidence: 'medium',
      source: 'HIBP curated dataset',
      payload: breach,
    });
  };

  return (
    <SectionCard
      title="Exposure Intelligence"
      description="Cross-reference large scale breach corpuses to quantify credential reuse risk."
      icon={<ShieldAlert className="h-6 w-6" />}
    >
      <ul className="space-y-3">
        {breaches.map((breach) => (
          <li
            key={breach.Name}
            className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200/90 shadow-inner"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-100">{breach.Name}</p>
                <p className="mt-1 text-xs text-slate-300/70">{breach.Description}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  {breach.BreachDate} • {breach.DataClasses.join(', ')}
                </p>
              </div>
              <button
                onClick={() => handleCapture(breach)}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-200/70 transition hover:border-white/30 hover:bg-white/20"
              >
                Ingest
              </button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
};
