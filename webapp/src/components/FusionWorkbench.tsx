import { useMemo } from 'react';
import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { Brain } from 'lucide-react';

interface FusionWorkbenchProps {
  contributions: IntelContribution[];
}

const formatSummary = (contrib: IntelContribution) => {
  const timestamp = new Date(contrib.createdAt).toLocaleTimeString();
  return `${timestamp} · ${contrib.headline}`;
};

export const FusionWorkbench = ({ contributions }: FusionWorkbenchProps) => {
  const curatedSignals = useMemo(() => {
    if (!contributions.length) return [];
    const sorted = [...contributions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.slice(0, 6);
  }, [contributions]);

  const heatScore = useMemo(() => {
    if (!contributions.length) return 0;
    const highConfidence = contributions.filter((c) => c.confidence === 'high').length;
    return Math.min(100, Math.round((highConfidence / contributions.length) * 100));
  }, [contributions]);

  return (
    <SectionCard
      title="Fusion Workbench"
      description="Autonomously correlate captured intel into an analyst-ready briefing stream."
      icon={<Brain className="h-6 w-6" />}
      className="lg:row-span-2"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Signal Density</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border border-white/20 bg-gradient-to-br from-white/20 via-white/5 to-white/10 shadow-[0_0_35px_rgba(255,255,255,0.18)]" />
              <div
                className="absolute inset-2 rounded-full border border-white/10 bg-gradient-to-br from-slate-50 via-white/30 to-slate-200/20"
                style={{ opacity: 0.6 + heatScore / 200 }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-slate-900">
                {heatScore}
              </span>
            </div>
            <div className="space-y-2 text-xs text-slate-300/80">
              <p>
                Confidence-weighted heat across the latest captures. Values above 70 signal strong corroboration
                and warrant deeper investigation.
              </p>
              <p className="text-slate-200/90">
                {contributions.length} entries • {contributions.filter((item) => item.payload).length} enriched payloads
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Curated Signals</p>
          {curatedSignals.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300/70">
              Capture social or infrastructure intelligence to generate fusion insights.
            </p>
          ) : (
            <ul className="space-y-3">
              {curatedSignals.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200/90 shadow-inner"
                >
                  <p className="font-semibold text-slate-100">{item.headline}</p>
                  <p className="mt-1 text-xs text-slate-300/70">{item.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    {formatSummary(item)} • {item.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
