import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// 投票一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const { data, error } = await supabase
    .from('votes')
    .select(`
      *,
      users(display_name, picture_url)
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 投票を保存（まとめて）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { lineUserId, votes } = body;
  // votes: [{ date: '2025-02-01', availability: 'ok' | 'maybe' | 'ng' }, ...]

  if (!lineUserId || !votes || !Array.isArray(votes)) {
    return NextResponse.json(
      { error: '投票データが不正です' },
      { status: 400 }
    );
  }

  // ユーザーIDを取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  if (userError || !userData) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }

  // 既存の投票を削除
  await supabase
    .from('votes')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userData.id);

  // 新しい投票を挿入
  const votesToInsert = votes.map((v: { date: string; availability: string }) => ({
    event_id: eventId,
    user_id: userData.id,
    date: v.date,
    availability: v.availability,
  }));

  const { data, error } = await supabase
    .from('votes')
    .insert(votesToInsert)
    .select();

  if (error) {
    console.error('Error saving votes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
