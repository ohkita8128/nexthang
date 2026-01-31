'use client';

import useSWR, { mutate } from 'swr';
import { fetcher, swrKeys } from '@/lib/swr/fetcher';

type WishResponse = {
  id: string;
  user_id: string;
  response: 'ok' | 'maybe' | 'ng';
  users: { display_name: string; picture_url: string | null };
};

type Wish = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'voting' | 'confirmed';
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  voting_started: boolean;
  vote_deadline: string | null;
  confirmed_date: string | null;
  created_by: string;
  created_by_user: { display_name: string; picture_url: string | null } | null;
  interests: { id: string; user_id: string; users: { display_name: string; picture_url: string | null } }[];
  wish_responses: WishResponse[];
};

export function useWishes(groupId: string | null) {
  const { data, error, isLoading } = useSWR<Wish[]>(
    groupId ? swrKeys.wishes(groupId) : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000, // 2秒以内の重複リクエストを防ぐ
    }
  );

  // キャッシュを更新する関数
  const refreshWishes = () => {
    if (groupId) {
      mutate(swrKeys.wishes(groupId));
    }
  };

  return {
    wishes: data || [],
    isLoading,
    error,
    refreshWishes,
  };
}

// 単一のwishを取得するヘルパー
export function useWish(groupId: string | null, wishId: string) {
  const { wishes, isLoading, error, refreshWishes } = useWishes(groupId);
  const wish = wishes.find(w => w.id === wishId) || null;
  
  return {
    wish,
    isLoading,
    error,
    refreshWishes,
  };
}
