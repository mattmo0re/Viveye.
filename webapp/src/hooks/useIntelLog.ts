import { useCallback, useState } from 'react';
import type { IntelContribution } from '../types';

export interface IntelLogEntry extends IntelContribution {
  tags?: string[];
}

export const useIntelLog = () => {
  const [entries, setEntries] = useState<IntelLogEntry[]>([]);

  const register = useCallback((entry: IntelLogEntry) => {
    setEntries((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === entry.id);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = entry;
        return next;
      }
      return [entry, ...prev];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const reset = useCallback(() => setEntries([]), []);

  return { entries, register, remove, reset };
};
