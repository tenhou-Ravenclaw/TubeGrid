# TubeGrid - 推し活コマンドセンター

複数のYouTube配信を同時視聴し、音量バランスを調整できるアプリケーションです。

## 必要な環境

- Node.js 18以降（Vite 7対応）
- npm
- Go 1.22+（go.modは1.25指定、1.22以降推奨）
- Python 3.10+（auth-server用）
- YouTube Data API v3 のAPIキー
- Google OAuth 2.0 クライアントID/Secret（Googleログイン用）

## セットアップ（クイックスタート）

1. リポジトリ取得
	```bash
	git clone <repository-url>
	cd TubeGrid
	```

2. ルートに .env を作成（バックエンド・auth-server 共通）
	```env
	YOUTUBE_API_KEY=your_youtube_api_key
	GOOGLE_CLIENT_ID=your_google_client_id
	GOOGLE_CLIENT_SECRET=your_google_client_secret
	GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
	```

3. フロントエンド依存をインストール
	```bash
	npm install
	```

4. バックエンド依存を取得
	```bash
	cd backend
	go mod download
	cd ..
	```

## 起動方法

### 1) Go バックエンド (Gin + SQLite)

**Windows (PowerShell):**
```powershell
cd backend
$env:CGO_ENABLED='0'
go run .
```

**macOS/Linux:**
```bash
cd backend
CGO_ENABLED=0 go run .
```

- サービス: http://localhost:8080
- SQLite DB: backend/user.db （auth-server と共有）
- `go run .` を使用してください（単一ファイル指定ではなくディレクトリ指定）。

### 2) auth-server (FastAPI + Google OAuth)

**Windows (PowerShell):**
```powershell
cd auth-server
.\.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**macOS/Linux:**
```bash
cd auth-server
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- サービス: http://localhost:8000
- コールバックURIは .env の `GOOGLE_REDIRECT_URI` と一致させてください（例: http://localhost:8000/auth/callback）。
- Gin側の SQLite (backend/user.db) を参照します。バックエンドを先に起動しておくと初期化が安定します。

### 3) フロントエンド (Vite + React)

別ターミナルで:
```bash
npm run dev
```

- サービス: http://localhost:5173
- CORS は http://localhost:5173 が許可済みです。

## 使い方

### 1. アプリにアクセス

ブラウザで `http://localhost:5173` にアクセスします。

### 2. ページの切り替え

画面上部のボタンで「メインアプリ」と「APIテストページ」を切り替えられます。

### 3. 基本的な操作フロー

1. **ユーザー登録**: APIテストページでユーザーを登録
2. **配信者登録**: YouTubeチャンネルIDを入力して配信者を登録（チャンネル名は自動取得）
3. **グループ作成**: 配信者をグループ化（例: ホロライブ）
4. **グループに配信者を追加**: グループ一覧から配信者を追加
5. **推し登録**: ユーザーの推し配信者を登録
6. **音量プリセット設定**: 推しごとの音量を設定
7. **セッション作成**: グループを選択して視聴セッションを作成（推し優先ルール自動適用）
8. **動画再生テスト**: 動画再生・音量バランステストセクションで動作確認

## 主な機能

- **ユーザー管理**: ユーザー登録、設定管理
- **配信者管理**: YouTube配信者の登録、配信状態取得
- **グループ管理**: 配信者のグループ化（箱推し対応）
- **視聴セッション管理**: 複数配信の同時視聴、メイン/サブモニター管理
- **音量バランス調整**: 各配信の音量を個別に調整
- **推し優先ルール**: 推し配信者を自動でメイン枠に設定
- **音量プリセット**: 推しごとの音量設定を保存

## トラブルシューティング

### CORSエラーが発生する場合
- バックエンドとフロントエンドが両方起動しているか確認
- ブラウザのコンソールでエラー内容を確認

### API接続エラーが発生する場合
- バックエンドが `http://localhost:8080` で起動しているか確認
- フロントエンドの `API_BASE_URL` が正しいか確認（`src/ApiTest.jsx`、`src/App.jsx`）

### YouTube APIエラーが発生する場合
- ルート`.env`に `YOUTUBE_API_KEY` が設定されているか確認
- APIキーが有効か確認
- YouTube Data API v3が有効になっているか確認

### Google認証でエラーが発生する場合
- ルート`.env`の `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI` を確認
- Cloud ConsoleでOAuth同意画面とリダイレクトURIが一致しているか確認

### auth-serverがDBに接続できない場合
- `backend/user.db` が作成済みか確認（バックエンド起動で自動生成）
- auth-serverを実行するカレントディレクトリが `auth-server` であることを確認

### ポートが既に使用されている場合
- バックエンド: ポート8080を使用しているプロセスを確認・停止
- フロントエンド: ポート5173を使用しているプロセスを確認・停止
- auth-server: ポート8000を使用しているプロセスを確認・停止

## 開発

### バックエンドのビルド

```bash
cd backend
CGO_ENABLED=0 go build -o tube-grid-backend .
```

### フロントエンドのビルド

```bash
npm run build
```

### リンターの実行

```bash
npm run lint
```
