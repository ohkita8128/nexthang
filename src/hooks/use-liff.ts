'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type UserProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type GroupContext = {
  groupId: string | null;
  type: 'group' | 'room' | 'utou' | 'external' | 'none' | 'square_chat' | null;
};

export function useLiff() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [context, setContext] = useState<GroupContext>({ groupId: null, type: null });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // プロフィール取得
        const userProfile = await liff.getProfile();
        setProfile(userProfile);

        // コンテキスト取得（どこから開いたか）
        const liffContext = liff.getContext();
        if (liffContext) {
          setContext({
            groupId: liffContext.groupId || liffContext.roomId || null,
            type: liffContext.type || null,
          });
        }

        setIsReady(true);
      } catch (err) {
        console.error('LIFF init error:', err);
        setError('LIFFの初期化に失敗しました');
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

  return { profile, context, isReady, error, liff };
}