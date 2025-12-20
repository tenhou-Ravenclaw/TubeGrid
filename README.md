# TubeGrid - 推し活コマンドセンター

複数のYouTube配信を同時視聴し、音量バランスを調整できるアプリケーションです。

## 必要な環境

- Node.js (v18以上推奨)
- Go (v1.21以上推奨)
- YouTube Data API v3 のAPIキー

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd TubeGrid
```

### 2. フロントエンドの依存関係インストール

```bash
npm install
```

### 3. バックエンドの依存関係インストール

```bash
cd backend
go mod download
cd ..
```

### 4. 環境変数の設定

`backend`ディレクトリに`.env`ファイルを作成し、YouTube APIキーを設定します：

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**YouTube APIキーの取得方法:**
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「認証情報」からAPIキーを作成
4. 「YouTube Data API v3」を有効化

## 起動方法

### バックエンドの起動

**Windows (PowerShell):**
```powershell
cd backend
$env:CGO_ENABLED='0'
go run .
```

**Linux/Mac:**
```bash
cd backend
CGO_ENABLED=0 go run .
```

**重要:**
- `go run main.go`ではなく、`go run .`を使用してください
- `CGO_ENABLED=0`を設定することで、CGO不要の`modernc.org/sqlite`ドライバーが使用されます

バックエンドは `http://localhost:8080` で起動します。

### フロントエンドの起動

別のターミナルで：

```bash
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

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
- `backend/.env`ファイルに `YOUTUBE_API_KEY` が設定されているか確認
- APIキーが有効か確認
- YouTube Data API v3が有効になっているか確認

### ポートが既に使用されている場合
- バックエンド: ポート8080を使用しているプロセスを確認・停止
- フロントエンド: ポート5173を使用しているプロセスを確認・停止

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
