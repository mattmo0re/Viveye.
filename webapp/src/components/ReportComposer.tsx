import { useMemo, useState } from 'react';
import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { FileDown } from 'lucide-react';

interface ReportComposerProps {
  contributions: IntelContribution[];
}

const buildNarrative = (contributions: IntelContribution[]) => {
  if (contributions.length === 0) {
    return 'Awaiting signals. Begin capturing persona or infrastructure intelligence to auto-build narrative context.';
  }

  const persona = contributions.filter((item) => item.category === 'social');
  const infrastructure = contributions.filter((item) => item.category === 'infrastructure');
  const breaches = contributions.filter((item) => item.category === 'breach');

  const lines: string[] = [];
  if (persona.length) {
    const latest = persona[0];
    lines.push(
      `Persona reconnaissance anchored around ${latest.headline.toLowerCase()} with ${persona.length} corroborated social nodes.`,
    );
  }
  if (infrastructure.length) {
    lines.push(
      `Infrastructure sweep mapped ${infrastructure.length} assets with focus on ${
        infrastructure[0].summary
      } to support attack surface pivoting.`,
    );
  }
  if (breaches.length) {
    lines.push(`${breaches.length} credential exposure events integrated for credential stuffing risk scoring.`);
  }
  lines.push('Fusion workbench ready for escalation with automated prioritization based on confidence ratios.');
  return lines.join(' ');
};

export const ReportComposer = ({ contributions }: ReportComposerProps) => {
  const [isDownloaded, setIsDownloaded] = useState(false);

  const narrative = useMemo(() => buildNarrative(contributions), [contributions]);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(contributions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viveye-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  return (
    <SectionCard
      title="Report Composer"
      description="Generate export-ready JSON and executive narrative in real time for your investigation."
      icon={<FileDown className="h-6 w-6" />}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Narrative Draft</p>
        <p className="mt-3 text-sm text-slate-200/90">{narrative}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownload}
          className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-white/15 via-white/40 to-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.18)] transition hover:scale-[1.02]"
        >
          Export JSON
          <span className="absolute inset-0 -translate-x-full bg-white/30 transition group-hover:translate-x-0" />
        </button>
        {isDownloaded && <span className="text-xs text-emerald-300/80">Report exported.</span>}
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
          {contributions.length} signals integrated
        </span>
      </div>
    </SectionCard>
  );
};
