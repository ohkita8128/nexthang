'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useLiff } from './use-liff';
import { fetcher, swrKeys } from '@/lib/swr/fetcher';

type Group = {
  group_id: string;
  user_id: string;
  groups: { id: string; name: string; last_activity_at: string };
};

export function useGroup() {
  const { profile, context, accessToken, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const registeredRef = useRef(false);

  // URLパラメータからgroupIdを取得
  const paramGroupId = searchParams.get('groupId');

  // LINE GroupIDからDB GroupIDを取得
  const lineGroupId = context.groupId?.startsWith('C') ? context.groupId : null;
  const { data: groupByLineId } = useSWR(
    lineGroupId && !paramGroupId ? swrKeys.groupByLineId(lineGroupId) : null,
    fetcher
  );

  // ユーザーの所属グループを取得
  const { data: userGroups, isLoading: isLoadingGroups, mutate: mutateUserGroups } = useSWR<Group[]>(
    profile?.userId ? swrKeys.userGroups(profile.userId) : null,
    fetcher
  );

  // グループIDとユーザーIDを取得
  const myUserId = userGroups?.[0]?.user_id || null;

  // LIFF開いた時にユーザーを自動登録
  useEffect(() => {
    if (!isReady || !profile || registeredRef.current) return;
    registeredRef.current = true;

    const registerUser = async () => {
      try {
        await fetch('/api/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            lineGroupId: lineGroupId,
            groupId: paramGroupId, // URLパラメータのグループID（DBのID）
          }),
        });
        // グループ登録後にリストを更新
        if (lineGroupId || paramGroupId) {
          mutateUserGroups();
        }
      } catch (err) {
        console.error('Error registering user:', err);
      }
    };

    registerUser();
  }, [isReady, profile, lineGroupId, paramGroupId, mutateUserGroups]);

  useEffect(() => {
    if (!isReady) return;

    // 1. URLパラメータがあればそれを使う
    if (paramGroupId) {
      setGroupId(paramGroupId);
      const found = userGroups?.find(g => g.group_id === paramGroupId);
      if (found?.groups?.name) setGroupName(found.groups.name);
      return;
    }

    // 2. LINEグループIDから取得
    if (groupByLineId?.id) {
      setGroupId(groupByLineId.id);
      setGroupName(groupByLineId.name || null);
      return;
    }

    // 3. 所属グループから最初のものを使う
    if (userGroups && userGroups.length > 0) {
      // last_activity_at順にソート
      const sorted = [...userGroups].sort((a, b) => {
        const aTime = a.groups?.last_activity_at || '1970-01-01';
        const bTime = b.groups?.last_activity_at || '1970-01-01';
        return bTime.localeCompare(aTime);
      });
      setGroupId(sorted[0].group_id);
      setGroupName(sorted[0].groups?.name || null);
    }
  }, [isReady, paramGroupId, groupByLineId, userGroups]);

  return {
    groupId,
    groupName,
    setGroupId,
    setGroupName,
    allGroups: userGroups || [],
    myUserId,
    accessToken,
    isLoading: !isReady || (isLoadingGroups && !groupId),
    isReady,
    profile,
  };
}
