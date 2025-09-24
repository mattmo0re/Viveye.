import { FormEvent, useMemo, useRef, useState } from 'react';
import { GithubProfile, fetchGithubProfile } from '../lib/api';
import { IntelContribution } from '../types';
import { SectionCard } from './SectionCard';
import { Globe2, Share2 } from 'lucide-react';

interface SocialMediaIntelProps {
  onIntelCapture: (intel: IntelContribution) => void;
}

const PLATFORM_TEMPLATES = [
  { name: 'Mastodon', url: (handle: string) => `https://mastodon.social/@${handle}` },
  { name: 'LinkedIn', url: (handle: string) => `https://www.linkedin.com/in/${handle}` },
  { name: 'TikTok', url: (handle: string) => `https://www.tiktok.com/@${handle}` },
  { name: 'YouTube', url: (handle: string) => `https://www.youtube.com/@${handle}` },
  { name: 'Threads', url: (handle: string) => `https://www.threads.net/@${handle}` },
];

export const SocialMediaIntel = ({ onIntelCapture }: SocialMediaIntelProps) => {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const githubIntel = useMemo(() => {
    if (!profile) return null;
    return {
      type: 'GitHub profile created',
      description: `${profile.name || profile.login} • ${profile.public_repos} repositories • ${profile.followers} followers`,
      url: profile.html_url,
      created: new Date(profile.created_at).toLocaleDateString(),
      updated: new Date(profile.updated_at).toLocaleDateString(),
    };
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchGithubProfile(username.trim(), controller.signal);
      setProfile(result);
      onIntelCapture({
        id: `github-${result.login}`,
        category: 'social',
        headline: `GitHub presence mapped for ${result.login}`,
        summary: `${result.public_repos} repos | ${result.followers} followers | Active since ${new Date(
          result.created_at,
        ).toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        confidence: 'high',
        source: 'GitHub API v3',
        payload: { profile: result },
      });
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SectionCard
      title="Persona Surface Mapper"
      description="Interrogate social graphs, developer footprints, and streaming handles in a unified sweep."
      icon={<Share2 className="h-6 w-6" />}
    >
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto]"
      >
        <div className="space-y-2">
          <label htmlFor="handle" className="text-xs uppercase tracking-[0.35em] text-slate-300/70">
            Investigate handle
          </label>
          <input
            id="handle"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. octocat"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-slate-100 shadow-inner focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-white/20 via-white/60 to-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 shadow-[0_15px_35px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Profiling…' : 'Profile'}
          <span className="absolute inset-0 -translate-x-full bg-white/40 transition group-hover:translate-x-0" />
        </button>
      </form>

      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}

      {profile && (
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-inner">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <img
              src={profile.avatar_url}
              alt={profile.login}
              className="h-20 w-20 rounded-2xl border border-white/20 object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold text-slate-50">{profile.name || profile.login}</h3>
              <p className="text-sm text-slate-300/80">{profile.bio || 'Bio unavailable'}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300/70">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{profile.public_repos} repositories</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{profile.followers} followers</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{profile.following} following</span>
              </div>
            </div>
          </div>
          {githubIntel && (
            <div className="grid gap-2 text-sm text-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-300/70">Account created</span>
                <span>{githubIntel.created}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300/70">Last seen</span>
                <span>{githubIntel.updated}</span>
              </div>
              <a
                href={githubIntel.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-sky-300 transition hover:text-sky-200"
              >
                <Globe2 className="h-4 w-4" /> Visit GitHub profile
              </a>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/70">
          Expand Surface
        </h3>
        <p className="mt-2 text-sm text-slate-300/70">
          Instant open-source pivots for the investigated persona.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {PLATFORM_TEMPLATES.map((platform) => (
            <a
              key={platform.name}
              href={platform.url(username || 'username')}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200/80 transition hover:border-white/30 hover:bg-black/10"
            >
              <span>{platform.name}</span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400 group-hover:text-slate-100">
                Pivot →
              </span>
            </a>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};
