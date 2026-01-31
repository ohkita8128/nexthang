'use client';

import useSWR from 'swr';
import { fetcher, swrKeys } from '@/lib/swr/fetcher';

type GroupMember = {
  user_id: string;
  users: { display_name: string; picture_url: string | null };
};

export function useMembers(groupId: string | null) {
  const { data, error, isLoading } = useSWR<GroupMember[]>(
    groupId ? swrKeys.members(groupId) : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    members: data || [],
    isLoading,
    error,
  };
}
