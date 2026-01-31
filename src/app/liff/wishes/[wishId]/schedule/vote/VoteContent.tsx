'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';

type Candidate = {
  id: string;
  date: string;
  votes: {
    id: string;
    user_id: string;
    availability: string;
    users: { display_name: string; picture_url: string | null };
  }[];
};

type Wish = { id: string; title: string };

const ROW1 = [
  { value: 'ok', label: '終日', color: 'bg-emerald-500' },
  { value: 'ng', label: '×', color: 'bg-red-500' },
  { value: 'undecided', label: '未定', color: 'bg-slate-500' },
];
const ROW2 = [
  { value: 'morning', label: '午前', color: 'bg-blue-500' },
  { value: 'afternoon', label: '午後', color: 'bg-amber-500' },
  { value: 'evening', label: '夜', color: 'bg-purple-500' },
];
const ALL_OPTIONS = [...ROW1, ...ROW2];

export default function VoteContent() {
  const { profile, isReady } = useLiff();
  const searchParams = useSearchParams();
  const params = useParams();
  const wishId = params.wishId as string;
  const groupId = searchParams.get('groupId');
  
  const [wish, setWish] = useState<Wish | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myVotesRef = useRef<Record<string, string>>({});
  const profileRef = useRef(profile);
  
  useEffect(() => { profileRef.current = profile; }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!groupId) return;
      try {
        const [wishRes, candRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/wishes`),
          fetch(`/api/wishes/${wishId}/schedule`)
        ]);
        const wishData = await wishRes.json();
        const candData = await candRes.json();
        
        if (Array.isArray(wishData)) {
          const found = wishData.find((w: Wish) => w.id === wishId);
          if (found) setWish(found);
        }
        if (Array.isArray(candData)) {
          setCandidates(candData);
          const initial: Record<string, string> = {};
          candData.forEach((c: Candidate) => {
            const myVote = c.votes?.find(v => v.users?.display_name === profile?.displayName);
            initial[c.id] = myVote?.availability || '';
          });
          setMyVotes(initial);
          myVotesRef.current = initial;
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    if (isReady && profile) fetchData();
  }, [isReady, profile, groupId, wishId]);

  const saveVotes = useCallback(async () => {
    if (!profileRef.current) return;
    const votes = Object.entries(myVotesRef.current)
      .filter(([_, v]) => v)
      .map(([candidateId, availability]) => ({ candidateId, availability }));
    try {
      await fetch(`/api/wishes/${wishId}/schedule/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: profileRef.current.userId, votes })
      });
    } catch (err) { console.error(err); }
  }, [wishId]);

  const handleVote = (candidateId: string, value: string) => {
    const newValue = myVotes[candidateId] === value ? '' : value;
    const updated = { ...myVotes, [candidateId]: newValue };
    setMyVotes(updated);
    myVotesRef.current = updated;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveVotes, 300);
  };

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveVotes(); };
  }, [saveVotes]);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return { text: `${m}/${d}(${wd})`, isSun: date.getDay() === 0, isSat: date.getDay() === 6 };
  };

  if (!isReady || isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/liff/wishes?groupId=${groupId}`} className="text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-900">日程調整</h1>
            {wish && <p className="text-xs text-slate-500">{wish.title}</p>}
          </div>
        </div>
      </header>

      <div className="bg-white divide-y divide-slate-100">
        {candidates.map((c) => {
          const { text, isSun, isSat } = formatDate(c.date);
          const vote = myVotes[c.id] || '';
          return (
            <div key={c.id} className="flex items-center px-3 py-2 gap-2">
              <span className={`text-xs font-medium w-14 shrink-0 ${isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-slate-700'}`}>{text}</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                {ROW1.map(o => (
                  <button key={o.value} onClick={() => handleVote(c.id, o.value)}
                    className={`py-1 text-[10px] font-medium rounded ${vote === o.value ? `${o.color} text-white` : 'bg-slate-100 text-slate-500'}`}>{o.label}</button>
                ))}
                {ROW2.map(o => (
                  <button key={o.value} onClick={() => handleVote(c.id, o.value)}
                    className={`py-1 text-[10px] font-medium rounded ${vote === o.value ? `${o.color} text-white` : 'bg-slate-100 text-slate-500'}`}>{o.label}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {candidates.some(c => c.votes?.length > 0) && (
        <div className="mt-3 mx-3 bg-white rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700 mb-2">回答状況</h3>
          <div className="overflow-x-auto text-[10px]">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-2 text-slate-400 font-normal sticky left-0 bg-white">名前</th>
                  {candidates.map(c => <th key={c.id} className="text-center py-1 px-0.5 text-slate-400 font-normal">{formatDate(c.date).text.split('(')[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(candidates.flatMap(c => c.votes?.map(v => v.users?.display_name) || []))).map(name => (
                  <tr key={name} className="border-t border-slate-50">
                    <td className="py-1 pr-2 text-slate-600 whitespace-nowrap sticky left-0 bg-white">{name}</td>
                    {candidates.map(c => {
                      const v = c.votes?.find(x => x.users?.display_name === name);
                      const opt = ALL_OPTIONS.find(o => o.value === v?.availability);
                      return <td key={c.id} className="text-center py-1 px-0.5">
                        {opt ? <span className={`inline-block w-4 h-4 leading-4 rounded text-white ${opt.color}`}>{opt.value === 'ok' ? '◯' : opt.value === 'ng' ? '×' : opt.label[0]}</span> : <span className="text-slate-200">-</span>}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
