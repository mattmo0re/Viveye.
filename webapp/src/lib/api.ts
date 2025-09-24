export interface GithubProfile {
  login: string;
  name?: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
  followers: number;
  following: number;
  public_repos: number;
  avatar_url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface IpIntel {
  query: string;
  status: 'success' | 'fail';
  country?: string;
  regionName?: string;
  city?: string;
  isp?: string;
  org?: string;
  reverse?: string;
  proxy?: boolean;
  hosting?: boolean;
  lat?: number;
  lon?: number;
  message?: string;
}

export interface DnsAnswer {
  name: string;
  data: string;
  TTL: number;
  type: number;
}

export interface DnsResponse {
  Status: number;
  Question: { name: string; type: number }[];
  Answer?: DnsAnswer[];
}

const handleHttpError = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response;
};

export const fetchGithubProfile = async (username: string, signal?: AbortSignal) => {
  const response = await handleHttpError(
    await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    }),
  );
  return (await response.json()) as GithubProfile;
};

export const lookupIp = async (ipOrHost: string, signal?: AbortSignal) => {
  const endpoint = `http://ip-api.com/json/${encodeURIComponent(ipOrHost)}?fields=status,message,country,regionName,city,isp,org,reverse,proxy,hosting,query,lat,lon`;
  const response = await handleHttpError(await fetch(endpoint, { signal }));
  return (await response.json()) as IpIntel;
};

export const resolveDomain = async (domain: string, signal?: AbortSignal) => {
  const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=ANY`;
  const response = await handleHttpError(await fetch(endpoint, { signal }));
  return (await response.json()) as DnsResponse;
};

export interface BreachItem {
  Name: string;
  Domain: string;
  BreachDate: string;
  Description: string;
  PwnCount: number;
  DataClasses: string[];
}

export const fetchSampleBreaches = async (): Promise<BreachItem[]> => {
  return [
    {
      Name: 'Collection #1',
      Domain: 'multiple sources',
      BreachDate: '2019-01-07',
      Description:
        'Massive credential dump aggregated from numerous smaller breaches circulating on public forums.',
      PwnCount: 772_904_991,
      DataClasses: ['Email addresses', 'Passwords'],
    },
    {
      Name: 'LinkedIn',
      Domain: 'linkedin.com',
      BreachDate: '2021-06-22',
      Description:
        'Data scraped from public profiles including professional history and social graphs.',
      PwnCount: 700_000_000,
      DataClasses: ['Email addresses', 'Employment history', 'Social connections'],
    },
  ];
};
