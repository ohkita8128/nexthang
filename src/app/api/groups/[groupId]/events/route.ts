import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// イベント一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      created_by_user:users!events_created_by_fkey(display_name, picture_url),
      votes(
        id,
        user_id,
        date,
        availability,
        users(display_name, picture_url)
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// イベント作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const body = await request.json();
  const { title, description, candidateDates, lineUserId } = body;

  if (!title || !candidateDates || candidateDates.length === 0) {
    return NextResponse.json(
      { error: 'タイトルと候補日は必須です' },
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

  // イベント作成
  const { data, error } = await supabase
    .from('events')
    .insert({
      group_id: groupId,
      title,
      description: description || null,
      candidate_dates: candidateDates,
      created_by: userData.id,
      status: 'voting',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
