'use client';

import { createContext, useContext } from 'react';
import { usePoll } from '@/lib/client/use-poll';
import type { StatusResponse } from '@/types/monitor';

interface LiveValue {
  status: StatusResponse | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const LiveContext = createContext<LiveValue>({ status: null, error: null, refresh: async () => {} });

/** One shared poll of /api/status for the sidebar, top bar and pages. */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { data, error, refresh } = usePoll<StatusResponse>('/api/status', 2000);
  return <LiveContext.Provider value={{ status: data, error, refresh }}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
