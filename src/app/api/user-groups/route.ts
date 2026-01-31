import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lineUserId = searchParams.get('lineUserId');

  if (!lineUserId) {
    return NextResponse.json({ error: 'lineUserId required' }, { status: 400 });
  }

  // ユーザーID取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 所属グループ取得
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, user_id, groups(id, name, line_group_id, last_activity_at)')
    .eq('user_id', userData.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
