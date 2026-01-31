'use client';

import { useEffect, useState } from 'react';
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

export default function CalendarPage() {
  const { profile, context, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupId = async () => {
      const paramGroupId = searchParams.get('groupId');
      if (paramGroupId) {
        setGroupId(paramGroupId);
        return;
      }

      const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
      if (isValidLineGroupId) {
        const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
        const data = await res.json();
        if (data?.id) {
          setGroupId(data.id);
          return;
        }
      }

      const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setGroupId(data[0].group_id);
      }
    };

    if (isReady && profile) {
      fetchGroupId();
    }
  }, [isReady, profile, context.groupId, searchParams]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!groupId) return;

      try {
        const res = await fetch(`/api/groups/${groupId}/events`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [groupId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'voting':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">投票中</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">確定</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">キャンセル</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-lg font-semibold text-slate-900">日程調整</h1>
      </header>

      <main className="px-4 py-6 space-y-4">
        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-500 mb-4">まだ予定がありません</p>
            <Link
              href={`/liff/events/new?groupId=${groupId}`}
              className="inline-block px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
            >
              日程調整を作成
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const votedCount = new Set(event.votes.map(v => v.user_id)).size;
              
              return (
                <Link
                  key={event.id}
                  href={`/liff/events/${event.id}?groupId=${groupId}`}
                  className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    {getStatusBadge(event.status)}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-slate-500 mb-3">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {event.candidate_dates.slice(0, 3).map((date) => (
                      <span key={date} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                        {formatDate(date)}
                      </span>
                    ))}
                    {event.candidate_dates.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded">
                        +{event.candidate_dates.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{event.created_by_user?.display_name || '不明'}</span>
                    <span>{votedCount}人が回答</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* 作成ボタン */}
      <Link
        href={`/liff/events/new?groupId=${groupId}`}
        className="fixed bottom-24 right-4 w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href={`/liff?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">ホーム</span>
          </Link>
          <Link href={`/liff/calendar?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h12a1 1 0 100-2H6z"/>
            </svg>
            <span className="text-xs text-slate-900 mt-1">カレンダー</span>
          </Link>
          <Link href={`/liff/wishes?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">行きたい</span>
          </Link>
          <Link href={`/liff/settings?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
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
