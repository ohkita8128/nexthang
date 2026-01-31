'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useGroup } from '@/hooks/use-group';
import { useWish } from '@/hooks/use-wishes';
import { useMembers } from '@/hooks/use-members';

export default function ConfirmContent() {
  const params = useParams();
  const wishId = params.wishId as string;
  
  const { groupId, profile, isLoading: isGroupLoading } = useGroup();
  const { wish, isLoading: isWishLoading, refreshWishes } = useWish(groupId, wishId);
  const { members, isLoading: isMembersLoading } = useMembers(groupId);
  
  const [myVote, setMyVote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 初期値設定（wishが読み込まれた時）
  if (wish && profile && !initialized) {
    const myRes = wish.wish_responses?.find(r => r.users?.display_name === profile.displayName);
    if (myRes) setMyVote(myRes.response);
    setInitialized(true);
  }

  const handleVote = (vote: string) => {
    setMyVote(prev => prev === vote ? '' : vote);
  };

  const saveVote = useCallback(async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await fetch(`/api/wishes/${wishId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: profile.userId, response: myVote })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refreshWishes();
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  }, [wishId, profile, myVote, refreshWishes]);

  const formatDateTime = () => {
    if (!wish?.start_date) return '';
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

  // 回答をグループ化
  const getResponseGroups = () => {
    const responses = wish?.wish_responses || [];
    const respondedUserNames = new Set(responses.map(r => r.users?.display_name));
    
    return {
      ok: responses.filter(r => r.response === 'ok'),
      maybe: responses.filter(r => r.response === 'maybe'),
      ng: responses.filter(r => r.response === 'ng'),
      noResponse: members.filter(m => !respondedUserNames.has(m.users?.display_name))
    };
  };

  const isLoading = isGroupLoading || isWishLoading || isMembersLoading;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (!wish) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">予定が見つかりません</p></div>;

  const groups = getResponseGroups();

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/liff/wishes?groupId=${groupId}`} className="text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">参加確認</h1>
            <p className="text-sm text-slate-500">{wish.title}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 予定情報 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">{wish.title}</h2>
          <p className="text-emerald-600 text-sm">📅 {formatDateTime()}</p>
          {wish.description && <p className="text-sm text-slate-500 mt-2">{wish.description}</p>}
          {wish.vote_deadline && (
            <p className="text-xs text-orange-500 mt-2">⏰ 回答期限: {formatDeadline(wish.vote_deadline)}</p>
          )}
        </div>

        {/* 自分の回答 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">あなたの回答</h3>
          <div className="flex gap-3">
            {(['ok', 'maybe', 'ng'] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleVote(v)}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition ${
                  myVote === v
                    ? (v === 'ok' ? 'bg-emerald-500 text-white' : v === 'maybe' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white')
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {v === 'ok' ? '◯ 参加' : v === 'maybe' ? '△ 未定' : '✕ 不参加'}
              </button>
            ))}
          </div>
        </div>

        {/* 回答状況 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            回答状況
            <span className="font-normal text-slate-400 ml-2">
              {(wish.wish_responses?.length || 0)}/{members.length}人
            </span>
          </h3>
          
          <div className="space-y-3">
            {/* 参加 */}
            {groups.ok.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-emerald-500 text-white text-xs rounded flex items-center justify-center">◯</span>
                  <span className="text-sm text-slate-600">参加 ({groups.ok.length})</span>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  {groups.ok.map(r => r.users?.display_name).join('、')}
                </p>
              </div>
            )}
            
            {/* 未定 */}
            {groups.maybe.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-amber-500 text-white text-xs rounded flex items-center justify-center">△</span>
                  <span className="text-sm text-slate-600">未定 ({groups.maybe.length})</span>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  {groups.maybe.map(r => r.users?.display_name).join('、')}
                </p>
              </div>
            )}
            
            {/* 不参加 */}
            {groups.ng.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-red-500 text-white text-xs rounded flex items-center justify-center">✕</span>
                  <span className="text-sm text-slate-600">不参加 ({groups.ng.length})</span>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  {groups.ng.map(r => r.users?.display_name).join('、')}
                </p>
              </div>
            )}
            
            {/* 未回答 */}
            {groups.noResponse.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-slate-300 text-white text-xs rounded flex items-center justify-center">-</span>
                  <span className="text-sm text-slate-600">未回答 ({groups.noResponse.length})</span>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  {groups.noResponse.map(m => m.users?.display_name).join('、')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 保存ボタン */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <button
          onClick={saveVote}
          disabled={isSaving}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
            saved ? 'bg-emerald-500 text-white' : isSaving ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white'
          }`}
        >
          {saved ? '✓ 保存しました' : isSaving ? '保存中...' : '回答を保存'}
        </button>
      </div>

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
