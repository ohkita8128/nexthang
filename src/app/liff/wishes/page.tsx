'use client';

import { useEffect, useState } from 'react';
import { useLiff } from '@/hooks/use-liff';
import Link from 'next/link';

type Wish = {
  id: string;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  created_at: string;
  created_by_user: {
    display_name: string;
    picture_url: string | null;
  } | null;
  interests: {
    id: string;
    user_id: string;
    users: {
      display_name: string;
      picture_url: string | null;
    };
  }[];
};

export default function WishesPage() {
  const { profile, context, isReady, error } = useLiff();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        if (context.groupId) {
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
          const data = await res.json();
          
          if (!res.ok) {
            if (res.status === 404) {
              setFetchError('このグループはまだ登録されていません。\n\nBotを一度グループから削除して、再度招待してください。');
            } else {
              setFetchError(`エラー (${res.status}): ${data.error}`);
            }
            setIsLoading(false);
            return;
          }
          
          if (data?.id) {
            setGroupId(data.id);
          }
          return;
        }
        
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setFetchError(`エラー (${res.status}): ${data.error}`);
          setIsLoading(false);
          return;
        }
        
        if (data && data.length > 0) {
          setGroupId(data[0].group_id);
        } else {
          setFetchError('所属グループがありません。\n\nBotをグループに招待してください。');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('fetchGroupId error:', err);
        setFetchError(`通信エラー: ${err}`);
        setIsLoading(false);
      }
    };

    if (isReady && profile) {
      fetchGroupId();
    }
  }, [isReady, profile, context.groupId]);

  useEffect(() => {
    const fetchWishes = async () => {
      if (!groupId) return;

      try {
        const res = await fetch(`/api/groups/${groupId}/wishes`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setWishes(data);
        }
      } catch (err) {
        console.error('Error fetching wishes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishes();
  }, [groupId]);

  const toggleInterest = async (wishId: string, hasInterest: boolean) => {
    if (!profile) return;

    try {
      if (hasInterest) {
        await fetch(`/api/wishes/${wishId}/interest?lineUserId=${profile.userId}`, {
          method: 'DELETE',
        });
      } else {
        await fetch(`/api/wishes/${wishId}/interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: profile.userId }),
        });
      }

      const res = await fetch(`/api/groups/${groupId}/wishes`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setWishes(data);
      }
    } catch (err) {
      console.error('Error toggling interest:', err);
    }
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
          <Link
            href="/liff"
            className="inline-block mt-4 px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/liff" className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">行きたいリスト</h1>
        </div>
      </header>

      <main className="px-4 py-6">
        {wishes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-slate-400 mb-4">まだ候補がありません</p>
            <Link
              href="/liff/wishes/new"
              className="inline-block px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
            >
              最初の候補を追加
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wishes.map((wish) => {
              const hasInterest = wish.interests.some(
                (i) => i.users?.display_name === profile?.displayName
              );
              
              return (
                <div key={wish.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-900">{wish.title}</h3>
                    {wish.description && (
                      <p className="text-sm text-slate-500 mt-1">{wish.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {wish.is_anonymous 
                        ? '匿名' 
                        : wish.created_by_user?.display_name || '不明'
                      }
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {wish.interests.length > 0 && (
                        <>
                          <div className="flex -space-x-2 mr-2">
                            {wish.interests.slice(0, 3).map((interest) => (
                              <div
                                key={interest.id}
                                className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white overflow-hidden"
                              >
                                {interest.users?.picture_url && (
                                  <img
                                    src={interest.users.picture_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">
                            {wish.interests.length}人
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => toggleInterest(wish.id, hasInterest)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
                        hasInterest
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {hasInterest ? '興味あり' : '興味ある'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 追加ボタン */}
      <Link
        href="/liff/wishes/new"
        className="fixed bottom-24 right-4 w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href="/liff" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">ホーム</span>
          </Link>
          <Link href="/liff/calendar" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">カレンダー</span>
          </Link>
          <Link href="/liff/wishes" className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <span className="text-xs text-slate-900 mt-1">行きたい</span>
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
