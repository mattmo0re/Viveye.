import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { ActivitySquare } from 'lucide-react';

interface ActivityFeedProps {
  contributions: IntelContribution[];
  onRemove: (id: string) => void;
}

export const ActivityFeed = ({ contributions, onRemove }: ActivityFeedProps) => (
  <SectionCard
    title="Activity Ledger"
    description="Chronological ledger of every captured signal. Control retention and review raw payloads."
    icon={<ActivitySquare className="h-6 w-6" />}
  >
    {contributions.length === 0 ? (
      <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300/80">
        Interact with the Persona or Infrastructure modules to start building your ledger.
      </p>
    ) : (
      <ul className="space-y-3">
        {contributions.map((item) => {
          let payloadString: string | null = null;
          if (item.payload !== undefined && item.payload !== null) {
            try {
              payloadString = JSON.stringify(item.payload, null, 2);
            } catch (error) {
              payloadString = String(error);
            }
          }

          return (
            <li
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200/90 shadow-inner"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-slate-100">{item.headline}</p>
                  <p className="mt-1 text-xs text-slate-300/70">{item.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    {new Date(item.createdAt).toLocaleString()} • {item.source}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-200/70 transition hover:border-white/30 hover:bg-white/20"
                >
                  Purge
                </button>
              </div>
              {payloadString && (
                <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-slate-300/80">
                  {payloadString}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </SectionCard>
);
