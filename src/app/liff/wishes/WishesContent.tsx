'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

export default function WishesContent() {
  const { profile, context, isReady, error } = useLiff();
  const searchParams = useSearchParams();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  const [localInterests, setLocalInterests] = useState<Record<string, boolean>>({});
  const [localVotes, setLocalVotes] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActionsRef = useRef<{type: string; wishId: string; value?: string}[]>([]);

  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        const paramGroupId = searchParams.get('groupId');
        if (paramGroupId) { setGroupId(paramGroupId); return; }
        const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
        if (isValidLineGroupId) { 
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`); 
          const data = await res.json(); 
          if (res.ok && data?.id) { setGroupId(data.id); return; } 
        }
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`); 
        const data = await res.json();
        if (!res.ok) { setFetchError('エラー'); setIsLoading(false); return; }
        if (data && data.length > 0) setGroupId(data[0].group_id); 
        else { setFetchError('所属グループがありません'); setIsLoading(false); }
      } catch (err) { setFetchError('通信エラー'); setIsLoading(false); }
    };
    if (isReady && profile) fetchGroupId();
  }, [isReady, profile, context.groupId, searchParams]);

  const fetchWishes = useCallback(async () => {
    if (!groupId) return;
    try { 
      const res = await fetch(`/api/groups/${groupId}/wishes`); 
      const data = await res.json(); 
      if (Array.isArray(data)) {
        setWishes(data);
        const interests: Record<string, boolean> = {};
        const votes: Record<string, string> = {};
        data.forEach((w: Wish) => {
          interests[w.id] = w.interests.some(i => i.users?.display_name === profile?.displayName);
          const myRes = w.wish_responses?.find(r => r.users?.display_name === profile?.displayName);
          votes[w.id] = myRes?.response || '';
        });
        setLocalInterests(interests);
        setLocalVotes(votes);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [groupId, profile?.displayName]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!profile?.userId) return;
      try {
        const res = await fetch(`/api/user-groups?lineUserId=${profile.userId}`);
        const data = await res.json();
        if (data?.[0]?.user_id) setMyUserId(data[0].user_id);
      } catch (err) { console.error(err); }
    };
    fetchUserId();
  }, [profile?.userId]);

  const processPendingActions = useCallback(async () => {
    const actions = [...pendingActionsRef.current];
    pendingActionsRef.current = [];
    for (const action of actions) {
      try {
        if (action.type === 'interest') {
          if (action.value === 'add') {
            await fetch(`/api/wishes/${action.wishId}/interest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineUserId: profile?.userId }) });
          } else {
            await fetch(`/api/wishes/${action.wishId}/interest?lineUserId=${profile?.userId}`, { method: 'DELETE' });
          }
        } else if (action.type === 'vote') {
          await fetch(`/api/wishes/${action.wishId}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineUserId: profile?.userId, response: action.value }) });
        }
      } catch (err) { console.error(err); }
    }
  }, [profile?.userId]);

  const toggleInterest = (wishId: string) => {
    const current = localInterests[wishId];
    setLocalInterests(prev => ({ ...prev, [wishId]: !current }));
    pendingActionsRef.current.push({ type: 'interest', wishId, value: current ? 'remove' : 'add' });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(processPendingActions, 300);
  };

  const handleVote = (wishId: string, vote: 'ok' | 'maybe' | 'ng') => {
    const current = localVotes[wishId];
    const newVote = current === vote ? '' : vote;
    setLocalVotes(prev => ({ ...prev, [wishId]: newVote }));
    pendingActionsRef.current.push({ type: 'vote', wishId, value: newVote });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(processPendingActions, 300);
  };

  const startVoting = async (wishId: string) => {
    try {
      await fetch(`/api/wishes/${wishId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ votingStarted: true }) });
      await fetchWishes();
    } catch (err) { console.error(err); }
  };

  const deleteWish = async (wishId: string) => {
    if (!confirm('削除しますか？')) return;
    try {
      await fetch(`/api/wishes/${wishId}`, { method: 'DELETE' });
      setWishes(prev => prev.filter(w => w.id !== wishId));
    } catch (err) { console.error(err); alert('削除に失敗しました'); }
  };

  const formatDateTime = (wish: Wish) => {
    if (!wish.start_date) return null;
    const [y, m, d] = wish.start_date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    
    let str = `${m}/${d}(${wd})`;
    if (!wish.is_all_day && wish.start_time) {
      str += ` ${wish.start_time.slice(0, 5)}`;
    }
    
    if (wish.end_date && wish.end_date !== wish.start_date) {
      const [ey, em, ed] = wish.end_date.split('-').map(Number);
      const edate = new Date(ey, em - 1, ed);
      const ewd = ['日', '月', '火', '水', '木', '金', '土'][edate.getDay()];
      str += ` ~ ${em}/${ed}(${ewd})`;
      if (!wish.is_all_day && wish.end_time) {
        str += ` ${wish.end_time.slice(0, 5)}`;
      }
    } else if (!wish.is_all_day && wish.end_time) {
      str += ` ~ ${wish.end_time.slice(0, 5)}`;
    }
    
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

  const canDelete = (wish: Wish) => wish.created_by === myUserId && !wish.voting_started && wish.status === 'open';

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); processPendingActions(); };
  }, [processPendingActions]);

  if (!isReady || isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (error || fetchError) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="bg-white rounded-xl border p-6 text-center"><p className="text-slate-500">{error || fetchError}</p><Link href="/liff" className="inline-block mt-4 px-4 py-2 bg-slate-100 text-sm rounded-lg">戻る</Link></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900">行きたいリスト</h1>
      </header>

      {wishes.length === 0 ? (
        <div className="p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-slate-400 mb-4">まだ候補がありません</p>
            <Link href={`/liff/wishes/new?groupId=${groupId}`} className="inline-block px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg">最初の候補を追加</Link>
          </div>
        </div>
      ) : (
        <div className="bg-white divide-y divide-slate-200">
          {wishes.map((wish) => {
            const hasDateTime = !!wish.start_date;
            const hasInterest = localInterests[wish.id] ?? false;
            const myVote = localVotes[wish.id] || '';
            const counts = getResponseCounts(wish);
            const isVoting = wish.voting_started || wish.status === 'voting';
            const interestCount = wish.interests.length + (hasInterest && !wish.interests.some(i => i.users?.display_name === profile?.displayName) ? 1 : 0) - (!hasInterest && wish.interests.some(i => i.users?.display_name === profile?.displayName) ? 1 : 0);
            
            return (
              <div key={wish.id} className="px-4 py-4">
                {/* 1行目: タイトル + 人数 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base text-slate-900">{wish.title}</h3>
                    <span className="text-sm text-slate-400">{interestCount}人が興味あり</span>
                  </div>
                  {canDelete(wish) && (
                    <button onClick={() => deleteWish(wish.id)} className="text-slate-300 hover:text-red-500 p-1 ml-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>

                {/* 2行目: 日時 */}
                {hasDateTime && (
                  <p className="text-sm text-emerald-600 mt-1">📅 {formatDateTime(wish)}</p>
                )}

                {/* 締め切り表示 */}
                {wish.vote_deadline && isVoting && (
                  <p className="text-xs text-orange-500 mt-1">⏰ {formatDeadline(wish.vote_deadline)}</p>
                )}

                {/* 3行目: 説明 */}
                {wish.description && (
                  <p className="text-sm text-slate-500 mt-1">{wish.description}</p>
                )}

                {/* 4行目: ボタン */}
                <div className="mt-3">
                  {isVoting && hasDateTime ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {(['ok', 'maybe', 'ng'] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => handleVote(wish.id, v)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                                myVote === v
                                  ? (v === 'ok' ? 'bg-emerald-500 text-white' : v === 'maybe' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white')
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {v === 'ok' ? '◯' : v === 'maybe' ? '△' : '✕'}
                            </button>
                          ))}
                        </div>
                        <span className="text-sm text-slate-400">
                          <span className="text-emerald-500">◯{counts.ok}</span>
                          <span className="text-amber-500 ml-2">△{counts.maybe}</span>
                          <span className="text-red-500 ml-2">✕{counts.ng}</span>
                        </span>
                      </div>
                      {/* 投票者表示 */}
                      {wish.wish_responses && wish.wish_responses.length > 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          {(['ok', 'maybe', 'ng'] as const).map((v) => {
                            const voters = wish.wish_responses.filter(r => r.response === v);
                            if (voters.length === 0) return null;
                            return (
                              <span key={v} className="mr-3">
                                <span className={v === 'ok' ? 'text-emerald-500' : v === 'maybe' ? 'text-amber-500' : 'text-red-500'}>
                                  {v === 'ok' ? '◯' : v === 'maybe' ? '△' : '✕'}
                                </span>
                                {voters.map(r => r.users?.display_name).join(', ')}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : isVoting && !hasDateTime ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleInterest(wish.id)} 
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                          hasInterest ? 'bg-slate-100 text-slate-400' : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {hasInterest ? '✓興味あり' : '行きたい'}
                      </button>
                      <Link href={`/liff/wishes/${wish.id}/schedule/vote?groupId=${groupId}`} className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white">
                        日程調整に回答
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleInterest(wish.id)} 
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                          hasInterest ? 'bg-slate-100 text-slate-400' : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {hasInterest ? '✓興味あり' : '行きたい'}
                      </button>
                      
                      {hasDateTime ? (
                        <button onClick={() => startVoting(wish.id)} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white">
                          参加確認を開始
                        </button>
                      ) : (
                        <Link href={`/liff/wishes/${wish.id}/schedule?groupId=${groupId}`} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white">
                          日程調整を開始
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href={`/liff/wishes/new?groupId=${groupId}`} className="fixed bottom-20 right-4 w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </Link>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href={`/liff?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-xs text-slate-400 mt-1">ホーム</span></Link>
          <Link href={`/liff/calendar?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-xs text-slate-400 mt-1">カレンダー</span></Link>
          <Link href={`/liff/wishes?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg><span className="text-xs text-slate-900 mt-1">行きたい</span></Link>
          <Link href={`/liff/settings?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-xs text-slate-400 mt-1">設定</span></Link>
        </div>
      </nav>
    </div>
  );
}
