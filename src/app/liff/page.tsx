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
  const [loadingState, setLoadingState] = useState<string>('初期化中...');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // デバッグモード（URLに?debug=1を付けると表示）
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugMode(window.location.search.includes('debug=1'));
    }
  }, []);

  const addDebug = (msg: string) => {
    console.log('[DEBUG]', msg);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        addDebug(`context.type: ${context.type}`);
        addDebug(`context.groupId: ${context.groupId || 'null'}`);

        // LINE の正しい groupId は C で始まる
        const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
        addDebug(`isValidLineGroupId: ${isValidLineGroupId}`);

        // グループトークから開いた場合（かつ正しい groupId の場合）
        if (isValidLineGroupId) {
          setLoadingState('グループ情報を取得中...');
          addDebug(`Fetching /api/groups/by-line-id?lineGroupId=${context.groupId}`);
          
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
          const data = await res.json();
          
          addDebug(`Response status: ${res.status}`);
          addDebug(`Response data: ${JSON.stringify(data)}`);

          if (!res.ok) {
            if (res.status === 404) {
              setFetchError('このグループはまだ登録されていません。\n\nBotを一度グループから削除して、再度招待してください。');
            } else {
              setFetchError(`エラーが発生しました (${res.status}): ${data.error || 'Unknown error'}`);
            }
            setLoadingState('');
            return;
          }

          if (data?.id) {
            addDebug(`Group found: ${data.id}`);
            setGroupId(data.id);
            setLoadingState('');
          }
          return;
        }

        // 1:1トークまたは外部ブラウザから開いた場合
        setLoadingState('所属グループを検索中...');
        addDebug(`Fetching /api/user-groups?lineUserId=${profile?.userId}`);
        
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();

        addDebug(`Response status: ${res.status}`);
        addDebug(`Response data: ${JSON.stringify(data)}`);

        if (!res.ok) {
          if (res.status === 404) {
            setFetchError('ユーザー情報が見つかりません。\n\nBotを友だち追加してください。');
          } else {
            setFetchError(`エラーが発生しました (${res.status}): ${data.error || 'Unknown error'}`);
          }
          setLoadingState('');
          return;
        }

        if (data && data.length > 0) {
          addDebug(`User groups found: ${data.length}`);
          setGroupId(data[0].group_id);
        } else {
          setFetchError('所属グループがありません。\n\nBotをグループに招待してください。');
        }
        setLoadingState('');
      } catch (err) {
        console.error('fetchGroupId error:', err);
        addDebug(`Error: ${err}`);
        setFetchError(`通信エラーが発生しました。\n\n${err}`);
        setLoadingState('');
      }
    };

    if (isReady && profile) {
      addDebug(`LIFF ready. Profile: ${profile.displayName}`);
      fetchGroupId();
    }
  }, [isReady, profile, context.groupId, context.type]);

  useEffect(() => {
    const fetchWishes = async () => {
      if (!groupId) return;
      try {
        addDebug(`Fetching wishes for group: ${groupId}`);
        const res = await fetch(`/api/groups/${groupId}/wishes`);
        const data = await res.json();
        addDebug(`Wishes count: ${Array.isArray(data) ? data.length : 'error'}`);
        if (Array.isArray(data)) {
          setWishes(data.slice(0, 3));
        }
      } catch (err) {
        addDebug(`Wishes fetch error: ${err}`);
      }
    };
    fetchWishes();
  }, [groupId]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">LIFF 初期化中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">エラー</h2>
          <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
        </div>
      </div>
    );
  }

  // ローディング中またはエラー
  if (loadingState || fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full text-center">
          {loadingState && (
            <>
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">{loadingState}</p>
            </>
          )}
          {fetchError && (
            <>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">グループが見つかりません</h2>
              <p className="text-sm text-slate-500 whitespace-pre-line">{fetchError}</p>
            </>
          )}
          
          {/* デバッグ情報 */}
          {debugMode && debugInfo.length > 0 && (
            <div className="mt-4 p-3 bg-slate-100 rounded-lg text-left">
              <p className="text-xs font-semibold text-slate-600 mb-2">Debug Info:</p>
              <div className="text-xs text-slate-500 space-y-1 max-h-40 overflow-y-auto">
                {debugInfo.map((info, i) => (
                  <p key={i} className="font-mono break-all">{info}</p>
                ))}
              </div>
            </div>
          )}
        </div>
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
        {/* デバッグ情報（メイン画面） */}
        {debugMode && (
          <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-300">
            <p className="font-semibold text-white mb-2">Debug Mode</p>
            <p>context.type: {context.type || 'null'}</p>
            <p>context.groupId: {context.groupId || 'null'}</p>
            <p>DB groupId: {groupId || 'null'}</p>
            <p>profile.userId: {profile?.userId?.slice(0, 10)}...</p>
          </div>
        )}

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
