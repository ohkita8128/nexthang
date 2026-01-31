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
  const message = `🎩 あそボット より

📋「${title}」の日程調整が始まりました。

ご都合をお聞かせください。

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
  const message = `🎩 あそボット より

📋「${title}」の参加確認が始まりました。

📅 ${dateStr}

ご都合をお聞かせください。

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
  const urgency = daysLeft === 1 ? '明日が締め切り' : `あと${daysLeft}日`;
  
  const message = `🎩 あそボット より

⏰「${title}」の${typeLabel}、${urgency}でございます。

まだの方はお早めにご回答を。

▼ 回答はこちら
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
  const message = `🎩 あそボット より

📅「${title}」の日程が決まりました。

${dateStr}

皆様のご参加、お待ちしております。`;

  return sendGroupNotification({
    groupId,
    wishId,
    type: 'date_confirmed',
    message
  });
}

// おすすめ提案通知（候補あり）
export async function notifySuggestion(groupId: string, suggestions: { title: string; interestCount: number }[], liffUrl: string) {
  const list = suggestions.map(s => `・「${s.title}」${s.interestCount}人が興味あり`).join('\n');
  
  // ランダムでパターン選択（4パターン）
  const patterns = [
    // パターン1: 王道
    `🎩 あそボット より

皆様にご報告がございます。
人気の行きたい場所をお届けいたします。

${list}

ご興味ございましたら、日程調整を始めてみては。
「いつか」を「この日」に変えるお手伝い、いたします。`,

    // パターン2: 盛り上がり強調
    `🎩 あそボット より

おや、盛り上がっているようですね。

${list}

皆様の「行きたい」が集まっております。
そろそろ日程を決めてみませんか？`,

    // パターン3: 背中を押す
    `🎩 あそボット より

「行きたい」と思っている方、
実はこんなにいらっしゃいます。

${list}

誰かが声をあげれば、予定は動き出すもの。
幹事役、いかがでしょう？`,

    // パターン4: 季節感
    `🎩 あそボット より

いい季節になってまいりました。
お出かけの機運、高まっております。

${list}

カレンダーを眺める前に、
まずは日程調整を始めてみませんか。`
  ];

  const message = patterns[Math.floor(Math.random() * patterns.length)];

  return sendGroupNotification({
    groupId,
    type: 'suggestion',
    message
  });
}

// おすすめ提案通知（候補なし）
export async function notifySuggestionEmpty(groupId: string, liffUrl: string) {
  // ランダムでパターン選択（4パターン）
  const patterns = [
    // パターン1: 王道
    `🎩 あそボット より

皆様、いかがお過ごしでしょうか。

本日のおすすめをお届けしようと思いましたが、
まだ「行きたい場所」が集まっておりません。

「いつか行きたいね」
そう思っているうちに、時は過ぎてしまうもの。

ぜひ皆様の「行きたい！」をお聞かせください。`,

    // パターン2: ちょっと煽る
    `🎩 あそボット より

ご機嫌いかがでしょうか。

おすすめをお届けしたかったのですが、
「行きたい場所」がまだ空でございます。

「そのうち行こう」が「結局行けなかった」に
ならぬよう、思い立った時にぜひご提案を。`,

    // パターン3: 季節感
    `🎩 あそボット より

季節は移ろい、人は忙しくなるもの。
気づけば「また今度ね」が続いておりませんか？

行きたい場所、会いたい人。
まずは一つ、リストに追加してみませんか。`,

    // パターン5: ちょっと寂しげ
    `🎩 あそボット より

おすすめをお届けしようと参りましたが、
リストが静かでございます。

わたくし、皆様のお役に立ちたいのです。
「行きたい場所」をお聞かせいただけませんか。`
  ];

  const message = patterns[Math.floor(Math.random() * patterns.length)];

  return sendGroupNotification({
    groupId,
    type: 'suggestion',
    message
  });
}
