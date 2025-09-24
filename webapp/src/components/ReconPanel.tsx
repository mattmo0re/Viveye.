import { FormEvent, useRef, useState } from 'react';
import { DnsResponse, IpIntel, resolveDomain, lookupIp } from '../lib/api';
import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { Radar } from 'lucide-react';

interface ReconPanelProps {
  onIntelCapture: (intel: IntelContribution) => void;
}

interface ReconState {
  dns?: DnsResponse | null;
  ip?: IpIntel | null;
  error?: string | null;
  status: 'idle' | 'loading' | 'complete';
}

export const ReconPanel = ({ onIntelCapture }: ReconPanelProps) => {
  const [domainTarget, setDomainTarget] = useState('');
  const [ipTarget, setIpTarget] = useState('');
  const [state, setState] = useState<ReconState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const handleDomainLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!domainTarget.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setState({ status: 'loading' });
      const dns = await resolveDomain(domainTarget.trim(), controller.signal);
      setState({ status: 'complete', dns });
      onIntelCapture({
        id: `domain-${domainTarget}`,
        category: 'infrastructure',
        headline: `DNS footprint resolved for ${domainTarget}`,
        summary: `${dns.Answer?.length ?? 0} records discovered via Google DNS resolver`,
        createdAt: new Date().toISOString(),
        confidence: 'medium',
        source: 'Google DNS over HTTPS',
        payload: { dns },
      });
    } catch (error) {
      setState({ status: 'complete', error: error instanceof Error ? error.message : 'Unexpected error' });
    }
  };

  const handleIpLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ipTarget.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setState({ status: 'loading' });
      const ip = await lookupIp(ipTarget.trim(), controller.signal);
      setState({ status: 'complete', ip });
      onIntelCapture({
        id: `ip-${ip.query}`,
        category: 'infrastructure',
        headline: `Network telemetry enriched for ${ip.query}`,
        summary: `${[ip.country, ip.city, ip.org].filter(Boolean).join(' • ')}`,
        createdAt: new Date().toISOString(),
        confidence: ip.proxy || ip.hosting ? 'medium' : 'high',
        source: 'ip-api.com',
        payload: { ip },
      });
    } catch (error) {
      setState({ status: 'complete', error: error instanceof Error ? error.message : 'Unexpected error' });
    }
  };

  const dnsRecords = state.dns?.Answer ?? [];

  return (
    <SectionCard
      title="Infrastructure Reconnaissance"
      description="Instant IP, DNS, and service-layer enrichment staged for pivoting workflows."
      icon={<Radar className="h-6 w-6" />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleDomainLookup}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/70">
            Domain Footprinting
          </h3>
          <p className="mt-2 text-sm text-slate-300/70">
            Resolve DNS artifacts, pivot on record types, and highlight infrastructure reuse.
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={domainTarget}
              onChange={(event) => setDomainTarget(event.target.value)}
              placeholder="example.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-white/20 bg-gradient-to-r from-white/10 via-white/40 to-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.16)] transition hover:scale-[1.01]"
            >
              Resolve
            </button>
          </div>
          {state.dns && (
            <div className="mt-4 space-y-3 text-xs text-slate-300/70">
              {dnsRecords.length === 0 && <p>No DNS answers discovered.</p>}
              {dnsRecords.map((answer, index) => (
                <div
                  key={`${answer.name}-${answer.type}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <p className="font-semibold text-slate-100">{answer.name}</p>
                  <p>Type {answer.type}</p>
                  <p>{answer.data}</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">TTL {answer.TTL}</p>
                </div>
              ))}
            </div>
          )}
        </form>

        <form
          onSubmit={handleIpLookup}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/70">
            IP Intelligence
          </h3>
          <p className="mt-2 text-sm text-slate-300/70">
            Enrich hosts with network owner, geolocation, proxy and hosting signals in milliseconds.
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={ipTarget}
              onChange={(event) => setIpTarget(event.target.value)}
              placeholder="1.1.1.1"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-white/20 bg-gradient-to-r from-white/10 via-white/40 to-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.16)] transition hover:scale-[1.01]"
            >
              Enrich
            </button>
          </div>
          {state.ip && (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-400">Country</span>
                <span>{state.ip.country || '—'}</span>
                <span className="text-slate-400">City</span>
                <span>{state.ip.city || '—'}</span>
                <span className="text-slate-400">ISP</span>
                <span>{state.ip.isp || '—'}</span>
                <span className="text-slate-400">Organization</span>
                <span>{state.ip.org || '—'}</span>
                <span className="text-slate-400">Proxy</span>
                <span>{state.ip.proxy ? 'Yes' : 'No'}</span>
                <span className="text-slate-400">Hosting</span>
                <span>{state.ip.hosting ? 'Likely' : 'Unlikely'}</span>
              </div>
            </div>
          )}
        </form>
      </div>
      {state.status === 'loading' && (
        <p className="text-sm text-slate-300/70">Running live reconnaissance…</p>
      )}
      {state.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200/90">
          {state.error}
        </p>
      )}
    </SectionCard>
  );
};
