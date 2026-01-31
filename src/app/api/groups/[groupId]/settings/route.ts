import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// 設定取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // 既存の設定を取得、なければデフォルト値で作成
    let { data, error } = await supabase
      .from('group_settings')
      .select('*')
      .eq('group_id', groupId)
      .single();

    if (error && error.code === 'PGRST116') {
      // レコードがない場合は作成
      const { data: newData, error: insertError } = await supabase
        .from('group_settings')
        .insert({ group_id: groupId })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating settings:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      data = newData;
    } else if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 設定更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('group_settings')
      .upsert({
        group_id: groupId,
        ...body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
