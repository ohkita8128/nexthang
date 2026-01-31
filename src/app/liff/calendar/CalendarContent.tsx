'use client';

import { useEffect, useState } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type WishResponse = {
  id: string;
  response: 'ok' | 'maybe' | 'ng';
  users: { display_name: string };
};

type Wish = {
  id: string;
  title: string;
  start_date: string | null;
  start_time: string | null;
  is_all_day: boolean;
  status: 'open' | 'voting' | 'confirmed';
  voting_started: boolean;
  confirmed_date: string | null;
  interests: { id: string; users: { display_name: string } }[];
  wish_responses: WishResponse[];
};

export default function CalendarContent() {
  const { profile, context, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchGroupId = async () => {
      const paramGroupId = searchParams.get('groupId');
      if (paramGroupId) { setGroupId(paramGroupId); return; }
      const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
      if (isValidLineGroupId) {
        const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
        const data = await res.json();
        if (data?.id) { setGroupId(data.id); return; }
      }
      const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
      const data = await res.json();
      if (data && data.length > 0) setGroupId(data[0].group_id);
    };
    if (isReady && profile) fetchGroupId();
  }, [isReady, profile, context.groupId, searchParams]);

  useEffect(() => {
    const fetchWishes = async () => {
      if (!groupId) return;
      try {
        const res = await fetch(`/api/groups/${groupId}/wishes`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const withDate = data.filter((w: Wish) => w.start_date);
          withDate.sort((a: Wish, b: Wish) => (a.start_date || '').localeCompare(b.start_date || ''));
          setWishes(withDate);
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchWishes();
  }, [groupId]);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return { text: `${m}/${d}(${wd})`, isSun: date.getDay() === 0, isSat: date.getDay() === 6 };
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const formatDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const getWishesForDate = (date: Date) => wishes.filter(w => w.start_date === formatDateKey(date));

  // 表示月の予定をフィルタ
  const getMonthWishes = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return wishes.filter(w => {
      if (!w.start_date) return false;
      const [y, m] = w.start_date.split('-').map(Number);
      return y === year && m === month + 1;
    });
  };

  const getResponseCounts = (wish: Wish) => {
    if (!wish.wish_responses) return { ok: 0, maybe: 0, ng: 0 };
    return {
      ok: wish.wish_responses.filter(r => r.response === 'ok').length,
      maybe: wish.wish_responses.filter(r => r.response === 'maybe').length,
      ng: wish.wish_responses.filter(r => r.response === 'ng').length,
    };
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  if (!isReady || isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  const days = getDaysInMonth(currentMonth);
  const monthWishes = getMonthWishes();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <h1 className="text-base font-semibold text-slate-900">カレンダー</h1>
      </header>

      {/* カレンダー */}
      <div className="bg-white border-b border-slate-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1.5 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-slate-700">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1.5 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekdays.map((day, i) => (
            <div key={day} className={`text-center text-[10px] font-medium py-0.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
            const dayWishes = getWishesForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const dow = date.getDay();
            return (
              <div key={formatDateKey(date)} className={`aspect-square rounded text-xs flex flex-col items-center justify-start pt-0.5 ${isToday ? 'bg-slate-100' : ''}`}>
                <span className={`text-[11px] ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700'}`}>{date.getDate()}</span>
                {dayWishes.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayWishes.slice(0, 3).map((w, i) => (
                      <div 
                        key={i} 
                        className={`w-1 h-1 rounded-full ${
                          w.status === 'confirmed' ? 'bg-blue-500' 
                          : w.voting_started ? 'bg-emerald-500' 
                          : 'bg-slate-300'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 月の予定リスト */}
      <div className="px-3 py-2">
        <h2 className="text-xs font-semibold text-slate-500 mb-2">{currentMonth.getMonth() + 1}月の予定</h2>
        {monthWishes.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-400">予定はありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {monthWishes.map((wish) => {
              const { text, isSun, isSat } = formatDate(wish.start_date!);
              const counts = getResponseCounts(wish);
              return (
                <Link key={wish.id} href={`/liff/wishes?groupId=${groupId}`} className="flex items-center px-3 py-2 gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    wish.status === 'confirmed' ? 'bg-blue-500' 
                    : wish.voting_started ? 'bg-emerald-500' 
                    : 'bg-slate-300'
                  }`} />
                  <span className={`text-xs w-14 shrink-0 ${isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-slate-500'}`}>{text}</span>
                  <span className="text-sm text-slate-900 flex-1 truncate">{wish.title}</span>
                  {wish.status === 'confirmed' ? (
                    <span className="text-[10px] text-blue-500 shrink-0">✓確定</span>
                  ) : wish.voting_started ? (
                    <span className="text-[10px] text-slate-400 shrink-0">
                      <span className="text-emerald-500">◯{counts.ok}</span>
                      <span className="text-amber-500 ml-0.5">△{counts.maybe}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 shrink-0">{wish.interests.length}人</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link href={`/liff/wishes/new?groupId=${groupId}`} className="fixed bottom-20 right-4 w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </Link>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href={`/liff?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-xs text-slate-400 mt-1">ホーム</span></Link>
          <Link href={`/liff/calendar?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h12a1 1 0 100-2H6z"/></svg><span className="text-xs text-slate-900 mt-1">カレンダー</span></Link>
          <Link href={`/liff/wishes?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg><span className="text-xs text-slate-400 mt-1">行きたい</span></Link>
          <Link href={`/liff/settings?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-xs text-slate-400 mt-1">設定</span></Link>
        </div>
      </nav>
    </div>
  );
}
