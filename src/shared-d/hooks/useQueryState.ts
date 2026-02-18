'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UseQueryStateOptions<T> {
  defaultValue: T;
}

export function useQueryState<T extends string>(
  key: string,
  { defaultValue }: UseQueryStateOptions<T>
): [T, (value: T | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramValue = searchParams.get(key);
  const value = (paramValue ?? defaultValue) as T;

  const setValue = useCallback(
    (newValue: T | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue === null || newValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    },
    [key, defaultValue, pathname, router, searchParams]
  );

  return [value, setValue];
}
