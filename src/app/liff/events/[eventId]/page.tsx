'use client';

import { useState, useEffect, use } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Vote = {
  id: string;
  user_id: string;
  date: string;
  availability: 'ok' | 'maybe' | 'ng';
  users: {
    display_name: string;
    picture_url: string | null;
  };
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  candidate_dates: string[];
  status: 'voting' | 'confirmed' | 'cancelled';
  confirmed_date: string | null;
  created_at: string;
  created_by_user: {
    display_name: string;
    picture_url: string | null;
  } | null;
  votes: Vote[];
};

type MyVote = {
  date: string;
  availability: 'ok' | 'maybe' | 'ng';
};

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { profile, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [myVotes, setMyVotes] = useState<MyVote[]>([]);
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
            
            // 自分の投票を取得
            if (profile?.userId) {
              const myExistingVotes = found.votes.filter(
                (v: Vote) => v.users?.display_name === profile?.displayName
              );
              if (myExistingVotes.length > 0) {
                setMyVotes(myExistingVotes.map((v: Vote) => ({
                  date: v.date,
                  availability: v.availability,
                })));
              } else {
                // 初期値を設定
                setMyVotes(found.candidate_dates.map((date: string) => ({
                  date,
                  availability: 'ok' as const,
                })));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isReady && profile) {
      fetchEvent();
    }
  }, [isReady, profile, groupId, eventId]);

  const handleVoteChange = (date: string, availability: 'ok' | 'maybe' | 'ng') => {
    setMyVotes(prev => 
      prev.map(v => v.date === date ? { ...v, availability } : v)
    );
  };

  const handleSaveVotes = async () => {
    if (!profile?.userId) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: profile.userId,
          votes: myVotes,
        }),
      });

      if (res.ok) {
        // リロードして最新を取得
        window.location.reload();
      } else {
        alert('保存に失敗しました');
      }
    } catch (err) {
      console.error('Error saving votes:', err);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case 'ok':
        return <span className="text-emerald-500 text-lg">◯</span>;
      case 'maybe':
        return <span className="text-amber-500 text-lg">△</span>;
      case 'ng':
        return <span className="text-red-500 text-lg">✕</span>;
      default:
        return <span className="text-slate-300 text-lg">−</span>;
    }
  };

  const countVotes = (date: string) => {
    if (!event) return { ok: 0, maybe: 0, ng: 0 };
    const dateVotes = event.votes.filter(v => v.date === date);
    return {
      ok: dateVotes.filter(v => v.availability === 'ok').length,
      maybe: dateVotes.filter(v => v.availability === 'maybe').length,
      ng: dateVotes.filter(v => v.availability === 'ng').length,
    };
  };

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-slate-500">イベントが見つかりません</p>
          <Link
            href={`/liff/calendar?groupId=${groupId}`}
            className="inline-block mt-4 px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg"
          >
            戻る
          </Link>
        </div>
      </div>
    );
  }

  // 参加者一覧を作成
  const participants = [...new Set(event.votes.map(v => v.users?.display_name))].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/liff/calendar?groupId=${groupId}`} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{event.title}</h1>
            {event.description && (
              <p className="text-sm text-slate-500">{event.description}</p>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* 投票状況サマリー */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">候補日の状況</h2>
          <div className="space-y-2">
            {event.candidate_dates.map((date) => {
              const counts = countVotes(date);
              const total = counts.ok + counts.maybe + counts.ng;
              
              return (
                <div key={date} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700 w-24">
                    {formatDate(date)}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-emerald-600">◯{counts.ok}</span>
                    <span className="text-sm text-amber-600">△{counts.maybe}</span>
                    <span className="text-sm text-red-600">✕{counts.ng}</span>
                  </div>
                  {total > 0 && (
                    <span className="text-xs text-slate-400">{total}人回答</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 自分の投票 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">あなたの回答</h2>
          <div className="space-y-3">
            {myVotes.map((vote) => (
              <div key={vote.date} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 w-24">
                  {formatDate(vote.date)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleVoteChange(vote.date, 'ok')}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition ${
                      vote.availability === 'ok'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={vote.availability === 'ok' ? 'text-emerald-500' : 'text-slate-300'}>◯</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoteChange(vote.date, 'maybe')}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition ${
                      vote.availability === 'maybe'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={vote.availability === 'maybe' ? 'text-amber-500' : 'text-slate-300'}>△</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoteChange(vote.date, 'ng')}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition ${
                      vote.availability === 'ng'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={vote.availability === 'ng' ? 'text-red-500' : 'text-slate-300'}>✕</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 回答者一覧 */}
        {participants.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">回答者（{participants.length}人）</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-slate-500 font-normal pb-2 pr-4">名前</th>
                    {event.candidate_dates.map((date) => (
                      <th key={date} className="text-center text-slate-500 font-normal pb-2 px-2 whitespace-nowrap">
                        {formatDate(date).replace('/', '/\n')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((name) => {
                    const userVotes = event.votes.filter(v => v.users?.display_name === name);
                    return (
                      <tr key={name} className="border-t border-slate-100">
                        <td className="py-2 pr-4 text-slate-700">{name}</td>
                        {event.candidate_dates.map((date) => {
                          const vote = userVotes.find(v => v.date === date);
                          return (
                            <td key={date} className="py-2 px-2 text-center">
                              {vote ? getAvailabilityIcon(vote.availability) : <span className="text-slate-200">−</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 保存ボタン */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <button
          onClick={handleSaveVotes}
          disabled={isSaving}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
            isSaving
              ? 'bg-slate-200 text-slate-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isSaving ? '保存中...' : '回答を保存'}
        </button>
      </div>
    </div>
  );
}
