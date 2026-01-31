import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@line/bot-sdk';
import { lineClient } from '@/lib/line/client';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events;

    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handleEvent(event: WebhookEvent) {
  console.log('Event received:', event.type);

  switch (event.type) {
    case 'follow':
      await handleFollow(event);
      break;
    case 'join':
      await handleJoin(event);
      break;
    case 'memberJoined':
      await handleMemberJoined(event);
      break;
    case 'leave':
      await handleLeave(event);
      break;
    case 'memberLeft':
      await handleMemberLeft(event);
      break;
    case 'message':
      await handleMessage(event);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }
}

// 友達追加時
async function handleFollow(event: WebhookEvent & { type: 'follow' }) {
  const userId = event.source.userId;
  if (!userId) return;

  try {
    const profile = await lineClient.getProfile(userId);

    const { error } = await supabase
      .from('users')
      .upsert({
        line_user_id: userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'line_user_id',
      });

    if (error) {
      console.error('Error saving user:', error);
    } else {
      console.log('User saved:', profile.displayName);
    }

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: `${profile.displayName}さん、こんにちは！\nあそボット へようこそ 🎉\n\nグループに招待すると、予定調整ができるようになります！`,
      }],
    });
  } catch (error) {
    console.error('Error in handleFollow:', error);
  }
}

// グループ参加時
async function handleJoin(event: WebhookEvent & { type: 'join' }) {
  const source = event.source;
  if (source.type !== 'group') return;

  const groupId = source.groupId;

  try {
    // グループ名を取得
    let groupName = null;
    try {
      const groupSummary = await lineClient.getGroupSummary(groupId!);
      groupName = groupSummary.groupName;
    } catch (e) {
      console.log('Could not get group name:', e);
    }

    const { data: groupData, error } = await supabase
      .from('groups')
      .upsert({
        line_group_id: groupId,
        name: groupName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'line_group_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving group:', error);
    } else {
      console.log('Group saved:', groupName || groupId);
    }

    // 既存メンバーを全員取得して登録
    if (groupData) {
      try {
        const memberIds = await lineClient.getGroupMembersIds(groupId!);
        console.log(`Found ${memberIds.memberIds.length} existing members`);
        
        for (const memberId of memberIds.memberIds) {
          try {
            const profile = await lineClient.getGroupMemberProfile(groupId!, memberId);
            
            const { data: userData } = await supabase
              .from('users')
              .upsert({
                line_user_id: memberId,
                display_name: profile.displayName,
                picture_url: profile.pictureUrl,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'line_user_id',
              })
              .select()
              .single();

            if (userData) {
              await supabase
                .from('group_members')
                .upsert({
                  group_id: groupData.id,
                  user_id: userData.id,
                }, {
                  onConflict: 'group_id,user_id',
                });
              console.log('Existing member registered:', profile.displayName);
            }
          } catch (memberErr) {
            console.error('Error registering member:', memberId, memberErr);
          }
        }
      } catch (membersErr) {
        console.error('Error getting group members:', membersErr);
      }
    }

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: `グループに参加しました！🎉\n\nこれから予定調整をお手伝いします。\n「メニュー」と送ると管理画面を開けます！`,
      }],
    });
  } catch (error) {
    console.error('Error in handleJoin:', error);
  }
}

// メンバー参加時
async function handleMemberJoined(event: WebhookEvent & { type: 'memberJoined' }) {
  const source = event.source;
  if (source.type !== 'group') return;

  const groupId = source.groupId;
  const members = event.joined.members;

  for (const member of members) {
    if (member.type !== 'user') continue;

    const userId = member.userId;

    try {
      const profile = await lineClient.getGroupMemberProfile(groupId, userId);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          line_user_id: userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'line_user_id',
        })
        .select()
        .single();

      if (userError) {
        console.error('Error saving user:', userError);
        continue;
      }

      const { data: groupData } = await supabase
        .from('groups')
        .select('id')
        .eq('line_group_id', groupId)
        .single();

      if (!groupData) continue;

      await supabase
        .from('group_members')
        .upsert({
          group_id: groupData.id,
          user_id: userData.id,
        }, {
          onConflict: 'group_id,user_id',
        });

      console.log('Member added:', profile.displayName);
    } catch (error) {
      console.error('Error in handleMemberJoined:', error);
    }
  }
}

// Bot がグループ退出時
async function handleLeave(event: WebhookEvent & { type: 'leave' }) {
  const source = event.source;
  if (source.type !== 'group') return;

  const groupId = source.groupId;

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('line_group_id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
  } else {
    console.log('Group deleted:', groupId);
  }
}

// メンバー退出時
async function handleMemberLeft(event: WebhookEvent & { type: 'memberLeft' }) {
  const source = event.source;
  if (source.type !== 'group') return;

  const groupId = source.groupId;
  const members = event.left.members;

  for (const member of members) {
    if (member.type !== 'user') continue;

    const userId = member.userId;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('line_user_id', userId)
        .single();

      if (!userData) continue;

      const { data: groupData } = await supabase
        .from('groups')
        .select('id')
        .eq('line_group_id', groupId)
        .single();

      if (!groupData) continue;

      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupData.id)
        .eq('user_id', userData.id);

      console.log('Member removed:', userId);
    } catch (error) {
      console.error('Error in handleMemberLeft:', error);
    }
  }
}

// メッセージ受信時
async function handleMessage(event: WebhookEvent & { type: 'message' }) {
  if (event.message.type !== 'text') return;

  const text = event.message.text.toLowerCase();
  const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

  // グループからのメッセージの場合、ユーザーを group_members に自動登録
  if (event.source.type === 'group' && event.source.userId) {
    const groupId = event.source.groupId;
    const userId = event.source.userId;

    try {
      // ユーザー情報を取得・登録
      const profile = await lineClient.getGroupMemberProfile(groupId!, userId);
      
      const { data: userData } = await supabase
        .from('users')
        .upsert({
          line_user_id: userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'line_user_id',
        })
        .select()
        .single();

      // グループ情報を取得（グループ名は毎回最新を取得）
      let { data: groupData } = await supabase
        .from('groups')
        .select('id, name')
        .eq('line_group_id', groupId)
        .single();

      // グループ名を取得して更新（毎回最新に）
      let groupName = null;
      try {
        const groupSummary = await lineClient.getGroupSummary(groupId!);
        groupName = groupSummary.groupName;
      } catch (e) {
        console.log('Could not get group name:', e);
      }

      // グループがない、または名前が変わった場合は更新
      if (!groupData || groupData.name !== groupName) {
        const { data: upsertedGroup } = await supabase
          .from('groups')
          .upsert({
            line_group_id: groupId,
            name: groupName,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'line_group_id',
          })
          .select()
          .single();
        
        groupData = upsertedGroup;
        if (groupName) {
          console.log('Group name updated:', groupName);
        }
      } else {
        // 名前が同じでもlast_activity_atは更新
        await supabase
          .from('groups')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('line_group_id', groupId);
      }

      // group_members に登録
      if (userData && groupData) {
        await supabase
          .from('group_members')
          .upsert({
            group_id: groupData.id,
            user_id: userData.id,
          }, {
            onConflict: 'group_id,user_id',
          });
        console.log('Member registered via message:', profile.displayName);
      }
    } catch (err) {
      console.error('Error registering member:', err);
    }
  }

  if (text === 'メニュー' || text === 'めにゅー' || text === 'menu') {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'flex',
        altText: 'メニュー',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📱 あそボット',
                weight: 'bold',
                size: 'lg',
              },
              {
                type: 'text',
                text: '予定を管理しよう！',
                size: 'sm',
                color: '#666666',
                margin: 'md',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#22c55e',
                action: {
                  type: 'uri',
                  label: '管理画面を開く',
                  uri: liffUrl,
                },
              },
            ],
          },
        },
      }],
    });
  }

  // メンバー同期コマンド
  if ((text === '同期' || text === 'sync') && event.source.type === 'group') {
    const groupId = event.source.groupId;
    
    try {
      const { data: groupData } = await supabase
        .from('groups')
        .select('id')
        .eq('line_group_id', groupId)
        .single();

      if (!groupData) {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: 'グループが見つかりません' }],
        });
        return;
      }

      const memberIds = await lineClient.getGroupMembersIds(groupId!);
      let syncCount = 0;
      
      for (const memberId of memberIds.memberIds) {
        try {
          const profile = await lineClient.getGroupMemberProfile(groupId!, memberId);
          
          const { data: userData } = await supabase
            .from('users')
            .upsert({
              line_user_id: memberId,
              display_name: profile.displayName,
              picture_url: profile.pictureUrl,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'line_user_id',
            })
            .select()
            .single();

          if (userData) {
            await supabase
              .from('group_members')
              .upsert({
                group_id: groupData.id,
                user_id: userData.id,
              }, {
                onConflict: 'group_id,user_id',
              });
            syncCount++;
          }
        } catch (memberErr) {
          console.error('Error syncing member:', memberId, memberErr);
        }
      }

      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ 
          type: 'text', 
          text: `✅ メンバーを同期しました！\n${syncCount}人のメンバーを登録しました。` 
        }],
      });
    } catch (err) {
      console.error('Error in sync command:', err);
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '同期に失敗しました' }],
      });
    }
  }
}

// GET リクエスト対応（ヘルスチェック用）
export async function GET() {
  return NextResponse.json({ status: 'Webhook is running' });
}
