'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGroup } from '@/hooks/use-group';
import { useWishes } from '@/hooks/use-wishes';
import { PageSkeleton } from './components/Skeleton';
import ErrorRetry from './components/ErrorRetry';

export default function LiffContent() {
  const router = useRouter();
  const { groupId, groupName, setGroupId, setGroupName, allGroups, profile, isLoading } = useGroup();
  const { wishes, isLoading: isWishesLoading, error: wishesError, refresh } = useWishes(groupId);
  const [showGroupSheet, setShowGroupSheet] = useState(false);

  const switchGroup = (newGroupId: string, newGroupName: string | null) => {
    setGroupId(newGroupId);
    setGroupName(newGroupName);
    setShowGroupSheet(false);
    router.push(`/liff?groupId=${newGroupId}`);
  };

  // 自分が未回答の投票
  const getUnansweredVotes = () => {
    return wishes.filter(w => {
      if (!w.voting_started && w.status !== 'voting') return false;
      if (w.start_date && w.voting_started) {
        const myRes = w.wish_responses?.find(r => r.users?.display_name === profile?.displayName);
        return !myRes;
      }
      if (!w.start_date && w.status === 'voting') {
        return true;
      }
      return false;
    });
  };

  // 直近の予定（投票開始済みのみ）
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

  // 人気の行きたい
  const getPopularWishes = () => {
    return wishes
      .filter(w => w.status === 'open' && !w.start_date)
      .sort((a, b) => b.interests.length - a.interests.length)
      .slice(0, 5);
  };

  const formatDateTime = (wish: typeof wishes[0]) => {
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
    if (diff < 0) return '締め切り';
    if (days === 0) return '今日まで';
    if (days === 1) return '明日まで';
    return `あと${days}日`;
  };

  const getResponseCounts = (wish: typeof wishes[0]) => {
    if (!wish.wish_responses) return { ok: 0, maybe: 0, ng: 0 };
    return {
      ok: wish.wish_responses.filter(r => r.response === 'ok').length,
      maybe: wish.wish_responses.filter(r => r.response === 'maybe').length,
      ng: wish.wish_responses.filter(r => r.response === 'ng').length,
    };
  };

  // ローディング中
  if (isLoading) return <PageSkeleton />;
  
  // グループなし
  if (!groupId) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="bg-white rounded-xl border p-6 text-center"><p className="text-slate-500 whitespace-pre-line">所属グループがありません。{'\n\n'}Botをグループに招待して、{'\n'}グループで何かメッセージを送ってください。</p></div></div>;

  // エラー
  if (wishesError) return <ErrorRetry message="データの読み込みに失敗しました" onRetry={refresh} />;

  const unanswered = getUnansweredVotes();
  const upcoming = getUpcomingEvents();
  const popular = getPopularWishes();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="あそボット" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">あそボット</h1>
              <button 
                onClick={() => setShowGroupSheet(true)}
                className="flex items-center gap-1 text-xs text-slate-500"
              >
                <span className="max-w-[120px] truncate">{groupName || 'グループ'}</span>
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          {profile?.pictureUrl && <img src={profile.pictureUrl} alt="" className="w-8 h-8 rounded-full" />}
        </div>
      </header>

      {/* ボトムシート */}
      {showGroupSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGroupSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">グループを選択</h2>
                <button onClick={() => setShowGroupSheet(false)} className="p-2 text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-140px)]">
              {allGroups.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500">グループがありません</p>
                </div>
              ) : (
                allGroups.map((g) => (
                  <button
                    key={g.group_id}
                    onClick={() => switchGroup(g.group_id, g.groups?.name || null)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                  >
                    <span className="text-sm text-slate-700">{g.groups?.name || '名前なし'}</span>
                    {g.group_id === groupId && (
                      <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
            {/* ヘルプ */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                💡 グループが表示されない場合は、<span className="font-medium">グループトークから</span>管理画面を開くか、グループで何かメッセージを送ってください。
              </p>
            </div>
          </div>
        </div>
      )}

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
                const isConfirmed = wish.status === 'confirmed';
                return (
                  <Link key={wish.id} href={`/liff/wishes/${wish.id}/confirm?groupId=${groupId}`} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{wish.title}</p>
                      <p className="text-xs text-emerald-600">{formatDateTime(wish)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(wish.voting_started || isConfirmed) ? (
                        <span className="text-xs text-slate-400">
                          <span className="text-emerald-500">◯{counts.ok}</span>
                          <span className="text-amber-500 ml-1">△{counts.maybe}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{wish.interests.length}人</span>
                      )}
                      {isConfirmed ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">確定</span>
                      ) : wish.voting_started && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded">投票中</span>
                      )}
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
                  <span className="text-xs text-slate-400 flex-shrink-0">{wish.interests.length}人が行きたい</span>
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
