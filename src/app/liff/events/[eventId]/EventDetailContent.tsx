'use client';

import { useState, useEffect } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Vote = { id: string; user_id: string; date: string; availability: 'ok' | 'maybe' | 'ng'; users: { display_name: string; picture_url: string | null } };
type Event = { id: string; title: string; description: string | null; candidate_dates: string[]; status: 'voting' | 'confirmed' | 'cancelled'; votes: Vote[]; created_by_user: { display_name: string } | null };

export default function EventDetailContent({ eventId }: { eventId: string }) {
  const { profile, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [myVote, setMyVote] = useState<'ok' | 'maybe' | 'ng' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const groupId = searchParams.get('groupId');

  useEffect(() => {
    const fetchEvent = async () => {
      if (!groupId) return;
      try {
        const res = await fetch(`/api/groups/${groupId}/events`); 
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find((e: Event) => e.id === eventId);
          if (found) {
            setEvent(found);
            if (profile?.displayName) {
              const myExistingVote = found.votes.find((v: Vote) => v.users?.display_name === profile.displayName);
              if (myExistingVote) setMyVote(myExistingVote.availability);
            }
          }
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    if (isReady && profile) fetchEvent();
  }, [isReady, profile, groupId, eventId]);

  const handleSaveVote = async () => {
    if (!profile?.userId || !myVote || !event) return;
    setIsSaving(true);
    try {
      const date = event.candidate_dates[0] || new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/events/${eventId}/votes`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ lineUserId: profile.userId, votes: [{ date, availability: myVote }] }) 
      });
      if (res.ok) window.location.reload(); else alert('保存に失敗しました');
    } catch (err) { alert('保存に失敗しました'); }
    finally { setIsSaving(false); }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'ok': return '参加';
      case 'maybe': return '未定';
      case 'ng': return '不参加';
      default: return '';
    }
  };

  if (!isReady || isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="text-center"><p className="text-slate-500">予定が見つかりません</p><Link href={`/liff/calendar?groupId=${groupId}`} className="inline-block mt-4 px-4 py-2 bg-slate-100 text-sm rounded-lg">戻る</Link></div></div>;

  // 回答を集計
  const voteCounts = {
    ok: event.votes.filter(v => v.availability === 'ok').length,
    maybe: event.votes.filter(v => v.availability === 'maybe').length,
    ng: event.votes.filter(v => v.availability === 'ng').length,
  };

  // 回答者をグループ分け
  const votesByType = {
    ok: event.votes.filter(v => v.availability === 'ok'),
    maybe: event.votes.filter(v => v.availability === 'maybe'),
    ng: event.votes.filter(v => v.availability === 'ng'),
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/liff/calendar?groupId=${groupId}`} className="text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{event.title}</h1>
        </div>
      </header>
      
      <main className="px-4 py-6 space-y-4">
        {/* イベント詳細 */}
        {event.description && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-600 whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* 回答状況サマリー */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">回答状況</h2>
          <div className="flex gap-4">
            <div className="flex-1 text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">◯ {voteCounts.ok}</div>
              <div className="text-xs text-emerald-600 mt-1">参加</div>
            </div>
            <div className="flex-1 text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">△ {voteCounts.maybe}</div>
              <div className="text-xs text-amber-600 mt-1">未定</div>
            </div>
            <div className="flex-1 text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">✕ {voteCounts.ng}</div>
              <div className="text-xs text-red-600 mt-1">不参加</div>
            </div>
          </div>
        </div>

        {/* あなたの回答 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">あなたの回答</h2>
          <div className="flex gap-2">
            {(['ok', 'maybe', 'ng'] as const).map((a) => (
              <button 
                key={a} 
                type="button" 
                onClick={() => setMyVote(a)} 
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition ${
                  myVote === a 
                    ? (a === 'ok' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                      : a === 'maybe' ? 'border-amber-500 bg-amber-50 text-amber-700' 
                      : 'border-red-500 bg-red-50 text-red-700') 
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                {a === 'ok' ? '◯ 参加' : a === 'maybe' ? '△ 未定' : '✕ 不参加'}
              </button>
            ))}
          </div>
        </div>

        {/* 回答者一覧 */}
        {event.votes.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">回答者</h2>
            <div className="space-y-3">
              {voteCounts.ok > 0 && (
                <div>
                  <div className="text-xs text-emerald-600 font-medium mb-2">◯ 参加 ({voteCounts.ok})</div>
                  <div className="flex flex-wrap gap-2">
                    {votesByType.ok.map((v) => (
                      <div key={v.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full">
                        {v.users?.picture_url && <img src={v.users.picture_url} alt="" className="w-5 h-5 rounded-full" />}
                        <span className="text-xs text-emerald-700">{v.users?.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {voteCounts.maybe > 0 && (
                <div>
                  <div className="text-xs text-amber-600 font-medium mb-2">△ 未定 ({voteCounts.maybe})</div>
                  <div className="flex flex-wrap gap-2">
                    {votesByType.maybe.map((v) => (
                      <div key={v.id} className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full">
                        {v.users?.picture_url && <img src={v.users.picture_url} alt="" className="w-5 h-5 rounded-full" />}
                        <span className="text-xs text-amber-700">{v.users?.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {voteCounts.ng > 0 && (
                <div>
                  <div className="text-xs text-red-600 font-medium mb-2">✕ 不参加 ({voteCounts.ng})</div>
                  <div className="flex flex-wrap gap-2">
                    {votesByType.ng.map((v) => (
                      <div key={v.id} className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full">
                        {v.users?.picture_url && <img src={v.users.picture_url} alt="" className="w-5 h-5 rounded-full" />}
                        <span className="text-xs text-red-700">{v.users?.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <button 
          onClick={handleSaveVote} 
          disabled={isSaving || !myVote} 
          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${isSaving || !myVote ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          {isSaving ? '保存中...' : '回答を保存'}
        </button>
      </div>
    </div>
  );
}
