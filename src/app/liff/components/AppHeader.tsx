'use client';

import Link from 'next/link';

type Props = {
  groupId: string | null;
  groupName?: string | null;
  userPicture?: string | null;
  showBack?: boolean;
  backHref?: string;
  title?: string;
};

export default function AppHeader({ groupId, groupName, userPicture, showBack, backHref, title }: Props) {
  if (showBack && backHref) {
    return (
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">あ</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">あそボット</h1>
            {groupName && <p className="text-xs text-slate-500 -mt-0.5">{groupName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/liff/groups" 
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </Link>
          {userPicture ? (
            <img src={userPicture} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-slate-200 rounded-full" />
          )}
        </div>
      </div>
    </header>
  );
}
