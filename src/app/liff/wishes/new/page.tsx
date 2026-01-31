'use client';

import { useState, useEffect } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NewWishPage() {
  const { profile, context, isReady, error } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        // URLパラメータから groupId を取得
        const paramGroupId = searchParams.get('groupId');
        if (paramGroupId) {
          setGroupId(paramGroupId);
          return;
        }

        // LINE の正しい groupId は C で始まる
        const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
        
        if (isValidLineGroupId) {
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
          const data = await res.json();
          
          if (!res.ok) {
            if (res.status === 404) {
              setFetchError('このグループはまだ登録されていません。');
            } else {
              setFetchError(`エラー (${res.status})`);
            }
            return;
          }
          
          if (data?.id) {
            setGroupId(data.id);
          }
          return;
        }
        
        // フォールバック: user-groups から取得
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setFetchError('グループ情報の取得に失敗しました。');
          return;
        }
        
        if (data && data.length > 0) {
          setGroupId(data[0].group_id);
        } else {
          setFetchError('所属グループがありません。');
        }
      } catch (err) {
        console.error('fetchGroupId error:', err);
        setFetchError('通信エラーが発生しました。');
      }
    };

    if (isReady && profile) {
      fetchGroupId();
    }
  }, [isReady, profile, context.groupId, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !groupId || !profile) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          lineUserId: profile.userId,
          isAnonymous,
        }),
      });

      if (res.ok) {
        router.push(`/liff/wishes?groupId=${groupId}`);
      } else {
        alert('追加に失敗しました');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">エラー</h2>
          <p className="text-sm text-slate-500">{error || fetchError}</p>
          <Link
            href="/liff"
            className="inline-block mt-4 px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/liff/wishes?groupId=${groupId}`} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">候補を追加</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* タイトル */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            行きたい場所
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: ユニバ、焼肉、温泉"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            required
          />
        </div>

        {/* 詳細 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            詳細（任意）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 新しくできたやつ行ってみたい"
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
          />
        </div>

        {/* 匿名設定 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">匿名で投稿</p>
              <p className="text-xs text-slate-400 mt-0.5">名前を隠して投稿します</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isAnonymous ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isAnonymous ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting || !groupId}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
            !title.trim() || isSubmitting || !groupId
              ? 'bg-slate-200 text-slate-400'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isSubmitting ? '追加中...' : '追加する'}
        </button>
        
        {/* groupId がまだ取得できていない場合のメッセージ */}
        {!groupId && !fetchError && (
          <p className="text-center text-sm text-slate-400">グループ情報を読み込み中...</p>
        )}
      </form>
    </div>
  );
}
