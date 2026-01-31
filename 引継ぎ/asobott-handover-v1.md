# あそボット Phase 1 引継ぎ資料

## 基本情報
- **サービス名**: あそボット
- **プロジェクト名**: asobott
- **本番URL**: https://nexthang.vercel.app（→ asobott.vercel.app に変更予定）
- **LIFF URL**: https://liff.line.me/2009015521-LvLwajYC
- **ローカル**: `C:\Users\PC_User\Documents\GitHub\nexthang`（→ asobott に変更予定）
- **GitHub**: https://github.com/ohkita8128/nexthang（→ asobott に変更予定）
- **技術スタック**: Next.js 14 + TypeScript + Tailwind v4 + Supabase + Vercel
- **作業日**: 2026年1月31日

---

## 名前変更予定

| 用途 | 現在 | 変更後 |
|------|------|--------|
| サービス名 | NextHang | あそボット |
| プロジェクト名 | nexthang | asobott |
| GitHub リポジトリ | nexthang | asobott |
| Vercel プロジェクト | nexthang | asobott |
| URL | nexthang.vercel.app | asobott.vercel.app |
| LINE 公式アカウント | NextHang | あそボット |

### 名前変更の手順
1. GitHub リポジトリ名変更（Settings → Rename）
2. Vercel プロジェクト名変更（Settings → General）
3. LINE Official Account Manager でアカウント名変更
4. LINE Developers Console で LIFF エンドポイント URL 変更
5. コード内の名前変更（タイトル、メッセージ文言）
6. ローカルフォルダ名変更

---

## プロジェクト概要

### 目的
「予定が存在しないまま時間が過ぎる」問題を解決する LINE Bot + 管理画面アプリ

### ターゲット
仲良しだけど動かない友達グループ

### コンセプト
- Bot が自動で誘う（誰も言い出さなくていい）
- 日付なしで「行きたい」を溜められる
- 人数集まらなくても失敗にならない
- 全部 LINE 内で完結

---

## 完了したタスク

### ✅ LINE Bot 基本機能
- LINE 公式アカウント作成
- Webhook 実装（follow, join, memberJoined, leave, memberLeft, message）
- 友達追加時のウェルカムメッセージ
- グループ参加時の挨拶メッセージ
- 「メニュー」コマンドで LIFF リンク送信

### ✅ データベース
- Supabase プロジェクト作成
- 8テーブル作成済み
  - users
  - groups
  - group_members
  - events
  - votes
  - wishes
  - interests
  - reminders

### ✅ LIFF 管理画面
- LIFF アプリ登録（LINE ログインチャネル経由）
- ホームページ
- 行きたいリスト一覧
- 行きたい追加フォーム
- カレンダーページ（準備中表示）
- 設定ページ（準備中表示）
- ボトムナビゲーション

### ✅ リッチメニュー
- LINE Official Account Manager で設定
- デフォルト非表示（タップで開く）

### ✅ デザイン
- Tailwind v4 対応
- プロフェッショナルな UI（slate 系カラー、SVG アイコン）

---

## 未解決の問題

### 🔴 グループからの LIFF アクセスでエラー

**症状**: グループのトークからメニューを開くと、行きたいリストが永遠に読み込み中

**原因**: `/api/groups/by-line-id` が 500 エラーを返している

**調査状況**: 
- 1:1 トークや PC からは正常動作
- グループからのみエラー
- LIFF の context.groupId と DB の line_group_id の不一致の可能性

**次のステップ**:
1. Vercel ログで詳細なエラーを確認
2. LIFF で取得される groupId をログ出力して確認
3. DB の groups テーブルの line_group_id と比較

---

## ファイル構成

```
nexthang/
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind v4 import
│   │   ├── layout.tsx               # ルートレイアウト
│   │   ├── api/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts         # LINE Webhook
│   │   │   ├── groups/
│   │   │   │   ├── by-line-id/
│   │   │   │   │   └── route.ts     # LINE グループID → DB ID 変換
│   │   │   │   └── [groupId]/
│   │   │   │       └── wishes/
│   │   │   │           └── route.ts # 行きたいリスト CRUD
│   │   │   ├── wishes/
│   │   │   │   └── [wishId]/
│   │   │   │       ├── route.ts     # 行きたい削除
│   │   │   │       └── interest/
│   │   │   │           └── route.ts # 興味追加/削除
│   │   │   └── user-groups/
│   │   │       └── route.ts         # ユーザーの所属グループ取得
│   │   └── liff/
│   │       ├── page.tsx             # ホーム
│   │       ├── calendar/
│   │       │   └── page.tsx         # カレンダー（準備中）
│   │       ├── wishes/
│   │       │   ├── page.tsx         # 行きたいリスト
│   │       │   └── new/
│   │       │       └── page.tsx     # 行きたい追加
│   │       └── settings/
│   │           └── page.tsx         # 設定（準備中）
│   ├── hooks/
│   │   └── use-liff.ts              # LIFF 初期化・プロフィール取得
│   └── lib/
│       ├── line/
│       │   └── client.ts            # LINE Messaging API クライアント
│       └── supabase/
│           └── client.ts            # Supabase クライアント
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
├── .env.local                       # 環境変数（ローカル）
└── package.json
```

---

## 環境変数

### .env.local（ローカル）
```env
# LINE
LINE_CHANNEL_ID=xxxxx
LINE_CHANNEL_SECRET=xxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxx

# LIFF
NEXT_PUBLIC_LIFF_ID=2009015521-LvLwajYC

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel 環境変数
上記と同じものを Vercel の Environment Variables に設定済み

---

## データベース構造

### users
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| line_user_id | text | LINE ユーザーID |
| display_name | text | 表示名 |
| picture_url | text | アイコンURL |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### groups
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| line_group_id | text | LINE グループID |
| name | text | グループ名 |
| created_by | uuid | FK → users |
| settings | jsonb | グループ設定 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### group_members
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| group_id | uuid | FK → groups |
| user_id | uuid | FK → users |
| role | text | admin / member |
| joined_at | timestamptz | 参加日時 |

### wishes
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| group_id | uuid | FK → groups |
| title | text | 行きたい内容 |
| description | text | 詳細 |
| created_by | uuid | FK → users |
| is_anonymous | boolean | 匿名か |
| status | text | open / voting / converted / archived |
| converted_to | uuid | FK → events |
| created_at | timestamptz | 作成日時 |

### interests
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| wish_id | uuid | FK → wishes |
| user_id | uuid | FK → users |
| created_at | timestamptz | 作成日時 |

### events, votes, reminders
設計済み、まだ機能未実装

---

## 外部サービス情報

### LINE Developers Console
- URL: https://developers.line.biz/console/
- プロバイダー: NextHang（または個人名）
- チャネル:
  - Messaging API チャネル: NextHang
  - LINE ログインチャネル: NextHang LIFF

### LINE Official Account Manager
- URL: https://manager.line.biz/
- アカウント: NextHang
- リッチメニュー設定済み

### Supabase
- URL: https://supabase.com/dashboard
- プロジェクト: nexthang

### Vercel
- URL: https://vercel.com/
- プロジェクト: nexthang

---

## 次回やるべきこと

### 優先度：高
1. **グループからの LIFF アクセス問題を修正**
   - LIFF context.groupId のログ出力追加
   - DB の line_group_id との比較
   - エラーハンドリング改善

2. **group_members の自動登録**
   - Bot がグループに参加した時点で既存メンバーを登録する方法を検討
   - 現状は memberJoined イベントでしか登録されない

### 優先度：中
3. **日程投票機能**
   - カレンダー UI 実装
   - events テーブル操作 API
   - votes テーブル操作 API

4. **リマインド機能**
   - Supabase Edge Functions で定期実行
   - または Vercel Cron Jobs

### 優先度：低
5. **設定画面の実装**
6. **おすすめ提案機能**
7. **Google Calendar 連携**

---

## 技術メモ

### Tailwind v4 の設定
postcss.config.mjs で `@tailwindcss/postcss` を使用
globals.css では `@import "tailwindcss";` と記述

### LIFF の注意点
- Messaging API チャネルには LIFF を追加できない
- LINE ログインチャネルを別途作成して LIFF を追加
- グループから開くと context.groupId が取得できる

### LINE Bot のグループ参加許可
LINE Official Account Manager → 設定 → アカウント設定 → 機能の利用
「グループ・複数人トークへの参加を許可する」をオンにする

---

## 設計書
- 設計書 v1: `引継ぎ/nexthang-design-v1.md`（ローカルに保存済み）

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026/01/31 | Phase 1 完了。Bot基本機能、LIFF管理画面、行きたいリスト機能 |
