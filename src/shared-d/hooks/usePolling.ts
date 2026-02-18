'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type PollingStatus = 'idle' | 'loading' | 'success' | 'error';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

interface UsePollingResult<T> {
  data: T | null;
  status: PollingStatus;
  error: Error | null;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  { intervalMs = 5000, enabled = true }: UsePollingOptions = {}
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<PollingStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const poll = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await fetcherRef.current();
      setData(result);
      setStatus('success');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, poll]);

  return { data, status, error };
}
