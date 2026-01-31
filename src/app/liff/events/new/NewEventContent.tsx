'use client';

import { useState, useEffect } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NewEventContent() {
  const { profile, context, isReady } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('21:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const todayStr = formatDateInput(today);
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  useEffect(() => {
    const fetchGroupId = async () => {
      const paramGroupId = searchParams.get('groupId');
      if (paramGroupId) { setGroupId(paramGroupId); return; }
      const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
      if (isValidLineGroupId) { const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`); const data = await res.json(); if (data?.id) { setGroupId(data.id); return; } }
      const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`); const data = await res.json();
      if (data && data.length > 0) setGroupId(data[0].group_id);
    };
    if (isReady && profile) fetchGroupId();
  }, [isReady, profile, context.groupId, searchParams]);

  const formatDateInput = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${m}/${d}(${weekdays[date.getDay()]})`;
  };

  const getEventPeriodText = () => {
    if (!startDate) return '';
    
    const start = formatDateDisplay(startDate);
    const end = formatDateDisplay(endDate);
    
    if (isAllDay) {
      if (startDate === endDate) {
        return `📅 ${start} 終日`;
      }
      return `📅 ${start} 〜 ${end}`;
    }
    
    if (startDate === endDate) {
      return `📅 ${start} ${startTime}〜${endTime}`;
    }
    return `📅 ${start} ${startTime} 〜 ${end} ${endTime}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !groupId || !profile) return;
    setIsSubmitting(true);
    
    const periodText = getEventPeriodText();
    const fullDescription = description.trim() 
      ? `${periodText}\n\n${description.trim()}`
      : periodText;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/events`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title: title.trim(), 
          description: fullDescription,
          candidateDates: [startDate],
          lineUserId: profile.userId 
        }) 
      });
      if (res.ok) router.push(`/liff/calendar?groupId=${groupId}`); else alert('作成に失敗しました');
    } catch (err) { alert('作成に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-4">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/liff/calendar?groupId=${groupId}`} className="text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">予定を追加</h1>
        </div>
      </header>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">タイトル</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 夏祭り、フェス、飲み会" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
        </div>

        {/* 終日トグル */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">終日</span>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isAllDay ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAllDay ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* 開始 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">開始</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
              className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
            {!isAllDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            )}
          </div>
        </div>

        {/* 終了 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">終了</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
            {!isAllDay && (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: 駅前集合、チケット代3000円" rows={3} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none" />
        </div>

        {/* プレビュー */}
        {startDate && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <p className="text-sm font-medium text-emerald-800 mb-1">{title || '(タイトル未入力)'}</p>
            <p className="text-sm text-emerald-600">{getEventPeriodText()}</p>
          </div>
        )}

        <button type="submit" disabled={!title.trim() || !startDate || isSubmitting || !groupId} className={`w-full py-3 rounded-xl text-sm font-semibold transition ${!title.trim() || !startDate || isSubmitting || !groupId ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{isSubmitting ? '作成中...' : '作成する'}</button>
      </form>
    </div>
  );
}
