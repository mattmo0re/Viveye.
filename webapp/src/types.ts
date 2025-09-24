export type IntelCategory = 'social' | 'infrastructure' | 'breach' | 'persona' | 'custom';

export interface IntelRecord {
  id: string;
  category: IntelCategory;
  headline: string;
  summary: string;
  createdAt: string;
  payload?: unknown;
}

export interface IntelContribution extends IntelRecord {
  confidence: 'low' | 'medium' | 'high';
  source: string;
}
