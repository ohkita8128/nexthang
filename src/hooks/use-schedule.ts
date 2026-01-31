'use client';

import useSWR, { mutate } from 'swr';
import { fetcher, swrKeys } from '@/lib/swr/fetcher';

type Candidate = {
  id: string;
  date: string;
  votes: {
    id: string;
    user_id: string;
    availability: string;
    users: { display_name: string; picture_url: string | null };
  }[];
};

export function useSchedule(wishId: string | null) {
  const { data, error, isLoading } = useSWR<Candidate[]>(
    wishId ? swrKeys.schedule(wishId) : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  const refreshSchedule = () => {
    if (wishId) {
      mutate(swrKeys.schedule(wishId));
    }
  };

  return {
    candidates: data || [],
    isLoading,
    error,
    refreshSchedule,
  };
}
