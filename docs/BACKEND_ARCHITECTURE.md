# TubeGrid バックエンド構成図

## 概要

TubeGridのバックエンドは、Go言語（Gin Web Framework）で構築されたRESTful APIサーバーです。YouTube Data APIと連携し、複数の配信を管理・監視する機能を提供します。

## システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    (React + Vite)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         │ Port 8080
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go + Gin)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   main.go    │  │  models.go   │  │ youtube_client  │  │
│  │              │  │              │  │     .go         │  │
│  │ - APIルート  │  │ - データ定義 │  │ - YouTube API   │  │
│  │ - 認証       │  │ - DB構造     │  │ - コメント取得  │  │
│  │ - セッション │  │              │  │ - 配信情報取得  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           stream_service.go                        │    │
│  │  - 盛り上がりスコア計算                            │    │
│  │  - コメント分析                                    │    │
│  │  - キーワード検出                                  │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                    SQLite Database                           │
│                      (user.db)                               │
│                                                              │
│  - users                    - surge_weight_settings          │
│  - talents                  - viewing_sessions               │
│  - groups                   - session_streams                │
│  - room_layouts             - oshi_volume_presets            │
└─────────────────────────────────────────────────────────────┘

         ↑ Backend から呼び出し ↓
         
┌─────────────────────────────────────────────────────────────┐
│                   YouTube Data API v3                        │
│                                                              │
│  - 動画検索                - コメント取得                    │
│  - 配信情報取得            - スーパーチャット取得            │
│  - チャンネル情報取得                                        │
└─────────────────────────────────────────────────────────────┘
```

## ファイル構成

### 1. main.go

- **役割**: APIルーティング、メインロジック、エンドポイント実装
- **主な機能**:
  - サーバー初期化とCORS設定
  - 全APIエンドポイントの定義
  - セッション管理とキャッシュ処理

### 2. models.go

- **役割**: データモデル定義
- **主なモデル**:
  - `User`: ユーザー情報（認証、設定）
  - `Talent`: 配信者情報
  - `Group`: グループ管理
  - `ViewingSession`: 視聴セッション
  - `SessionStream`: セッション内の配信
  - `RoomLayout`: 画面レイアウト設定
  - `SurgeMetrics`: 盛り上がりメトリクス
  - `CommentAnalysis`: コメント分析結果

### 3. youtube_client.go

- **役割**: YouTube Data API連携
- **主な機能**:
  - 動画情報取得 (`getYouTubeVideoInfo`)
  - チャンネル情報取得 (`getYouTubeChannelInfo`)
  - 配信状態取得 (`getYouTubeLiveStreamStatus`)
  - 動画検索 (`searchYouTubeVideos`)
  - コメント取得 (`getYouTubeComments`)
  - スーパーチャット取得 (`getYouTubeSuperChats`)

### 4. stream_service.go

- **役割**: 配信分析・スコア計算
- **主な機能**:
  - 盛り上がりスコア計算 (`calculateSurgeScore`)
  - コメント増加スコア算出 (`calculateCommentGrowthScore`)
  - キーワードスコア算出 (`calculateKeywordScore`)
  - スーパーチャットスコア算出 (`calculateSuperChatScore`)
  - 盛り上がりキーワード検出 (`detectSurgeKeywords`)

## APIエンドポイント一覧

### 認証系

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/register` | 新規ユーザー登録 |
| POST | `/login` | ログイン |

### ユーザー管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/users` | ユーザー一覧取得 |
| GET | `/users/:id/settings` | ユーザー設定取得 |
| PUT | `/users/:id/settings` | ユーザー設定更新 |
| GET | `/users/:id/favorites` | お気に入り配信者取得 |
| POST | `/users/:id/favorite/:talent_id` | お気に入り追加 |

### 配信者・グループ管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/talents` | 配信者登録 |
| POST | `/groups` | グループ作成 |
| PUT | `/groups/:id` | グループ更新 |
| DELETE | `/groups/:id` | グループ削除 |
| POST | `/groups/:id/add-talent/:talent_id` | グループにタレント追加 |
| GET | `/groups/:id/live-streams` | グループの配信状態取得 |
| GET | `/talents/:id/stream-status` | 配信者のライブ状態取得 |

### ルームレイアウト管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/users/:id/room-layout` | レイアウト取得 |
| POST | `/users/:id/room-layout` | レイアウト保存 |
| PUT | `/users/:id/room-layout/:monitor_id` | モニター位置更新 |
| DELETE | `/users/:id/room-layout/:monitor_id` | モニター削除 |

### 音量プリセット管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/users/:id/volume-presets` | 音量プリセット一覧取得 |
| POST | `/users/:id/volume-presets` | 音量プリセット作成 |
| PUT | `/users/:id/volume-presets/:talent_id` | 音量プリセット更新 |
| DELETE | `/users/:id/volume-presets/:talent_id` | 音量プリセット削除 |

### セッション管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/users/:id/sessions` | セッション作成 |
| GET | `/users/:id/sessions` | セッション一覧取得 |
| GET | `/users/:id/sessions/:session_id` | セッション詳細取得 |
| PUT | `/users/:id/sessions/:session_id` | セッション更新 |
| DELETE | `/users/:id/sessions/:session_id` | セッション削除 |

### 盛り上がり分析

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/users/:id/sessions/:session_id/surge-streams` | 盛り上がり配信取得 |
| GET | `/users/:id/surge-weights` | 重み設定取得 |
| PUT | `/users/:id/surge-weights` | 重み設定更新 |

### YouTube連携

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/youtube/search` | 動画検索 |
| GET | `/videos/:video_id/info` | 動画情報取得 |
| GET | `/channels/:channel_id/info` | チャンネル情報取得 |

### メトリクス

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/streams/:talent_id/metrics` | 配信メトリクス送信 |

## データベーススキーマ

### users

- ID (PK)
- Name
- Email (Unique)
- Password (Hashed)
- DefaultVolume
- LayoutSetting

### talents

- ID (PK)
- Name
- ChannelID (Unique)
- Platform

### groups

- ID (PK)
- Name (Unique)

### room_layouts

- ID (PK)
- UserID (FK)
- MonitorID
- VideoID
- X, Y (座標)
- Rotate (回転角度)
- Width, Height
- ZIndex
- IsMain, IsOshi
- Label, MonitorType

### viewing_sessions

- ID (PK)
- UserID (FK)
- SessionName
- IsActive

### session_streams

- ID (PK)
- SessionID (FK)
- TalentID (FK)
- VideoID
- StreamURL
- Title
- IsMain
- Volume
- Position

### oshi_volume_presets

- ID (PK)
- UserID (FK)
- TalentID (FK)
- Volume

### surge_weight_settings

- ID (PK)
- UserID (FK)
- CommentGrowthWeight (デフォルト: 0.5)
- KeywordWeight (デフォルト: 0.3)
- SuperChatWeight (デフォルト: 0.2)

## 盛り上がり検出アルゴリズム

### スコア計算式

```
総合スコア = (コメント増加スコア × 重み1) 
           + (キーワードスコア × 重み2) 
           + (スーパーチャットスコア × 重み3)
```

### 各スコアの算出方法

#### 1. コメント増加スコア (0.0-1.0)

- 過去の履歴と比較してコメント数の増加率を計算
- 急激な増加ほど高スコア

#### 2. キーワードスコア (0.0-1.0)

- 盛り上がりキーワード（"草", "www", "!!!", "すげー"等）の含有率
- 検出されたキーワード数 / 総コメント数

#### 3. スーパーチャットスコア (0.0-1.0)

- スーパーチャットの金額と件数から算出
- 視聴者数で正規化

## 環境変数 (.env)

```env
YOUTUBE_API_KEY=<YouTube Data API v3 キー>
GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth シークレット>
GOOGLE_REDIRECT_URI=<OAuth コールバックURI>
```

## 依存関係 (go.mod)

```go
require (
    github.com/gin-gonic/gin         // Webフレームワーク
    github.com/joho/godotenv         // 環境変数読み込み
    golang.org/x/crypto/bcrypt       // パスワードハッシュ化
    gorm.io/gorm                     // ORM
    gorm.io/driver/sqlite            // SQLiteドライバ
    modernc.org/sqlite               // Pure Go SQLite
)
```

## セキュリティ

### 認証

- bcryptによるパスワードハッシュ化（DefaultCost）
- トークンベース認証（簡易実装、JWT推奨）

### CORS設定

- Access-Control-Allow-Origin: *
- すべてのHTTPメソッドを許可

### API Key管理

- 環境変数からYouTube APIキーを読み込み
- 起動時に存在確認

## パフォーマンス最適化

### キャッシュ戦略

```go
// 配信状態キャッシュ（5分有効）
streamStatusCache map[string]CacheItem

// 盛り上がりメトリクスキャッシュ
surgeMetricsCache map[string]SurgeMetrics

// コメント履歴（30分保持、最新20件）
commentHistory map[string][]CommentSnapshot
```

### 並列処理

- 複数配信の盛り上がり取得でgoroutineを使用
- sync.WaitGroupで同期管理

## エラーハンドリング

### YouTube API エラー

- コメント無効化（403）: 空データを返して続行
- APIキー未設定: 400 Bad Request
- 取得失敗: 502 Bad Gateway（詳細エラー付き）

### データベースエラー

- AutoMigrate失敗: プログラム終了
- UNIQUE制約違反: 409 Conflict
- 一般的なDB操作エラー: 500 Internal Server Error

## ログ出力

```go
log.Printf("[DEBUG] ...")    // デバッグ情報
log.Printf("情報: ...")       // 通常ログ
log.Printf("エラー: ...")     // エラーログ
console.log("🔥 盛り上がり...") // フロント向け
```

## 起動方法

```bash
cd backend
# 環境変数を設定（.envファイル）
go run .
# または
CGO_ENABLED=0 go run .  # Pure Go SQLite使用時
```

サーバーは `http://localhost:8080` で起動します。
