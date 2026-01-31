import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineGroupId = searchParams.get('lineGroupId');

    console.log('lineGroupId:', lineGroupId);

    if (!lineGroupId) {
      return NextResponse.json({ error: 'lineGroupId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('line_group_id', lineGroupId)
      .maybeSingle();

    console.log('data:', data, 'error:', error);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}