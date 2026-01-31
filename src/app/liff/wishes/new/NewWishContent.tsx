'use client';

import { useState, useEffect } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NewWishContent() {
  const { profile, context, isReady, error } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasDateTime, setHasDateTime] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('21:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

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
        if (res.ok && data && data.length > 0) setGroupId(data[0].group_id); 
        else setFetchError('グループが見つかりません');
      } catch (err) { setFetchError('通信エラー'); }
    };
    if (isReady && profile) fetchGroupId();
  }, [isReady, profile, context.groupId, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !groupId || !profile) return;
    setIsSubmitting(true);
    
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        lineUserId: profile.userId,
        isAnonymous: false,
      };
      
      if (hasDateTime) {
        body.startDate = startDate;
        body.startTime = isAllDay ? null : startTime;
        body.endDate = endDate;
        body.endTime = isAllDay ? null : endTime;
        body.isAllDay = isAllDay;
      }
      
      const res = await fetch(`/api/groups/${groupId}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (res.ok) router.push(`/liff/wishes?groupId=${groupId}`);
      else alert('追加に失敗しました');
    } catch (err) { alert('追加に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (error || fetchError) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="bg-white rounded-xl border p-6 text-center"><p className="text-slate-500">{error || fetchError}</p><Link href="/liff" className="inline-block mt-4 px-4 py-2 bg-slate-100 text-sm rounded-lg">戻る</Link></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-4">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/liff/wishes?groupId=${groupId}`} className="text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">行きたいを追加</h1>
        </div>
      </header>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">タイトル</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="例: 夏祭り、焼肉、フェス" 
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
            required 
          />
        </div>

        {/* 日時設定トグル */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">日時を設定する</p>
              <p className="text-xs text-slate-400 mt-0.5">コンサートなど日程が決まっている場合</p>
            </div>
            <button
              type="button"
              onClick={() => setHasDateTime(!hasDateTime)}
              className={`relative w-11 h-6 rounded-full transition-colors ${hasDateTime ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hasDateTime ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* 日時設定フォーム */}
        {hasDateTime && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
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

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">開始</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setStartDate(newStartDate);
                    // 終了日が開始日より前なら、終了日を開始日に合わせる
                    if (newStartDate > endDate) {
                      setEndDate(newStartDate);
                    }
                    // 同じ日で終了時間が開始時間より前なら、終了時間を開始時間に合わせる
                    if (newStartDate === endDate && startTime > endTime) {
                      setEndTime(startTime);
                    }
                  }}
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setStartTime(newStartTime);
                      // 同じ日で終了時間が開始時間より前なら、終了時間を開始時間に合わせる
                      if (startDate === endDate && newStartTime > endTime) {
                        setEndTime(newStartTime);
                      }
                    }}
                    className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">終了</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setEndDate(newEndDate);
                    // 同じ日で終了時間が開始時間より前なら、終了時間を開始時間に合わせる
                    if (startDate === newEndDate && endTime < startTime) {
                      setEndTime(startTime);
                    }
                  }}
                  min={startDate}
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    min={startDate === endDate ? startTime : undefined}
                    className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder={hasDateTime ? "例: 駅前集合、チケット代3000円" : "例: 3月くらいに行きたい、新しくできたやつ"} 
            rows={3} 
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none" 
          />
        </div>

        <button 
          type="submit" 
          disabled={!title.trim() || isSubmitting || !groupId} 
          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${!title.trim() || isSubmitting || !groupId ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          {isSubmitting ? '追加中...' : '追加する'}
        </button>
      </form>
    </div>
  );
}
