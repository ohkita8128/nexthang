import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notifyReminder, notifySuggestion, notifySuggestionEmpty } from '@/lib/line/notification';

// Vercel Cron用のAPI - 毎日実行
export async function GET(request: NextRequest) {
  // Vercel Cronからの呼び出しか確認（本番環境のみ）
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      reminders: [] as string[],
      suggestions: [] as string[]
    };

    // 1. 締め切り3日前のリマインド（日程調整）
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);
    
    const { data: scheduleReminders } = await supabase
      .from('wishes')
      .select('id, title, group_id, vote_deadline')
      .eq('status', 'voting')
      .is('start_date', null)
      .not('vote_deadline', 'is', null)
      .gte('vote_deadline', now.toISOString())
      .lte('vote_deadline', threeDaysLater.toISOString());

    for (const wish of scheduleReminders || []) {
      if (!wish.group_id || !wish.vote_deadline) continue;
      
      // 既に送信済みか確認
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('wish_id', wish.id)
        .eq('notification_type', 'schedule_reminder')
        .single();
      
      if (existing) continue;

      const deadline = new Date(wish.vote_deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/wishes/${wish.id}/schedule/vote?groupId=${wish.group_id}`;
      
      await notifyReminder(wish.group_id, wish.id, wish.title, daysLeft, 'schedule', liffUrl);
      results.reminders.push(`schedule: ${wish.title}`);
    }

    // 2. 締め切り前日のリマインド（参加確認）
    const oneDayLater = new Date(now);
    oneDayLater.setDate(oneDayLater.getDate() + 1);
    oneDayLater.setHours(23, 59, 59, 999);

    const { data: confirmReminders } = await supabase
      .from('wishes')
      .select('id, title, group_id, vote_deadline')
      .eq('voting_started', true)
      .not('start_date', 'is', null)
      .not('vote_deadline', 'is', null)
      .gte('vote_deadline', now.toISOString())
      .lte('vote_deadline', oneDayLater.toISOString());

    for (const wish of confirmReminders || []) {
      if (!wish.group_id || !wish.vote_deadline) continue;
      
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('wish_id', wish.id)
        .eq('notification_type', 'confirm_reminder')
        .single();
      
      if (existing) continue;

      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/wishes/${wish.id}/confirm?groupId=${wish.group_id}`;
      await notifyReminder(wish.group_id, wish.id, wish.title, 1, 'confirm', liffUrl);
      results.reminders.push(`confirm: ${wish.title}`);
    }

    // 3. おすすめ提案
    const { data: groups } = await supabase
      .from('group_settings')
      .select('group_id, suggest_enabled, suggest_interval_days')
      .eq('suggest_enabled', true);

    for (const group of groups || []) {
      // 最後の提案からinterval日経過しているか確認
      const { data: lastSuggestion } = await supabase
        .from('notification_logs')
        .select('sent_at')
        .eq('group_id', group.group_id)
        .eq('notification_type', 'suggestion')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSuggestion) {
        const lastSent = new Date(lastSuggestion.sent_at);
        const daysSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < group.suggest_interval_days) continue;
      }

      // グループメンバー数を取得
      const { count: memberCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.group_id);

      const minInterests = Math.max(2, Math.ceil((memberCount || 0) * 0.3));

      // 人気の行きたいを取得
      const { data: wishes } = await supabase
        .from('wishes')
        .select(`
          id, title,
          interests:wish_interests(count)
        `)
        .eq('group_id', group.group_id)
        .eq('status', 'open')
        .is('start_date', null);

      const popularWishes = (wishes || [])
        .map(w => ({
          title: w.title,
          interestCount: Array.isArray(w.interests) ? w.interests.length : 0
        }))
        .filter(w => w.interestCount >= minInterests)
        .sort((a, b) => b.interestCount - a.interestCount)
        .slice(0, 3);

      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/wishes?groupId=${group.group_id}`;

      if (popularWishes.length > 0) {
        await notifySuggestion(group.group_id, popularWishes, liffUrl);
        results.suggestions.push(`${group.group_id}: ${popularWishes.length}件`);
      } else {
        await notifySuggestionEmpty(group.group_id, liffUrl);
        results.suggestions.push(`${group.group_id}: 候補なし`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
