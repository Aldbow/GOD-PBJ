"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface OrgFilters {
  eselon1: string | null;
  satker: string | null;
  ppk: string | null;
  search: string;
  setEselon1: (value: string | null) => void;
  setSatker: (value: string | null) => void;
  setPpk: (value: string | null) => void;
  setSearch: (value: string) => void;
  resetAll: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Syncs the "filter utama" (Eselon I / Satker / PPK / pencarian) to the URL
 * as independent, optional query params (e1/s/p/q) — cascading (memilih
 * Eselon I mempersempit Satker/PPK) tapi tidak wajib berurutan diisi.
 * Uses router.replace (not push) so filter tweaks don't spam browser history.
 */
export function useOrgFilters(): OrgFilters {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const eselon1 = searchParams.get('e1');
  const satker = searchParams.get('s');
  const ppk = searchParams.get('p');
  const urlSearch = searchParams.get('q') || '';

  const [search, setSearchLocal] = useState(urlSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchLocal(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setEselon1 = (value: string | null) =>
    replaceParams((params) => {
      if (value) params.set('e1', value);
      else params.delete('e1');
      params.delete('s');
      params.delete('p');
    });

  const setSatker = (value: string | null) =>
    replaceParams((params) => {
      if (value) params.set('s', value);
      else params.delete('s');
      params.delete('p');
    });

  const setPpk = (value: string | null) =>
    replaceParams((params) => {
      if (value) params.set('p', value);
      else params.delete('p');
    });

  const setSearch = (value: string) => {
    setSearchLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      replaceParams((params) => {
        if (value) params.set('q', value);
        else params.delete('q');
      });
    }, SEARCH_DEBOUNCE_MS);
  };

  const resetAll = () => {
    setSearchLocal('');
    replaceParams((params) => {
      params.delete('e1');
      params.delete('s');
      params.delete('p');
      params.delete('q');
    });
  };

  return { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch, resetAll };
}
