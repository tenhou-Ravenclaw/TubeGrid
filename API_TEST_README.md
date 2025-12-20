# API動作確認ガイド

## セットアップ

### 1. バックエンドの起動

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

**重要**: 
- `go run main.go`ではなく、`go run .`を使用してください。複数のファイル（`main.go`, `models.go`, `youtube_client.go`, `stream_service.go`）を一緒にコンパイルする必要があります。
- `CGO_ENABLED=0`を設定することで、CGO不要の`modernc.org/sqlite`ドライバーが使用されます。

バックエンドは `http://localhost:8080` で起動します。

### 2. フロントエンドの起動

別のターミナルで：

```bash
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

## 動作確認手順

### 1. ユーザー登録
1. 「ユーザー登録」ボタンをクリック
2. 自動的にユーザーが作成されます
3. 登録されたユーザーIDをメモしておいてください

### 2. 配信者登録
1. 「配信者登録」ボタンをクリック
2. チャンネルIDを入力（例: `UCxxxxxxxxxxxxx`）
   - YouTubeチャンネルIDは、チャンネルURLから取得できます
   - 例: `https://www.youtube.com/channel/UCxxxxxxxxxxxxx` → `UCxxxxxxxxxxxxx`
3. 登録が完了すると、配信者一覧に表示されます

### 3. 配信状態取得
1. 配信者一覧から「配信状態取得」ボタンをクリック
2. 現在の配信状態が表示されます
   - 🔴 LIVE: 配信中
   - ⚫ OFFLINE: 配信していない

### 4. グループ作成
1. 「グループ作成」ボタンをクリック
2. グループ名を入力（例: 「ホロライブ」）
3. グループが作成されます

### 5. グループにメンバーを追加
- 現在はAPI経由で追加する必要があります
- 例: `POST /groups/:group_id/add-talent/:talent_id`

### 6. 箱推し一括展開（LIVE配信取得）
1. グループ一覧から「LIVE配信一括取得」ボタンをクリック
2. グループ内のLIVE中の配信のみが表示されます

## 注意事項

- YouTube API Keyが必要です（`.env`ファイルに設定）
- バックエンドとフロントエンドが両方起動していることを確認してください
- CORSエラーが発生する場合は、バックエンドのCORS設定を確認してください

## トラブルシューティング

### CORSエラーが発生する場合
- バックエンドのCORS設定が正しく追加されているか確認
- ブラウザのコンソールでエラー内容を確認

### API接続エラーが発生する場合
- バックエンドが `http://localhost:8080` で起動しているか確認
- フロントエンドの `API_BASE_URL` が正しいか確認

### YouTube APIエラーが発生する場合
- `.env`ファイルに `YOUTUBE_API_KEY` が設定されているか確認
- APIキーが有効か確認

