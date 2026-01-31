import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// LIFF開いた時にユーザーを登録する
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineUserId, displayName, pictureUrl, lineGroupId, groupId } = body;

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
    }

    // ユーザー登録/更新
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        line_user_id: lineUserId,
        display_name: displayName || null,
        picture_url: pictureUrl || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'line_user_id',
      })
      .select()
      .single();

    if (userError) {
      console.error('Error registering user:', userError);
      return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
    }

    // グループメンバー登録
    if (userData) {
      let targetGroupId = groupId; // URLパラメータから直接来たDBのグループID

      // lineGroupIdがある場合はそれからDBのグループIDを取得
      if (!targetGroupId && lineGroupId) {
        const { data: groupData } = await supabase
          .from('groups')
          .select('id')
          .eq('line_group_id', lineGroupId)
          .single();
        
        if (groupData) {
          targetGroupId = groupData.id;
        }
      }

      // グループIDがあればメンバー登録
      if (targetGroupId) {
        await supabase
          .from('group_members')
          .upsert({
            group_id: targetGroupId,
            user_id: userData.id,
          }, {
            onConflict: 'group_id,user_id',
          });
        console.log('Member registered:', displayName, '-> group:', targetGroupId);
      }
    }

    return NextResponse.json({ success: true, userId: userData.id });
  } catch (error) {
    console.error('Error in register-user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
