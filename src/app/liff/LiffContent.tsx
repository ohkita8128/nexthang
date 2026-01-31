'use client';

import { useEffect, useState } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type WishResponse = {
  id: string;
  user_id: string;
  response: 'ok' | 'maybe' | 'ng';
  users: { display_name: string };
};

type Wish = {
  id: string;
  title: string;
  status: 'open' | 'voting' | 'confirmed';
  start_date: string | null;
  start_time: string | null;
  voting_started: boolean;
  vote_deadline: string | null;
  interests: { id: string; users: { display_name: string } }[];
  wish_responses: WishResponse[];
};

export default function LiffContent() {
  const { profile, context, isReady, error } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<string>('初期化中...');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        const paramGroupId = searchParams.get('groupId');
        if (paramGroupId) { setGroupId(paramGroupId); setLoadingState(''); return; }
        const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
        if (isValidLineGroupId) {
          setLoadingState('グループ情報を取得中...');
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
          const data = await res.json();
          if (res.ok && data?.id) { setGroupId(data.id); setLoadingState(''); return; }
        }
        setLoadingState('所属グループを確認中...');
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();
        if (!res.ok) { setFetchError('エラーが発生しました'); setLoadingState(''); return; }
        if (!data || data.length === 0) { setFetchError('所属グループがありません。\n\nBotをグループに招待して、\nグループで何かメッセージを送ってください。'); setLoadingState(''); return; }
        if (data.length === 1) { setGroupId(data[0].group_id); if (data[0].groups?.name) setGroupName(data[0].groups.name); setLoadingState(''); return; }
        router.push('/liff/groups');
      } catch (err) { setFetchError('通信エラー'); setLoadingState(''); }
    };
    if (isReady && profile) fetchGroupId();
  }, [isReady, profile, context.groupId, searchParams, router]);

  useEffect(() => {
    const fetchWishes = async () => {
      if (!groupId) return;
      try {
        const res = await fetch(`/api/groups/${groupId}/wishes`);
        const data = await res.json();
        if (Array.isArray(data)) setWishes(data);
      } catch (err) { console.error(err); }
    };
    fetchWishes();
  }, [groupId]);

  // 自分が未回答の投票（参加確認または日程調整）
  const getUnansweredVotes = () => {
    return wishes.filter(w => {
      if (!w.voting_started && w.status !== 'voting') return false;
      // 参加確認の場合
      if (w.start_date && w.voting_started) {
        const myRes = w.wish_responses?.find(r => r.users?.display_name === profile?.displayName);
        return !myRes;
      }
      // 日程調整の場合（status === 'voting'で日付なし）
      if (!w.start_date && w.status === 'voting') {
        // 日程調整の未回答チェックは複雑なのでここでは単純に表示
        return true;
      }
      return false;
    });
  };

  // 直近の予定（日時あり＆投票開始済みのもの）
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return wishes
      .filter(w => w.start_date)
      .filter(w => w.voting_started || w.status === 'voting' || w.status === 'confirmed')
      .filter(w => {
        const [y, m, d] = w.start_date!.split('-').map(Number);
        return new Date(y, m - 1, d) >= today;
      })
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
      .slice(0, 5);
  };

  // 人気な行きたいリスト（興味が多い順）
  const getPopularWishes = () => {
    return [...wishes]
      .filter(w => !w.start_date && w.status === 'open')
      .sort((a, b) => b.interests.length - a.interests.length)
      .slice(0, 5);
  };

  const formatDateTime = (wish: Wish) => {
    if (!wish.start_date) return '';
    const [y, m, d] = wish.start_date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    let str = `${m}/${d}(${wd})`;
    if (wish.start_time) str += ` ${wish.start_time.slice(0, 5)}`;
    return str;
  };

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (diff < 0) return '締め切りました';
    if (days === 0) return '今日まで';
    if (days === 1) return '明日まで';
    return `あと${days}日`;
  };

  const getResponseCounts = (wish: Wish) => {
    if (!wish.wish_responses) return { ok: 0, maybe: 0, ng: 0 };
    return {
      ok: wish.wish_responses.filter(r => r.response === 'ok').length,
      maybe: wish.wish_responses.filter(r => r.response === 'maybe').length,
      ng: wish.wish_responses.filter(r => r.response === 'ng').length,
    };
  };

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="bg-white rounded-xl border p-6 text-center"><p className="text-red-500">{error}</p></div></div>;
  if (loadingState || fetchError) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full text-center">{loadingState && <><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" /><p className="text-sm text-slate-500 mt-3">{loadingState}</p></>}{fetchError && <p className="text-sm text-slate-500 whitespace-pre-line">{fetchError}</p>}</div></div>;

  const unanswered = getUnansweredVotes();
  const upcoming = getUpcomingEvents();
  const popular = getPopularWishes();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-semibold text-slate-900">あそボット</h1>{groupName && <p className="text-xs text-slate-500">{groupName}</p>}</div>
          <div className="flex items-center gap-2">
            <Link href="/liff/groups" className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg></Link>
            {profile?.pictureUrl && <img src={profile.pictureUrl} alt="" className="w-8 h-8 rounded-full" />}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 未回答の投票 */}
        {unanswered.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">🔔 回答が必要</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {unanswered.map((wish) => (
                <Link
                  key={wish.id}
                  href={wish.start_date ? `/liff/wishes/${wish.id}/confirm?groupId=${groupId}` : `/liff/wishes/${wish.id}/schedule/vote?groupId=${groupId}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{wish.title}</p>
                    <p className="text-xs text-slate-400">
                      {wish.start_date ? '参加確認' : '日程調整'}
                      {wish.vote_deadline && <span className="text-orange-500 ml-2">⏰ {formatDeadline(wish.vote_deadline)}</span>}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 直近の予定 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">📅 直近の予定</h2>
            <Link href={`/liff/calendar?groupId=${groupId}`} className="text-xs text-emerald-600">すべて見る</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-400">予定はまだありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {upcoming.map((wish) => {
                const counts = getResponseCounts(wish);
                return (
                  <Link key={wish.id} href={`/liff/wishes?groupId=${groupId}`} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{wish.title}</p>
                      <p className="text-xs text-emerald-600">{formatDateTime(wish)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {wish.voting_started ? (
                        <span className="text-xs text-slate-400">
                          <span className="text-emerald-500">◯{counts.ok}</span>
                          <span className="text-amber-500 ml-1">△{counts.maybe}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{wish.interests.length}人</span>
                      )}
                      {wish.voting_started && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded">投票中</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 人気の行きたいリスト */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">🔥 人気の行きたい</h2>
            <Link href={`/liff/wishes?groupId=${groupId}`} className="text-xs text-emerald-600">すべて見る</Link>
          </div>
          {popular.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-400 mb-3">行きたい場所を追加しよう</p>
              <Link href={`/liff/wishes/new?groupId=${groupId}`} className="inline-block px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg">追加する</Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {popular.map((wish) => (
                <Link key={wish.id} href={`/liff/wishes?groupId=${groupId}`} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{wish.title}</p>
                  <span className="text-xs text-slate-400 flex-shrink-0">{wish.interests.length}人が興味あり</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* クイックアクション */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/liff/wishes/new?groupId=${groupId}`} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <p className="text-sm font-medium text-slate-900">行きたい追加</p>
              <p className="text-xs text-slate-400 mt-0.5">新しい候補を提案</p>
            </Link>
            <Link href={`/liff/calendar?groupId=${groupId}`} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-sm font-medium text-slate-900">カレンダー</p>
              <p className="text-xs text-slate-400 mt-0.5">予定を確認</p>
            </Link>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href={`/liff?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg><span className="text-xs text-slate-900 mt-1">ホーム</span></Link>
          <Link href={`/liff/calendar?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-xs text-slate-400 mt-1">カレンダー</span></Link>
          <Link href={`/liff/wishes?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg><span className="text-xs text-slate-400 mt-1">行きたい</span></Link>
          <Link href={`/liff/settings?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-xs text-slate-400 mt-1">設定</span></Link>
        </div>
      </nav>
    </div>
  );
}
