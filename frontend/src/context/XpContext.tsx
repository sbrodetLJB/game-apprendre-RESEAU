import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

interface XpState {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

interface XpContextValue {
  xp: XpState | null;
  refresh: () => Promise<void>;
}

const XpContext = createContext<XpContextValue | undefined>(undefined);

export function XpProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [xp, setXp] = useState<XpState | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'ETUDIANT') {
      setXp(null);
      return;
    }
    const { data } = await apiClient.get<XpState>('/me/xp');
    setXp(data);
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <XpContext.Provider value={{ xp, refresh }}>{children}</XpContext.Provider>;
}

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within an XpProvider');
  return ctx;
}
