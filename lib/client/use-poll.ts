'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return String(body.error);
  } catch {
    /* not JSON */
  }
  return `Request failed (${res.status})`;
}

/** GET + parse JSON, throwing Error with the server's message on failure. */
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function sendJson<T = unknown>(method: 'POST' | 'PUT', url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

interface PollResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetches `url` immediately and then every `intervalMs` while the tab is visible.
 * Data from a previous URL is dropped so a range switch never shows stale-range data.
 */
export function usePoll<T>(url: string | null, intervalMs: number, paused = false): PollResult<T> {
  const [state, setState] = useState<{ url: string | null; data: T | null }>({ url: null, data: null });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async () => {
    const target = urlRef.current;
    if (!target) return;
    try {
      const data = await getJson<T>(target);
      if (urlRef.current === target) {
        setState({ url: target, data });
        setError(null);
      }
    } catch (e) {
      if (urlRef.current === target) setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      if (urlRef.current === target) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    if (paused) {
      load();
      return;
    }
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, paused, load]);

  return { data: state.url === url ? state.data : null, error, loading, refresh: load };
}
