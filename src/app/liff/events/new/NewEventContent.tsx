'use client';

import { useState, useEffect } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TIME_SLOTS = [
  { value: 'allday', label: '終日' },
  { value: 'morning', label: '午前' },
  { value: 'afternoon', label: '午後' },
  { value: 'evening', label: '夜' },
  { value: 'custom', label: '時間指定' },
];

export default function NewEventContent() {
  const { profile, context, isReady } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [timeSlot, setTimeSlot] = useState('allday');
  const [customTime, setCustomTime] = useState('19:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDates.length === 0 || !groupId || !profile) return;
    setIsSubmitting(true);
    
    const timeLabel = timeSlot === 'custom' ? customTime : TIME_SLOTS.find(t => t.value === timeSlot)?.label || '';
    const fullDescription = description.trim() 
      ? `${description.trim()}\n\n⏰ ${timeLabel}`
      : `⏰ ${timeLabel}`;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/events`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title: title.trim(), 
          description: fullDescription,
          candidateDates: selectedDates.sort(), 
          lineUserId: profile.userId 
        }) 
      });
      if (res.ok) router.push(`/liff/calendar?groupId=${groupId}`); else alert('作成に失敗しました');
    } catch (err) { alert('作成に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  const toggleDate = (dateStr: string) => setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  const getDaysInMonth = (date: Date) => { const year = date.getFullYear(), month = date.getMonth(); const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0); const days: (Date | null)[] = []; for (let i = 0; i < firstDay.getDay(); i++) days.push(null); for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i)); return days; };
  const formatDateStr = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const isPast = (date: Date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; };
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4"><div className="flex items-center gap-4"><Link href={`/liff/calendar?groupId=${groupId}`} className="text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link><h1 className="text-lg font-semibold text-slate-900">日程調整を作成</h1></div></header>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4"><label className="block text-sm font-medium text-slate-700 mb-2">タイトル</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 焼肉に行く日" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" required /></div>
        
        {/* 時間帯選択 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">時間帯</label>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => setTimeSlot(slot.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  timeSlot === slot.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          {timeSlot === 'custom' && (
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="mt-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4"><label className="block text-sm font-medium text-slate-700 mb-2">詳細（任意）</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: 駅前集合で" rows={2} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none" /></div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">候補日を選択（{selectedDates.length}件）</label>
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <span className="text-sm font-medium text-slate-700">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</span>
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">{weekdays.map((day, i) => <div key={day} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{days.map((date, index) => { if (!date) return <div key={`empty-${index}`} className="aspect-square" />; const dateStr = formatDateStr(date), isSelected = selectedDates.includes(dateStr), past = isPast(date), today = isToday(date), dow = date.getDay(); return <button key={dateStr} type="button" disabled={past} onClick={() => toggleDate(dateStr)} className={`aspect-square rounded-lg text-sm font-medium transition ${past ? 'text-slate-200 cursor-not-allowed' : isSelected ? 'bg-emerald-500 text-white' : today ? 'bg-slate-100 text-slate-900' : dow === 0 ? 'text-red-500 hover:bg-red-50' : dow === 6 ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>{date.getDate()}</button>; })}</div>
        </div>
        {selectedDates.length > 0 && <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-sm font-medium text-slate-700 mb-2">選択中の日程</p><div className="flex flex-wrap gap-2">{selectedDates.sort().map((dateStr) => { const [y, m, d] = dateStr.split('-').map(Number); return <span key={dateStr} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-lg">{m}/{d}({weekdays[new Date(y, m-1, d).getDay()]})<button type="button" onClick={() => toggleDate(dateStr)}>×</button></span>; })}</div></div>}
        <button type="submit" disabled={!title.trim() || selectedDates.length === 0 || isSubmitting || !groupId} className={`w-full py-3 rounded-xl text-sm font-semibold transition ${!title.trim() || selectedDates.length === 0 || isSubmitting || !groupId ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white'}`}>{isSubmitting ? '作成中...' : '作成する'}</button>
      </form>
    </div>
  );
}
