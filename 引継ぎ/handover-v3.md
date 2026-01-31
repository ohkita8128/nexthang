# あそボット（asobott）引継ぎドキュメント

最終更新: 2026-01-31

---

## 📋 プロジェクト概要

**あそボット**は、LINEグループ内で「行きたい場所」を共有し、日程調整から参加確認までを一貫して行えるLIFFアプリ。

### コンセプト
> 「いつか行きたいね」を「この日に行こう！」へ

### 主な機能
1. **行きたいリスト** - グループメンバーが行きたい場所を自由に追加
2. **行きたい！ボタン** - 興味がある人が反応
3. **日程調整** - 候補日を選んで投票
4. **参加確認** - 日程が決まった予定の出欠確認
5. **自動提案** - 盛り上がっている予定をcronで通知

---

## 🛠 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| データベース | Supabase (PostgreSQL) |
| 認証 | LINE LIFF SDK + Access Token検証 |
| ホスティング | Vercel |
| 定期実行 | Vercel Cron |

---

## 📁 ディレクトリ構成

```
src/
├── app/
│   ├── api/                    # APIエンドポイント
│   │   ├── webhook/            # LINE Webhook
│   │   ├── cron/               # 定期実行（提案通知）
│   │   ├── register-user/      # ユーザー登録
│   │   ├── user-groups/        # ユーザーの所属グループ取得
│   │   ├── groups/
│   │   │   ├── by-line-id/     # LINE GroupID → DB GroupID変換
│   │   │   └── [groupId]/
│   │   │       ├── wishes/     # 行きたいリスト CRUD
│   │   │       ├── settings/   # グループ設定
│   │   │       ├── members/    # メンバー一覧
│   │   │       └── events/     # 確定済みイベント
│   │   └── wishes/
│   │       └── [wishId]/
│   │           ├── interest/   # 行きたい！ボタン
│   │           ├── response/   # 参加確認回答
│   │           ├── schedule/   # 日程調整候補
│   │           └── schedule/vote/ # 日程投票
│   ├── liff/                   # LIFFフロントエンド
│   │   ├── page.tsx            # ホーム
│   │   ├── layout.tsx          # ToastProvider
│   │   ├── LiffContent.tsx     # ホーム画面本体
│   │   ├── wishes/             # 行きたいリスト関連
│   │   │   ├── WishesContent.tsx
│   │   │   ├── new/            # 新規追加
│   │   │   └── [wishId]/
│   │   │       ├── edit/       # 編集
│   │   │       ├── schedule/   # 日程調整作成
│   │   │       │   └── vote/   # 日程投票
│   │   │       └── confirm/    # 参加確認
│   │   ├── calendar/           # カレンダー表示
│   │   ├── settings/           # 設定画面
│   │   ├── howto/              # 使い方ページ
│   │   ├── groups/             # グループ切替
│   │   └── components/         # 共通コンポーネント
│   │       ├── Skeleton.tsx    # ローディングUI
│   │       ├── ErrorRetry.tsx  # エラー時リトライUI
│   │       ├── Toast.tsx       # トースト通知
│   │       └── ...
│   ├── terms/                  # 利用規約ページ
│   ├── layout.tsx              # ルートレイアウト（OGP設定）
│   └── globals.css             # グローバルスタイル
├── hooks/
│   ├── use-liff.ts             # LIFF初期化・認証
│   ├── use-group.ts            # グループ管理
│   ├── use-wishes.ts           # 行きたいリスト取得
│   ├── use-schedule.ts         # 日程候補取得
│   └── use-members.ts          # メンバー取得
├── lib/
│   ├── auth.ts                 # LINE Token検証
│   ├── line/
│   │   ├── client.ts           # LINE Bot SDK初期化
│   │   └── notification.ts     # 通知メッセージ生成
│   ├── supabase/
│   │   └── client.ts           # Supabaseクライアント
│   └── swr/
│       └── fetcher.ts          # SWR fetcher + 認証付きリクエスト
public/
├── icon.png                    # アプリアイコン
├── ogp.png                     # OGP画像
├── richmenu.png                # リッチメニュー画像
└── richmenu.svg                # リッチメニューSVGソース
```

---

## 🗄 データベース構造

### テーブル一覧

```
users                 # ユーザー
├── id (UUID, PK)
├── line_user_id (UNIQUE)
├── display_name
├── picture_url
├── created_at
└── updated_at

groups                # グループ
├── id (UUID, PK)
├── line_group_id (UNIQUE)
├── name
├── created_by (FK → users)
├── settings (JSONB)
├── last_activity_at
├── created_at
└── updated_at

group_members         # グループメンバー
├── id (UUID, PK)
├── group_id (FK → groups)
├── user_id (FK → users)
├── role
└── joined_at
└── UNIQUE(group_id, user_id)

group_settings        # グループ設定
├── id (UUID, PK)
├── group_id (FK → groups, UNIQUE)
├── notify_schedule_start
├── notify_reminder
├── notify_confirmed
├── suggest_enabled
├── suggest_interval_days
├── suggest_min_interests
├── created_at
└── updated_at

wishes                # 行きたいリスト
├── id (UUID, PK)
├── group_id (FK → groups)
├── title
├── description
├── created_by (FK → users)
├── is_anonymous
├── status (open/voting/confirmed/cancelled)
├── start_date
├── start_time
├── end_date
├── end_time
├── is_all_day
├── voting_started
├── vote_deadline
├── confirmed_date
├── last_suggested_at
├── created_at
└── updated_at

interests             # 行きたい！反応
├── id (UUID, PK)
├── wish_id (FK → wishes)
├── user_id (FK → users)
├── created_at
└── UNIQUE(wish_id, user_id)

schedule_candidates   # 日程調整候補日
├── id (UUID, PK)
├── wish_id (FK → wishes)
├── date
└── created_at

schedule_votes        # 日程調整投票
├── id (UUID, PK)
├── candidate_id (FK → schedule_candidates)
├── user_id (FK → users)
├── availability (ok/ng/undecided/morning/afternoon/evening)
├── created_at
└── UNIQUE(candidate_id, user_id)

wish_responses        # 参加確認回答
├── id (UUID, PK)
├── wish_id (FK → wishes)
├── user_id (FK → users)
├── response (join/maybe/decline)
├── created_at
└── updated_at
└── UNIQUE(wish_id, user_id)
```

### データ削除（初期化）

```sql
TRUNCATE schedule_votes, wish_responses, interests, schedule_candidates, wishes, group_settings, group_members, groups, users CASCADE;
```

---

## 🔑 環境変数

### Vercel（本番）

```env
# LINE
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
LINE_BOT_FRIEND_URL=https://line.me/R/ti/p/@xxx

# LIFF
NEXT_PUBLIC_LIFF_ID=xxx-xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Cron認証
CRON_SECRET=xxx
```

### ローカル開発

`.env.local` に同じ内容を設定

---

## 🔒 セキュリティ

### 認証フロー

```
1. LIFF初期化 → liff.getAccessToken()
2. フロントエンドがAPIにリクエスト
   Authorization: Bearer {accessToken}
3. バックエンドがLINE APIでトークン検証
   GET https://api.line.me/oauth2/v2.1/verify?access_token={token}
4. トークンからユーザーID取得
   GET https://api.line.me/v2/profile
5. 検証OK → 処理実行
```

### 認証が必要なAPI

| エンドポイント | メソッド |
|---------------|----------|
| `/api/groups/[groupId]/wishes` | POST |
| `/api/groups/[groupId]/settings` | PATCH |
| `/api/wishes/[wishId]` | PATCH, DELETE |
| `/api/wishes/[wishId]/interest` | POST, DELETE |
| `/api/wishes/[wishId]/response` | POST |
| `/api/wishes/[wishId]/schedule` | POST |
| `/api/wishes/[wishId]/schedule/vote` | POST |

### 認証コード

- `lib/auth.ts` - `requireAuth()` 関数
- `lib/swr/fetcher.ts` - `authRequest()` 関数

---

## 📱 LINE設定

### LINE Developers Console

1. **Messaging API設定**
   - Webhook URL: `https://asobott.vercel.app/api/webhook`
   - Webhook有効化: ON

2. **LIFF設定**
   - エンドポイントURL: `https://asobott.vercel.app/liff`
   - サイズ: Full
   - Scope: profile, openid

### LINE Official Account Manager

1. **リッチメニュー設定**
   - サイズ: 1200 x 405px
   - 左エリア: 「管理画面」→ `https://liff.line.me/{LIFF_ID}`
   - 右エリア: 「使い方」→ `https://liff.line.me/{LIFF_ID}/howto`

2. **プロフィール設定**
   - アイコン: butler風アイコン
   - 説明文: 適切な説明

---

## 💬 メッセージ一覧

### webhook/route.ts

| トリガー | 関数 | メッセージ概要 |
|----------|------|---------------|
| 友達追加 | `handleFollow` | 「ようこそ、あそボットと申します🎩」 |
| グループ招待 | `handleJoin` | 「お招きありがとうございます🎩」+使い方 |
| 「メニュー」送信 | `handleMessage` | 管理画面リンク |
| 「使い方」送信 | `handleMessage` | 使い方ページリンク |

### notification.ts

| 関数 | トリガー | メッセージ概要 |
|------|----------|---------------|
| `notifySuggestion` | cron | 「〇〇に興味がある方がいらっしゃいます」 |
| `notifySuggestionNoCandidates` | cron | 「皆様からのご提案をお待ちしております」 |
| `notifyScheduleStart` | 日程調整開始 | 「日程調整が始まりました」 |
| `notifyConfirmStart` | 参加確認開始 | 「参加確認をお願いいたします」 |
| `notifyDateConfirmed` | 日程確定 | 「日程が確定いたしました」 |

---

## ⏰ Cron設定

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 12 * * *"
    }
  ]
}
```

毎日12:00 UTC（日本時間21:00）に実行

### 処理内容

1. 各グループの設定を確認
2. `suggest_enabled: true` のグループを対象
3. 条件を満たすwishを抽出:
   - status = 'open'
   - 興味ある人数 >= `suggest_min_interests`
   - 最後の提案から `suggest_interval_days` 日以上経過
4. 通知送信

---

## ✅ 今回のセッションでやったこと（2026-01-31）

### 1. セキュリティ強化
- LINEアクセストークン検証を実装
- 全APIをなりすまし不可に

### 2. UI/UX改善
- OGPメタデータ追加
- スケルトンローディング
- エラーリトライUI
- Toastコンポーネント
- ヘッダーにアイコン追加

### 3. リッチメニュー・使い方
- 使い方ページ (`/liff/howto`)
- 「使い方」コマンド対応
- リッチメニュー画像作成

### 4. グループ登録問題の修正
- グループ参加時のURLに `?groupId=xxx` を付与
- `register-user` APIが `groupId` パラメータを受け取れるように
- グループ選択シートにヘルプ追加

### 5. フィードバック
- Googleフォームリンクを設定画面に追加
- フォームURL: `https://docs.google.com/forms/d/e/1FAIpQLSeaPG1tmJtwvwZ1aaKb_kTGAL0KyKUYzZ79YZav6lj112zWKA/viewform`

### 6. 文言変更
- 「興味あり」→「行きたい！」

---

## ⚠️ 既知の課題・注意点

### 1. グループ登録の仕組み
LINE APIの制限で、ユーザーが所属するグループ一覧は取得できない。
→ グループでメッセージ送信 or グループからLIFF開く、で初めて登録される。
→ グループ選択シートにヘルプを表示済み。

### 2. 投票締め切り
UI側でのみブロック。APIでは検証していない。
→ 悪意あるユーザーが締め切り後に投票可能（低リスク）

### 3. Token検証のレート制限
LINE APIの検証を毎リクエストで呼んでいる。
→ 大量アクセス時は要注意（キャッシュ検討）

### 4. リッチメニュー画像の日本語フォント
サーバー環境では日本語フォントがない。
→ Canva等で作成するか、ローカルでスクリーンショット推奨

---

## 🧪 テスト方法

### ローカル開発

```bash
cd src
npm run dev
# → http://localhost:3000

# Webhook テストは ngrok 等でトンネル必要
ngrok http 3000
```

### 本番デプロイ

```bash
# Vercel CLI
vercel --prod

# または GitHub push → 自動デプロイ
```

### 動作確認チェックリスト

- [ ] 友達追加 → メッセージ表示
- [ ] グループ招待 → Flex Message表示
- [ ] 「管理画面を開く」ボタン → LIFF起動、グループ登録
- [ ] グループ選択 → 正しく切替
- [ ] 「メニュー」送信 → 管理画面リンク
- [ ] 「使い方」送信 → 使い方ページリンク
- [ ] 行きたい追加 → 一覧に表示
- [ ] 「行きたい！」ボタン → カウント増加
- [ ] 日程調整開始 → 通知送信
- [ ] 日程投票 → 保存される
- [ ] 日程確定 → 通知送信、カレンダーに表示
- [ ] 参加確認 → 回答保存
- [ ] 設定変更 → 保存される
- [ ] フィードバックリンク → Googleフォーム開く

---

## 📞 関連リンク

| 項目 | URL |
|------|-----|
| 本番サイト | https://asobott.vercel.app |
| LIFF | https://liff.line.me/{LIFF_ID} |
| Supabase | https://supabase.com/dashboard |
| LINE Developers | https://developers.line.biz |
| LINE Official Account | https://manager.line.biz |
| Vercel | https://vercel.com/dashboard |
| フィードバックフォーム | https://docs.google.com/forms/d/e/1FAIpQLSeaPG1tmJtwvwZ1aaKb_kTGAL0KyKUYzZ79YZav6lj112zWKA/viewform |

---

## 🔄 次にやること候補

1. **過去の予定を見返す機能**
2. **コメント・メモ機能**
3. **場所（URL・住所）の登録**
4. **費用の割り勘計算**
5. **Googleカレンダー連携**
6. **リマインドのカスタマイズ**
7. **Token検証のキャッシュ**
8. **エラー時のToast表示実装**（コンポーネントは作成済み）

---

以上！質問があれば聞いて。
