import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notifyScheduleStart } from '@/lib/line/notification';

// 候補日一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wishId: string }> }
) {
  try {
    const { wishId } = await params;

    const { data, error } = await supabase
      .from('schedule_candidates')
      .select(`
        id,
        date,
        schedule_votes(
          id,
          user_id,
          availability,
          users(display_name, picture_url)
        )
      `)
      .eq('wish_id', wishId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // フォーマット調整
    const formatted = data?.map(c => ({
      id: c.id,
      date: c.date,
      votes: c.schedule_votes || []
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 候補日作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wishId: string }> }
) {
  try {
    const { wishId } = await params;
    const body = await request.json();
    const { dates, voteDeadline } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'dates required' }, { status: 400 });
    }

    // wish情報を取得
    const { data: wish } = await supabase
      .from('wishes')
      .select('title, group_id')
      .eq('id', wishId)
      .single();

    // 既存の候補日を削除
    await supabase
      .from('schedule_candidates')
      .delete()
      .eq('wish_id', wishId);

    // 新しい候補日を追加
    const insertData = dates.map((date: string) => ({
      wish_id: wishId,
      date
    }));

    const { data, error } = await supabase
      .from('schedule_candidates')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Error creating candidates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // wishのstatusと締め切りを更新
    await supabase
      .from('wishes')
      .update({ 
        status: 'voting',
        vote_deadline: voteDeadline || null
      })
      .eq('id', wishId);

    // 通知を送信
    if (wish?.group_id && wish?.title) {
      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/wishes/${wishId}/schedule/vote?groupId=${wish.group_id}`;
      notifyScheduleStart(wish.group_id, wishId, wish.title, liffUrl).catch(console.error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
