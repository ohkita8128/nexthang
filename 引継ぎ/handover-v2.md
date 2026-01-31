# あそボット 引継ぎ資料 v2

## 概要

LINEグループ向けの予定調整・行きたいリスト管理アプリ（LIFFアプリ）

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: LINE LIFF SDK
- **ホスティング**: Vercel
- **通知**: LINE Messaging API

---

## 主要機能

### 1. 行きたいリスト
- グループメンバーが「行きたい場所」を提案
- 興味ありボタンで人気度を可視化
- 日時あり/なしの両方に対応

### 2. 日程調整
- カレンダーから候補日を複数選択
- 6択投票（◯/×/未定/午前/午後/夜）
- 締め切り設定
- 回答状況の一覧表示

### 3. 参加確認
- 日程確定後の出欠確認
- ◯△×の3択
- メンバーごとの回答状況表示

### 4. LINE通知
- 日程調整開始通知
- 参加確認開始通知
- 締め切りリマインド（3日前/前日）
- 日程確定通知
- おすすめ提案（定期）

### 5. グループ設定
- 通知ON/OFF設定
- おすすめ提案の頻度・条件設定

---

## DBスキーマ

### users
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| line_user_id | TEXT | LINE ユーザーID (UNIQUE) |
| display_name | TEXT | 表示名 |
| picture_url | TEXT | アイコンURL |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### groups
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| line_group_id | TEXT | LINE グループID (UNIQUE) |
| name | TEXT | グループ名 |
| last_activity_at | TIMESTAMPTZ | 最終アクティブ日時 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### group_members
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| group_id | UUID | FK → groups |
| user_id | UUID | FK → users |
| created_at | TIMESTAMPTZ | 作成日時 |
| UNIQUE(group_id, user_id) |

### group_settings
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| group_id | UUID | FK → groups (UNIQUE) |
| notify_schedule_start | BOOLEAN | 開始通知 (default: true) |
| notify_reminder | BOOLEAN | リマインド通知 (default: true) |
| notify_confirmed | BOOLEAN | 確定通知 (default: true) |
| suggest_enabled | BOOLEAN | おすすめ提案 (default: true) |
| suggest_interval_days | INTEGER | 提案間隔日数 (default: 30) |
| suggest_min_interests | INTEGER | 最低興味あり人数 (default: 3) |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### wishes (行きたいリスト)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| group_id | UUID | FK → groups |
| created_by | UUID | FK → users |
| title | TEXT | タイトル |
| description | TEXT | 説明 |
| start_date | DATE | 開始日 |
| start_time | TIME | 開始時刻 |
| end_date | DATE | 終了日 |
| end_time | TIME | 終了時刻 |
| is_all_day | BOOLEAN | 終日フラグ |
| status | TEXT | 状態 (open/voting/confirmed) |
| voting_started | BOOLEAN | 参加確認開始フラグ |
| vote_deadline | TIMESTAMPTZ | 投票締め切り |
| confirmed_date | DATE | 確定日 |
| created_at | TIMESTAMPTZ | 作成日時 |

### wish_interests (興味あり)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| wish_id | UUID | FK → wishes |
| user_id | UUID | FK → users |
| created_at | TIMESTAMPTZ | 作成日時 |
| UNIQUE(wish_id, user_id) |

### wish_responses (参加確認回答)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| wish_id | UUID | FK → wishes |
| user_id | UUID | FK → users |
| response | TEXT | 回答 (ok/maybe/ng) |
| created_at | TIMESTAMPTZ | 作成日時 |
| UNIQUE(wish_id, user_id) |

### schedule_candidates (日程調整候補日)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| wish_id | UUID | FK → wishes |
| date | DATE | 候補日 |
| created_at | TIMESTAMPTZ | 作成日時 |

### schedule_votes (日程調整投票)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| candidate_id | UUID | FK → schedule_candidates |
| user_id | UUID | FK → users |
| availability | TEXT | 回答 (ok/ng/undecided/morning/afternoon/evening) |
| created_at | TIMESTAMPTZ | 作成日時 |
| UNIQUE(candidate_id, user_id) |

### notification_logs (通知ログ)
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| group_id | UUID | FK → groups |
| wish_id | UUID | FK → wishes |
| notification_type | TEXT | 通知種別 |
| sent_at | TIMESTAMPTZ | 送信日時 |
| UNIQUE(group_id, wish_id, notification_type) |

---

## API一覧

### Webhook
- `POST /api/webhook` - LINE Webhook

### グループ
- `GET /api/groups/by-line-id` - LINE ID からグループ取得
- `GET /api/groups/[groupId]/wishes` - グループの行きたいリスト
- `POST /api/groups/[groupId]/wishes` - 行きたい作成
- `GET /api/groups/[groupId]/members` - メンバー一覧
- `GET /api/groups/[groupId]/settings` - 設定取得
- `PATCH /api/groups/[groupId]/settings` - 設定更新

### ユーザー
- `GET /api/user-groups` - 所属グループ一覧

### 行きたい (wishes)
- `PATCH /api/wishes/[wishId]` - 更新
- `DELETE /api/wishes/[wishId]` - 削除
- `POST /api/wishes/[wishId]/interest` - 興味あり追加
- `DELETE /api/wishes/[wishId]/interest` - 興味あり削除
- `POST /api/wishes/[wishId]/response` - 参加確認回答

### 日程調整
- `GET /api/wishes/[wishId]/schedule` - 候補日一覧
- `POST /api/wishes/[wishId]/schedule` - 候補日作成（調整開始）
- `POST /api/wishes/[wishId]/schedule/vote` - 投票

### Cron
- `GET /api/cron` - 定期通知（毎日10時）

---

## 画面一覧

| パス | 説明 |
|------|------|
| `/liff` | ホーム（未回答・直近予定・人気リスト） |
| `/liff/wishes` | 行きたいリスト一覧 |
| `/liff/wishes/new` | 行きたい新規作成 |
| `/liff/wishes/[wishId]/schedule` | 日程調整作成 |
| `/liff/wishes/[wishId]/schedule/vote` | 日程調整回答 |
| `/liff/wishes/[wishId]/confirm` | 参加確認回答 |
| `/liff/calendar` | カレンダー |
| `/liff/settings` | グループ設定 |
| `/liff/groups` | グループ一覧（旧） |

---

## 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# LINE
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
NEXT_PUBLIC_LIFF_ID=xxx

# Cron認証（オプション）
CRON_SECRET=xxx
```

---

## Vercel設定

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 10 * * *"
    }
  ]
}
```

---

## 主要ファイル

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts      # LINE Webhook
│   │   ├── cron/route.ts         # 定期通知
│   │   ├── groups/               # グループ関連API
│   │   ├── wishes/               # 行きたい関連API
│   │   └── user-groups/          # ユーザーグループAPI
│   └── liff/
│       ├── LiffContent.tsx       # ホーム画面
│       ├── wishes/               # 行きたい関連画面
│       ├── calendar/             # カレンダー画面
│       └── settings/             # 設定画面
├── hooks/
│   └── use-liff.ts               # LIFF Hook
└── lib/
    ├── supabase/client.ts        # Supabase クライアント
    └── line/
        ├── client.ts             # LINE クライアント
        └── notification.ts       # 通知ユーティリティ
```

---

## v1 → v2 での変更点

### 新機能
1. **参加確認ページ** - 別ページで回答、メンバー回答状況表示
2. **ボトムシートヘッダー** - グループ切り替えが簡単に
3. **グループ設定** - 通知ON/OFF、おすすめ提案設定
4. **LINE通知** - 開始/リマインド/確定通知
5. **定期Cron** - リマインド＆おすすめ提案の自動送信
6. **グループ名表示** - LINE APIからグループ名取得

### 改善
- 日程調整に「回答を保存」ボタン追加
- 回答状況の午前/午後表示を「前/後」に修正
- 投票取り消し対応（同じボタン2回押しで解除）
- 投票者表示追加

### DB追加
- `groups.last_activity_at`
- `group_settings` テーブル
- `notification_logs` テーブル

---

## 今後の課題・拡張案

### 優先度高
- [ ] 日程確定フロー（主催者が確定ボタンを押す）
- [ ] 締め切り後の結果表示画面
- [ ] Push通知のテスト

### 優先度中
- [ ] 既存グループのグループ名一括取得
- [ ] カレンダーにconfirmed状態の表示
- [ ] 編集機能（行きたいの編集）

### 将来的
- [ ] LINEミニアプリへの移行
- [ ] 企業連携（おすすめスポット提案）
- [ ] リッチメニュー対応

---

## 開発メモ

### LIFFアプリ vs LINEミニアプリ
- 現在はLIFFアプリ（審査不要）
- ミニアプリ移行はコードほぼそのまま、申請が必要

### 通知の仕組み
- LINE Messaging API の Push API を使用
- グループ設定でON/OFFを制御
- notification_logs で重複送信を防止

### グループ名取得
- `lineClient.getGroupSummary()` で取得
- Bot参加時 or メッセージ受信時に自動取得
