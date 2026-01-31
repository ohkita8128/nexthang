import { supabase } from '@/lib/supabase/client';

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

type NotificationType = 
  | 'schedule_start'
  | 'schedule_reminder'
  | 'schedule_result'
  | 'confirm_start'
  | 'confirm_reminder'
  | 'date_confirmed'
  | 'suggestion';

interface SendNotificationParams {
  groupId: string;
  wishId?: string;
  type: NotificationType;
  message: string;
}

// グループにLINE通知を送信
export async function sendGroupNotification({ groupId, wishId, type, message }: SendNotificationParams): Promise<boolean> {
  try {
    // グループ設定を確認
    const { data: settings } = await supabase
      .from('group_settings')
      .select('*')
      .eq('group_id', groupId)
      .single();

    // 通知が無効な場合はスキップ
    if (settings) {
      if (type.includes('schedule') && !settings.notify_schedule_start) return false;
      if (type.includes('reminder') && !settings.notify_reminder) return false;
      if (type === 'date_confirmed' && !settings.notify_confirmed) return false;
      if (type === 'suggestion' && !settings.suggest_enabled) return false;
    }

    // 重複チェック
    if (wishId) {
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('group_id', groupId)
        .eq('wish_id', wishId)
        .eq('notification_type', type)
        .single();

      if (existing) {
        console.log('Notification already sent:', type, wishId);
        return false;
      }
    }

    // グループのLINE IDを取得
    const { data: group } = await supabase
      .from('groups')
      .select('line_group_id')
      .eq('id', groupId)
      .single();

    if (!group?.line_group_id) {
      console.error('No LINE group ID found');
      return false;
    }

    // LINE APIで送信
    const response = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: group.line_group_id,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE API error:', error);
      return false;
    }

    // 通知ログを記録
    if (wishId) {
      await supabase
        .from('notification_logs')
        .insert({
          group_id: groupId,
          wish_id: wishId,
          notification_type: type
        });
    }

    // グループのlast_activity_atを更新
    await supabase
      .from('groups')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', groupId);

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

// 日程調整開始通知
export async function notifyScheduleStart(groupId: string, wishId: string, title: string, liffUrl: string) {
  const message = `📅 日程調整が始まりました！

「${title}」

▼ 回答はこちら
${liffUrl}`;

  return sendGroupNotification({
    groupId,
    wishId,
    type: 'schedule_start',
    message
  });
}

// 参加確認開始通知
export async function notifyConfirmStart(groupId: string, wishId: string, title: string, dateStr: string, liffUrl: string) {
  const message = `✅ 参加確認が始まりました！

「${title}」
📅 ${dateStr}

▼ 回答はこちら
${liffUrl}`;

  return sendGroupNotification({
    groupId,
    wishId,
    type: 'confirm_start',
    message
  });
}

// 締め切りリマインド通知
export async function notifyReminder(groupId: string, wishId: string, title: string, daysLeft: number, type: 'schedule' | 'confirm', liffUrl: string) {
  const typeLabel = type === 'schedule' ? '日程調整' : '参加確認';
  const message = `⏰ ${typeLabel}の締め切りが近づいています！

「${title}」
あと${daysLeft}日で締め切り

▼ まだの方は回答を
${liffUrl}`;

  return sendGroupNotification({
    groupId,
    wishId,
    type: type === 'schedule' ? 'schedule_reminder' : 'confirm_reminder',
    message
  });
}

// 日程確定通知
export async function notifyDateConfirmed(groupId: string, wishId: string, title: string, dateStr: string) {
  const message = `🎉 日程が決定しました！

「${title}」
📅 ${dateStr}

楽しみにしてね！`;

  return sendGroupNotification({
    groupId,
    wishId,
    type: 'date_confirmed',
    message
  });
}

// おすすめ提案通知
export async function notifySuggestion(groupId: string, suggestions: { title: string; interestCount: number }[], liffUrl: string) {
  const list = suggestions.map(s => `・「${s.title}」${s.interestCount}人が興味あり`).join('\n');
  const message = `🎯 そろそろ遊びませんか？

人気の行きたいリスト:
${list}

▼ 日程調整を始める
${liffUrl}`;

  return sendGroupNotification({
    groupId,
    type: 'suggestion',
    message
  });
}
