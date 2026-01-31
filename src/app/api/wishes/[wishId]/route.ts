import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notifyConfirmStart, notifyDateConfirmed } from '@/lib/line/notification';

// 行きたい更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ wishId: string }> }
) {
  try {
    const { wishId } = await params;
    const body = await request.json();
    const { votingStarted, confirmedDate, voteDeadline } = body;

    // 更新前のデータを取得
    const { data: beforeData } = await supabase
      .from('wishes')
      .select('title, group_id, start_date, start_time, voting_started, status')
      .eq('id', wishId)
      .single();

    const updateData: Record<string, unknown> = {};
    if (votingStarted !== undefined) updateData.voting_started = votingStarted;
    if (confirmedDate !== undefined) {
      updateData.confirmed_date = confirmedDate;
      updateData.status = 'confirmed';
    }
    if (voteDeadline !== undefined) updateData.vote_deadline = voteDeadline;

    const { data, error } = await supabase
      .from('wishes')
      .update(updateData)
      .eq('id', wishId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wish:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 参加確認開始通知
    if (votingStarted && !beforeData?.voting_started && beforeData?.group_id && beforeData?.title && beforeData?.start_date) {
      const [y, m, d] = beforeData.start_date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      let dateStr = `${m}/${d}(${wd})`;
      if (beforeData.start_time) dateStr += ` ${beforeData.start_time.slice(0, 5)}`;
      
      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/wishes/${wishId}/confirm?groupId=${beforeData.group_id}`;
      notifyConfirmStart(beforeData.group_id, wishId, beforeData.title, dateStr, liffUrl).catch(console.error);
    }

    // 日程確定通知
    if (confirmedDate && beforeData?.group_id && beforeData?.title) {
      const [y, m, d] = confirmedDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      const dateStr = `${m}/${d}(${wd})`;
      
      notifyDateConfirmed(beforeData.group_id, wishId, beforeData.title, dateStr).catch(console.error);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 行きたい削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wishId: string }> }
) {
  try {
    const { wishId } = await params;

    const { error } = await supabase
      .from('wishes')
      .delete()
      .eq('id', wishId);

    if (error) {
      console.error('Error deleting wish:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
