'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLiff } from '@/hooks/use-liff';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type GroupSettings = {
  id: string;
  group_id: string;
  notify_schedule_start: boolean;
  notify_reminder: boolean;
  notify_confirmed: boolean;
  suggest_enabled: boolean;
  suggest_interval_days: number;
  suggest_min_interests: number;
};

export default function SettingsContent() {
  const { profile, context, isReady } = useLiff();
  const searchParams = useSearchParams();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const paramGroupId = searchParams.get('groupId');
        if (paramGroupId) {
          setGroupId(paramGroupId);
          return;
        }
        const isValidLineGroupId = context.groupId && context.groupId.startsWith('C');
        if (isValidLineGroupId) {
          const res = await fetch(`/api/groups/by-line-id?lineGroupId=${context.groupId}`);
          const data = await res.json();
          if (res.ok && data?.id) {
            setGroupId(data.id);
            setGroupName(data.name);
            return;
          }
        }
        const res = await fetch(`/api/user-groups?lineUserId=${profile?.userId}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setGroupId(data[0].group_id);
          setGroupName(data[0].groups?.name || null);
        }
      } catch (err) { console.error(err); }
    };
    if (isReady && profile) init();
  }, [isReady, profile, context.groupId, searchParams]);

  const fetchSettings = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/settings`);
      const data = await res.json();
      if (data && !data.error) {
        setSettings(data);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [groupId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: keyof GroupSettings, value: boolean | number) => {
    if (!groupId || !settings) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      const data = await res.json();
      if (data && !data.error) {
        setSettings(data);
      }
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
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
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-lg font-semibold text-slate-900">設定</h1>
        {groupName && <p className="text-xs text-slate-500">{groupName}</p>}
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* プロフィール */}
        {profile && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {profile.pictureUrl && (
                <img src={profile.pictureUrl} alt="" className="w-12 h-12 rounded-full" />
              )}
              <div>
                <p className="font-medium text-slate-900">{profile.displayName}</p>
                <p className="text-sm text-slate-400">LINE アカウント</p>
              </div>
            </div>
          </div>
        )}

        {/* グループ通知設定 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">🔔 グループ通知</h2>
            <p className="text-xs text-slate-400 mt-0.5">グループ全員に送信される通知の設定</p>
          </div>

          {/* 日程調整・参加確認の開始通知 */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-700">開始通知</p>
              <p className="text-xs text-slate-400">日程調整・参加確認が始まった時</p>
            </div>
            <button
              onClick={() => updateSetting('notify_schedule_start', !settings?.notify_schedule_start)}
              disabled={isSaving}
              className={`w-12 h-7 rounded-full transition ${
                settings?.notify_schedule_start ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.notify_schedule_start ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* リマインド通知 */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-700">リマインド通知</p>
              <p className="text-xs text-slate-400">締め切り前のリマインド</p>
            </div>
            <button
              onClick={() => updateSetting('notify_reminder', !settings?.notify_reminder)}
              disabled={isSaving}
              className={`w-12 h-7 rounded-full transition ${
                settings?.notify_reminder ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.notify_reminder ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* 日程確定通知 */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">日程確定通知</p>
              <p className="text-xs text-slate-400">日程が確定した時</p>
            </div>
            <button
              onClick={() => updateSetting('notify_confirmed', !settings?.notify_confirmed)}
              disabled={isSaving}
              className={`w-12 h-7 rounded-full transition ${
                settings?.notify_confirmed ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.notify_confirmed ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* おすすめ提案設定 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">🎯 おすすめ提案</h2>
            <p className="text-xs text-slate-400 mt-0.5">人気の行きたいをグループに提案</p>
          </div>

          {/* 提案機能ON/OFF */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-700">おすすめ提案</p>
              <p className="text-xs text-slate-400">定期的に人気の行きたいを提案</p>
            </div>
            <button
              onClick={() => updateSetting('suggest_enabled', !settings?.suggest_enabled)}
              disabled={isSaving}
              className={`w-12 h-7 rounded-full transition ${
                settings?.suggest_enabled ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.suggest_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* 提案頻度 */}
          {settings?.suggest_enabled && (
            <>
              <div className="p-4 border-b border-slate-100">
                <p className="text-sm text-slate-700 mb-2">提案頻度</p>
                <div className="flex gap-2">
                  {[14, 30, 60].map((days) => (
                    <button
                      key={days}
                      onClick={() => updateSetting('suggest_interval_days', days)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm rounded-lg transition ${
                        settings?.suggest_interval_days === days
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {days === 14 ? '2週間' : days === 30 ? '1ヶ月' : '2ヶ月'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 最低興味あり人数 */}
              <div className="p-4">
                <p className="text-sm text-slate-700 mb-2">提案条件</p>
                <div className="flex gap-2">
                  {[2, 3, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => updateSetting('suggest_min_interests', count)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm rounded-lg transition ${
                        settings?.suggest_min_interests === count
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}人以上興味あり
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* バージョン */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-300">あそボット v1.1.0</p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around py-2">
          <Link href={`/liff?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">ホーム</span>
          </Link>
          <Link href={`/liff/calendar?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">カレンダー</span>
          </Link>
          <Link href={`/liff/wishes?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-xs text-slate-400 mt-1">行きたい</span>
          </Link>
          <Link href={`/liff/settings?groupId=${groupId}`} className="flex flex-col items-center py-1 px-3">
            <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs text-slate-900 mt-1">設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
