import { SectionCard } from './SectionCard';
import { Compass } from 'lucide-react';

const RESOURCES = [
  {
    title: 'Social Deep Dives',
    description: 'Curated search pivots into Discord, Reddit, Telegram, and dark social hubs.',
    url: 'https://github.com/jivoi/awesome-osint',
    label: 'Playbook',
  },
  {
    title: 'Infrastructure Automation',
    description: 'Advanced recon automation scripts leveraging Amass, Aquatone, and Project Discovery.',
    url: 'https://projectdiscovery.io/',
    label: 'Toolkit',
  },
  {
    title: 'Breach Intelligence',
    description: 'Continuously updated credential exposure feeds and dark web telemetry.',
    url: 'https://haveibeenpwned.com/',
    label: 'Intel Feed',
  },
  {
    title: 'Analyst Tradecraft',
    description: 'Briefings, methodologies, and certification-grade training resources.',
    url: 'https://osintframework.com/',
    label: 'Framework',
  },
];

export const ResourceBoard = () => (
  <SectionCard
    title="Resource Launchpad"
    description="Launch straight into curated OSINT assets, automation frameworks, and analyst tooling."
    icon={<Compass className="h-6 w-6" />}
  >
    <ul className="space-y-3">
      {RESOURCES.map((resource) => (
        <li
          key={resource.title}
          className="flex flex-col rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-white/30 hover:bg-black/10"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">{resource.title}</h3>
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{resource.label}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300/80">{resource.description}</p>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 text-sm text-sky-300 transition hover:text-sky-200"
          >
            Launch →
          </a>
        </li>
      ))}
    </ul>
  </SectionCard>
);
