'use client';

import { useEffect, useState } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter } from 'next/navigation';

type Group = {
  group_id: string;
  groups: {
    id: string;
    name: string | null;
    line_group_id: string;
  };
};

export default function GroupsPage() {
  const { profile, isReady, error } = useLiff();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!profile?.userId) return;

      try {
        const res = await fetch(`/api/user-groups?lineUserId=${profile.userId}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setFetchError('ユーザー情報が見つかりません。\n\nBotを友だち追加してください。');
          } else {
            setFetchError(`エラー (${res.status}): ${data.error}`);
          }
          setIsLoading(false);
          return;
        }

        if (Array.isArray(data)) {
          setGroups(data);
          
          // グループが1つだけならそのまま遷移
          if (data.length === 1) {
            router.push(`/liff?groupId=${data[0].group_id}`);
            return;
          }
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setFetchError('通信エラーが発生しました。');
        setIsLoading(false);
      }
    };

    if (isReady && profile) {
      fetchGroups();
    }
  }, [isReady, profile, router]);

  const handleSelectGroup = (groupId: string) => {
    router.push(`/liff?groupId=${groupId}`);
  };

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">エラー</h2>
          <p className="text-sm text-slate-500 whitespace-pre-line">{error || fetchError}</p>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">グループがありません</h2>
          <p className="text-sm text-slate-500">
            あそボットをグループに招待して、<br />
            グループで何かメッセージを送ってください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-lg font-semibold text-slate-900">グループを選択</h1>
        <p className="text-sm text-slate-500 mt-1">管理するグループを選んでください</p>
      </header>

      <main className="px-4 py-6">
        <div className="space-y-3">
          {groups.map((group) => (
            <button
              key={group.group_id}
              onClick={() => handleSelectGroup(group.group_id)}
              className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-slate-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {group.groups?.name || 'グループ'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    タップして管理画面を開く
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
