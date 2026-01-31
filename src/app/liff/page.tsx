'use client';

import { useEffect, useState } from 'react';
import { useLiff } from '@/hooks/use-liff';
import Link from 'next/link';

type Wish = {
  id: string;
  title: string;
  interests: { id: string }[];
};

export default function LiffPage() {
  const { profile, context, isReady, error } = useLiff();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupId = async () => {
      if (!context.groupId) {
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setGroupId(data[0].group_id);
        }
        return;
      }

      const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
      const data = await res.json();
      if (data?.id) {
        setGroupId(data.id);
      }
    };

    if (isReady && profile) {
      fetchGroupId();
    }
  }, [isReady, profile, context.groupId]);

  useEffect(() => {
    const fetchWishes = async () => {
      if (!groupId) return;
      const res = await fetch(`/api/groups/${groupId}/wishes`);
      const data = await res.json();
      setWishes(data.slice(0, 3));
    };
    fetchWishes();
  }, [groupId]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">あそボット</h1>
          {profile?.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* 予定セクション */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">今後の予定</h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-400 text-center py-6">
              予定はまだありません
            </p>
          </div>
        </section>

        {/* 行きたいリスト */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">行きたいリスト</h2>
            <Link href="/liff/wishes" className="text-sm text-emerald-600 font-medium">
              すべて見る
            </Link>
          </div>

          {wishes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-400 text-center py-6">
                行きたい場所を追加しよう
              </p>
              <Link
                href="/liff/wishes/new"
                className="block w-full text-center py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
              >
                追加する
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {wishes.map((wish) => (
                <Link
                  key={wish.id}
                  href="/liff/wishes"
                  className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{wish.title}</span>
                    <span className="text-xs text-slate-400">
                      {wish.interests.length}人が興味あり
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* クイックアクション */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/liff/wishes/new"
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">行きたい追加</p>
              <p className="text-xs text-slate-400 mt-0.5">新しい候補を提案</p>
            </Link>
            <Link
              href="/liff/calendar"
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">カレンダー</p>
              <p className="text-xs text-slate-400 mt-0.5">予定を確認</p>
            </Link>
          </div>
        </section>
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href="/liff" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-xs text-slate-900 mt-1">ホーム</span>
          </Link>
          <Link href="/liff/calendar" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">カレンダー</span>
          </Link>
          <Link href="/liff/wishes" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">行きたい</span>
          </Link>
          <Link href="/liff/settings" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}