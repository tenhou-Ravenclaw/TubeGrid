package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

// HTTPクライアント（タイムアウト設定付き）
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// YouTube API Key取得と検証
func getYouTubeAPIKey() (string, error) {
	// #region agent log
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	apiKeyLen := len(apiKey)
	log.Printf("[DEBUG] getYouTubeAPIKey: apiKey存在=%v, 長さ=%d", apiKey != "", apiKeyLen)
	// #endregion
	if apiKey == "" {
		return "", fmt.Errorf("YOUTUBE_API_KEY環境変数が設定されていません")
	}
	return apiKey, nil
}

// YouTube APIレスポンス構造体
type YouTubeSearchResponse struct {
	Items []struct {
		ID struct {
			VideoID string `json:"videoId"`
		} `json:"id"`
		Snippet struct {
			Title        string `json:"title"`
			Description  string `json:"description"`
			ChannelID    string `json:"channelId"`
			ChannelTitle string `json:"channelTitle"`
			PublishedAt  string `json:"publishedAt"`
			Thumbnails   struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
				Medium struct {
					URL string `json:"url"`
				} `json:"medium"`
				High struct {
					URL string `json:"url"`
				} `json:"high"`
			} `json:"thumbnails"`
		} `json:"snippet"`
	} `json:"items"`
}

type YouTubeVideoResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title      string `json:"title"`
			Thumbnails struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		LiveStreamingDetails struct {
			ConcurrentViewers string `json:"concurrentViewers"`
		} `json:"liveStreamingDetails"`
		Status struct {
			LifeCycleStatus string `json:"lifeCycleStatus"`
		} `json:"status"`
	} `json:"items"`
}

// YouTube配信状態取得
func getYouTubeLiveStatus(channelID string) (*StreamStatus, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		log.Printf("エラー: APIキーの取得に失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("APIキーの取得に失敗: %v", err)
	}

	// Search API: チャンネルのライブ配信を検索
	searchURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=%s&eventType=live&type=video&key=%s",
		channelID, apiKey,
	)

	log.Printf("YouTube Search API呼び出し: ChannelID=%s", channelID)
	resp, err := httpClient.Get(searchURL)
	if err != nil {
		log.Printf("エラー: YouTube Search API呼び出し失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("YouTube Search API呼び出し失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("エラー: YouTube Search API エラー (ChannelID: %s, ステータス: %d): %s", channelID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Search API エラー (ステータス: %d): %s", resp.StatusCode, string(body))
	}

	var searchResp YouTubeSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		log.Printf("エラー: レスポンスのパースに失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("レスポンスのパースに失敗: %v", err)
	}

	// ライブ配信が見つからない場合
	if len(searchResp.Items) == 0 {
		log.Printf("情報: ライブ配信が見つかりません (ChannelID: %s)", channelID)
		return &StreamStatus{
			ChannelID: channelID,
			Platform:  "youtube",
			IsLive:    false,
		}, nil
	}

	// 最初のライブ配信の詳細を取得
	videoID := searchResp.Items[0].ID.VideoID
	videoURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=%s&key=%s",
		videoID, apiKey,
	)

	log.Printf("YouTube Videos API呼び出し: VideoID=%s", videoID)
	videoResp, err := httpClient.Get(videoURL)
	if err != nil {
		log.Printf("エラー: YouTube Videos API呼び出し失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("YouTube Videos API呼び出し失敗: %v", err)
	}
	defer videoResp.Body.Close()

	if videoResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(videoResp.Body)
		log.Printf("エラー: YouTube Videos API エラー (VideoID: %s, ステータス: %d): %s", videoID, videoResp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Videos API エラー (ステータス: %d): %s", videoResp.StatusCode, string(body))
	}

	var videoData YouTubeVideoResponse
	if err := json.NewDecoder(videoResp.Body).Decode(&videoData); err != nil {
		log.Printf("エラー: レスポンスのパースに失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("レスポンスのパースに失敗: %v", err)
	}

	if len(videoData.Items) == 0 {
		log.Printf("情報: 動画情報が見つかりません (VideoID: %s)", videoID)
		return &StreamStatus{
			ChannelID: channelID,
			Platform:  "youtube",
			IsLive:    false,
		}, nil
	}

	item := videoData.Items[0]
	viewerCount := 0
	if item.LiveStreamingDetails.ConcurrentViewers != "" {
		fmt.Sscanf(item.LiveStreamingDetails.ConcurrentViewers, "%d", &viewerCount)
	}

	streamURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	isLive := item.Status.LifeCycleStatus == "live"

	log.Printf("成功: 配信状態取得完了 (ChannelID: %s, IsLive: %v, ViewerCount: %d)", channelID, isLive, viewerCount)

	return &StreamStatus{
		ChannelID:    channelID,
		Platform:     "youtube",
		IsLive:       isLive,
		StreamURL:    streamURL,
		Title:        item.Snippet.Title,
		ViewerCount:  viewerCount,
		ThumbnailURL: item.Snippet.Thumbnails.Default.URL,
	}, nil
}

// 動画情報
type VideoInfo struct {
	VideoID      string `json:"video_id"`
	Title        string `json:"title"`
	ThumbnailURL string `json:"thumbnail_url"`
	ChannelID    string `json:"channel_id"`
	ChannelName  string `json:"channel_name"`
	PublishedAt  string `json:"published_at"`
	Duration     string `json:"duration"`
	Description  string `json:"description"`
}

// YouTube動画情報取得用レスポンス構造体
type YouTubeVideoInfoResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title        string `json:"title"`
			Description  string `json:"description"`
			PublishedAt  string `json:"publishedAt"`
			ChannelID    string `json:"channelId"`
			ChannelTitle string `json:"channelTitle"`
			Thumbnails   struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		ContentDetails struct {
			Duration string `json:"duration"`
		} `json:"contentDetails"`
	} `json:"items"`
}

// 動画情報取得
func getVideoInfo(videoID string) (*VideoInfo, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		log.Printf("エラー: APIキーの取得に失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("APIキーの取得に失敗: %v", err)
	}

	// Videos API: 動画情報を取得
	videoURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=%s&key=%s",
		videoID, apiKey,
	)

	log.Printf("YouTube Videos API呼び出し: VideoID=%s", videoID)
	resp, err := httpClient.Get(videoURL)
	if err != nil {
		log.Printf("エラー: YouTube Videos API呼び出し失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("YouTube Videos API呼び出し失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("エラー: YouTube Videos API エラー (VideoID: %s, ステータス: %d): %s", videoID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Videos API エラー (ステータス: %d): %s", resp.StatusCode, string(body))
	}

	var videoData YouTubeVideoInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&videoData); err != nil {
		log.Printf("エラー: レスポンスのパースに失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("レスポンスのパースに失敗: %v", err)
	}

	if len(videoData.Items) == 0 {
		log.Printf("情報: 動画情報が見つかりません (VideoID: %s)", videoID)
		return nil, fmt.Errorf("動画情報が見つかりません (VideoID: %s)", videoID)
	}

	item := videoData.Items[0]

	log.Printf("成功: 動画情報取得完了 (VideoID: %s, Title: %s)", videoID, item.Snippet.Title)

	return &VideoInfo{
		VideoID:      videoID,
		Title:        item.Snippet.Title,
		ThumbnailURL: item.Snippet.Thumbnails.Default.URL,
		ChannelID:    item.Snippet.ChannelID,
		ChannelName:  item.Snippet.ChannelTitle,
		PublishedAt:  item.Snippet.PublishedAt,
		Duration:     item.ContentDetails.Duration,
		Description:  item.Snippet.Description,
	}, nil
}

// チャンネル情報
type ChannelInfo struct {
	ChannelID       string `json:"channel_id"`
	ChannelName     string `json:"channel_name"`
	ThumbnailURL    string `json:"thumbnail_url"`
	Description     string `json:"description"`
	SubscriberCount string `json:"subscriber_count"`
}

// YouTubeチャンネル情報取得用レスポンス構造体
type YouTubeChannelInfoResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Thumbnails  struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		Statistics struct {
			SubscriberCount string `json:"subscriberCount"`
		} `json:"statistics"`
	} `json:"items"`
}

// チャンネル情報取得
func getChannelInfo(channelID string) (*ChannelInfo, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		log.Printf("エラー: APIキーの取得に失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("APIキーの取得に失敗: %v", err)
	}

	// Channels API: チャンネル情報を取得
	channelURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=%s&key=%s",
		channelID, apiKey,
	)

	log.Printf("YouTube Channels API呼び出し: ChannelID=%s", channelID)
	resp, err := httpClient.Get(channelURL)
	if err != nil {
		log.Printf("エラー: YouTube Channels API呼び出し失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("YouTube Channels API呼び出し失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("エラー: YouTube Channels API エラー (ChannelID: %s, ステータス: %d): %s", channelID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Channels API エラー (ステータス: %d): %s", resp.StatusCode, string(body))
	}

	var channelData YouTubeChannelInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&channelData); err != nil {
		log.Printf("エラー: レスポンスのパースに失敗 (ChannelID: %s): %v", channelID, err)
		return nil, fmt.Errorf("レスポンスのパースに失敗: %v", err)
	}

	if len(channelData.Items) == 0 {
		log.Printf("情報: チャンネル情報が見つかりません (ChannelID: %s)", channelID)
		return nil, fmt.Errorf("チャンネル情報が見つかりません (ChannelID: %s)", channelID)
	}

	item := channelData.Items[0]

	log.Printf("成功: チャンネル情報取得完了 (ChannelID: %s, Name: %s)", channelID, item.Snippet.Title)

	return &ChannelInfo{
		ChannelID:       channelID,
		ChannelName:     item.Snippet.Title,
		ThumbnailURL:    item.Snippet.Thumbnails.Default.URL,
		Description:     item.Snippet.Description,
		SubscriberCount: item.Statistics.SubscriberCount,
	}, nil
}

// 動画検索結果
type VideoSearchResult struct {
	VideoID      string `json:"video_id"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	ThumbnailURL string `json:"thumbnail_url"`
	ChannelID    string `json:"channel_id"`
	ChannelName  string `json:"channel_name"`
	PublishedAt  string `json:"published_at"`
}

// YouTubeコメント取得レスポンス構造体
type YouTubeCommentResponse struct {
	Items []struct {
		Snippet struct {
			TopLevelComment struct {
				Snippet struct {
					TextDisplay string `json:"textDisplay"`
					AuthorName  string `json:"authorDisplayName"`
					PublishedAt string `json:"publishedAt"`
					LikeCount   int    `json:"likeCount"`
				} `json:"snippet"`
			} `json:"topLevelComment"`
		} `json:"snippet"`
	} `json:"items"`
	PageInfo struct {
		TotalResults int `json:"totalResults"`
	} `json:"pageInfo"`
}

// YouTubeライブ配信情報
type YouTubeBroadcast struct {
	Kind    string `json:"kind"`
	Etag    string `json:"etag"`
	ID      string `json:"id"`
	Snippet struct {
		PublishedAt  string `json:"publishedAt"`
		Title        string `json:"title"`
		Description  string `json:"description"`
		ChannelID    string `json:"channelId"`
		ChannelTitle string `json:"channelTitle"`
	} `json:"snippet"`
	LiveStreamingDetails struct {
		ActualStartTime    string `json:"actualStartTime"`
		ActualEndTime      string `json:"actualEndTime"`
		ScheduledStartTime string `json:"scheduledStartTime"`
		ConcurrentViewers  string `json:"concurrentViewers"`
		ActiveLiveChatID   string `json:"activeLiveChatId"` // ← これが正しいフィールド名
	} `json:"liveStreamingDetails"`
	Status struct {
		UploadStatus    string   `json:"uploadStatus"`
		PrivacyStatus   string   `json:"privacyStatus"`
		LifecycleStatus string   `json:"lifecycleStatus"`
		PublishAt       string   `json:"publishAt"`
		Failures        []string `json:"failures"`
	} `json:"status"`
}

// YouTubeビデオリスト（配信情報付き）
type YouTubeVideoListResponse struct {
	Items []YouTubeBroadcast `json:"items"`
}

// YouTube Live Chat Message Response
type YouTubeLiveChatResponse struct {
	NextPageToken         string `json:"nextPageToken"`
	PollingIntervalMillis int    `json:"pollingIntervalMillis"`
	PageInfo              struct {
		TotalResults   int `json:"totalResults"`
		ResultsPerPage int `json:"resultsPerPage"`
	} `json:"pageInfo"`
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Type              string `json:"type"` // textMessageEvent
			CreatedAt         string `json:"createdAt"`
			DisplayMessage    string `json:"displayMessage"`
			HasDisplayContent bool   `json:"hasDisplayContent"`
			AuthorChannelId   string `json:"authorChannelId"`
		} `json:"snippet"`
		AuthorDetails struct {
			ChannelId       string `json:"channelId"`
			DisplayName     string `json:"displayName"`
			ProfileImage    string `json:"profileImageUrl"`
			IsChatModerator bool   `json:"isChatModerator"`
			IsChatOwner     bool   `json:"isChatOwner"`
		} `json:"authorDetails"`
	} `json:"items"`
}

// YouTubeスーパーチャット取得レスポンス構造体
type YouTubeSuperChatResponse struct {
	Items []struct {
		Snippet struct {
			AmountMicros string `json:"amountMicros"`
			Currency     string `json:"currency"`
			DisplayName  string `json:"displayName"`
			MessageText  string `json:"messageText"`
		} `json:"snippet"`
	} `json:"items"`
}

// YouTube動画検索
func searchYouTubeVideos(query string, maxResults int) ([]VideoSearchResult, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		log.Printf("エラー: APIキーの取得に失敗 (Query: %s): %v", query, err)
		return nil, fmt.Errorf("APIキーの取得に失敗: %v", err)
	}

	// Search API: 動画を検索
	// URLエンコードを使用してクエリパラメータを正しくエンコード
	baseURL := "https://www.googleapis.com/youtube/v3/search"
	params := url.Values{}
	params.Set("part", "snippet")
	params.Set("q", query)
	params.Set("type", "video")
	params.Set("maxResults", fmt.Sprintf("%d", maxResults))
	params.Set("key", apiKey)
	searchURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	log.Printf("YouTube Search API呼び出し: Query=%s, MaxResults=%d", query, maxResults)
	resp, err := httpClient.Get(searchURL)
	if err != nil {
		log.Printf("エラー: YouTube Search API呼び出し失敗 (Query: %s): %v", query, err)
		return nil, fmt.Errorf("YouTube Search API呼び出し失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("エラー: YouTube Search API エラー (Query: %s, ステータス: %d): %s", query, resp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Search API エラー (ステータス: %d): %s", resp.StatusCode, string(body))
	}

	var searchResp YouTubeSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		log.Printf("エラー: レスポンスのパースに失敗 (Query: %s): %v", query, err)
		return nil, fmt.Errorf("レスポンスのパースに失敗: %v", err)
	}

	// 検索結果を変換
	results := make([]VideoSearchResult, 0, len(searchResp.Items))
	for _, item := range searchResp.Items {
		thumbnailURL := item.Snippet.Thumbnails.Default.URL
		if item.Snippet.Thumbnails.Medium.URL != "" {
			thumbnailURL = item.Snippet.Thumbnails.Medium.URL
		} else if item.Snippet.Thumbnails.High.URL != "" {
			thumbnailURL = item.Snippet.Thumbnails.High.URL
		}

		results = append(results, VideoSearchResult{
			VideoID:      item.ID.VideoID,
			Title:        item.Snippet.Title,
			Description:  item.Snippet.Description,
			ThumbnailURL: thumbnailURL,
			ChannelID:    item.Snippet.ChannelID,
			ChannelName:  item.Snippet.ChannelTitle,
			PublishedAt:  item.Snippet.PublishedAt,
		})
	}

	log.Printf("成功: 動画検索完了 (Query: %s, Results: %d)", query, len(results))
	return results, nil
}

// YouTubeコメント取得（最新N件）
func getYouTubeComments(videoID string, maxResults int) (*CommentAnalysis, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		return nil, err
	}

	// CommentThreads API: コメントを取得
	commentURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=%s&maxResults=%d&order=time&key=%s",
		videoID, maxResults, apiKey,
	)

	resp, err := httpClient.Get(commentURL)
	if err != nil {
		log.Printf("エラー: コメント取得失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("コメント取得失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// コメントが無効化されている場合（403）やその他のエラーは、空の分析結果を返す
		if resp.StatusCode == 403 {
			log.Printf("情報: コメントが無効化されています (VideoID: %s)", videoID)
			return &CommentAnalysis{
				TotalComments:     0,
				SurgeKeywordCount: 0,
				SurgeKeywordRate:  0.0,
				UniqueUsers:       0,
			}, nil
		}
		log.Printf("エラー: コメント取得APIエラー (VideoID: %s, ステータス: %d): %s", videoID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("コメント取得APIエラー: %d", resp.StatusCode)
	}

	var commentData YouTubeCommentResponse
	if err := json.NewDecoder(resp.Body).Decode(&commentData); err != nil {
		log.Printf("エラー: コメント解析失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("コメント解析失敗: %v", err)
	}

	analysis := &CommentAnalysis{
		TotalComments: commentData.PageInfo.TotalResults,
	}

	// 盛り上がり単語の検出（stream_service.goの関数を使用）
	uniqueUsers := make(map[string]bool)
	surgeKeywordCount := 0

	for _, item := range commentData.Items {
		text := item.Snippet.TopLevelComment.Snippet.TextDisplay
		author := item.Snippet.TopLevelComment.Snippet.AuthorName

		// ユニークユーザー数
		uniqueUsers[author] = true

		// 盛り上がり単語含有チェック（stream_service.goの関数を使用）
		if detectSurgeKeywords(text) {
			surgeKeywordCount++
		}
	}

	analysis.UniqueUsers = len(uniqueUsers)
	analysis.SurgeKeywordCount = surgeKeywordCount
	if len(commentData.Items) > 0 {
		analysis.SurgeKeywordRate = float64(surgeKeywordCount) / float64(len(commentData.Items))
	}

	return analysis, nil
}

// YouTube Live Chat メッセージ取得（ポーリング対応版）
func getYouTubeLiveChatMessages(liveChatID string, pageToken string, maxResults int) (*CommentAnalysis, string, int, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		return nil, "", 0, err
	}

	// Live Chat Messages API: メッセージをポーリング取得
	chatURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=%s&part=snippet,authorDetails&maxResults=%d&key=%s",
		liveChatID, maxResults, apiKey,
	)

	if pageToken != "" {
		chatURL += "&pageToken=" + url.QueryEscape(pageToken)
	}

	resp, err := httpClient.Get(chatURL)
	if err != nil {
		log.Printf("エラー: ライブチャット取得失敗 (LiveChatID: %s): %v", liveChatID, err)
		return nil, "", 0, fmt.Errorf("ライブチャット取得失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode == 403 {
			log.Printf("情報: ライブチャットが無効化されています (LiveChatID: %s)", liveChatID)
			return &CommentAnalysis{
				TotalComments:     0,
				SurgeKeywordCount: 0,
				SurgeKeywordRate:  0.0,
				UniqueUsers:       0,
			}, "", 0, nil
		}
		log.Printf("エラー: ライブチャットAPIエラー (LiveChatID: %s, ステータス: %d): %s", liveChatID, resp.StatusCode, string(body))
		return nil, "", 0, fmt.Errorf("ライブチャットAPIエラー: %d", resp.StatusCode)
	}

	var chatData YouTubeLiveChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatData); err != nil {
		log.Printf("エラー: ライブチャット解析失敗 (LiveChatID: %s): %v", liveChatID, err)
		return nil, "", 0, fmt.Errorf("ライブチャット解析失敗: %v", err)
	}

	analysis := &CommentAnalysis{
		TotalComments: len(chatData.Items), // ライブチャットでは取得件数を使用
	}

	// テキストメッセージのみを対象
	uniqueUsers := make(map[string]bool)
	surgeKeywordCount := 0
	textMessageCount := 0

	// 30秒以内の新鮮なメッセージのみカウント
	now := time.Now()
	recentThreshold := now.Add(-30 * time.Second)

	for _, item := range chatData.Items {
		// テキストメッセージのみ処理
		if item.Snippet.Type != "textMessageEvent" || !item.Snippet.HasDisplayContent {
			continue
		}

		// メッセージの投稿時刻を解析
		createdAt, err := time.Parse(time.RFC3339, item.Snippet.CreatedAt)
		if err == nil && createdAt.Before(recentThreshold) {
			// 30秒以上前のメッセージはスキップ
			continue
		}

		text := item.Snippet.DisplayMessage
		author := item.AuthorDetails.DisplayName

		textMessageCount++

		// ユニークユーザー数
		uniqueUsers[author] = true

		// 盛り上がり単語含有チェック
		if detectSurgeKeywords(text) {
			surgeKeywordCount++
		}
	}

	analysis.TotalComments = textMessageCount // 30秒以内のコメント数に更新
	analysis.UniqueUsers = len(uniqueUsers)
	analysis.SurgeKeywordCount = surgeKeywordCount
	if textMessageCount > 0 {
		analysis.SurgeKeywordRate = float64(surgeKeywordCount) / float64(textMessageCount)
	}

	log.Printf("  [ライブチャット] 全取得: %d件, 30秒以内: %d件, キーワード: %d件",
		len(chatData.Items), textMessageCount, surgeKeywordCount)

	return analysis, chatData.NextPageToken, chatData.PollingIntervalMillis, nil
}

// YouTubeスーパーチャット取得
func getYouTubeSuperChats(videoID string, maxResults int) (float64, int, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		return 0, 0, err
	}

	// SuperChatEvents API: スーパーチャットを取得
	// 注意: このAPIは配信者のみがアクセス可能な場合があります
	superChatURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/superChatEvents?part=snippet&snippet.videoId=%s&maxResults=%d&key=%s",
		videoID, maxResults, apiKey,
	)

	resp, err := httpClient.Get(superChatURL)
	if err != nil {
		// スーパーチャットAPIが利用できない場合は0を返す（エラーログは出力しない）
		return 0, 0, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// 403 Forbidden、401 Unauthorized などの場合は0を返す（エラーログは出力しない）
		// スーパーチャットAPIは配信者のみアクセス可能なため、エラーは正常なケース
		return 0, 0, nil
	}

	var superChatData YouTubeSuperChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&superChatData); err != nil {
		log.Printf("エラー: スーパーチャット解析失敗 (VideoID: %s): %v", videoID, err)
		return 0, 0, fmt.Errorf("スーパーチャット解析失敗: %v", err)
	}

	totalAmount := 0.0
	count := len(superChatData.Items)

	for _, item := range superChatData.Items {
		// amountMicrosはマイクロ単位（1000000マイクロ = 1円）
		var amountMicros int64
		fmt.Sscanf(item.Snippet.AmountMicros, "%d", &amountMicros)
		totalAmount += float64(amountMicros) / 1000000.0
	}

	return totalAmount, count, nil
}

// YouTube配信情報取得（ライブチャットID確認用）
func getYouTubeBroadcastInfo(videoID string) (*YouTubeBroadcast, error) {
	apiKey, err := getYouTubeAPIKey()
	if err != nil {
		log.Printf("エラー: APIキー取得失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("APIキー取得失敗: %v", err)
	}

	// Videos API: ライブ配信情報を取得
	videoURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=%s&key=%s",
		url.QueryEscape(videoID), apiKey,
	)

	log.Printf("📽️ YouTube Videos API呼び出し (配信情報): VideoID=%s", videoID)
	resp, err := httpClient.Get(videoURL)
	if err != nil {
		log.Printf("❌ 配信情報取得失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("配信情報取得失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ YouTube Videos API エラー (VideoID: %s, ステータス: %d): %s", videoID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("YouTube Videos API エラー (ステータス: %d)", resp.StatusCode)
	}

	var videoResp YouTubeVideoListResponse
	if err := json.NewDecoder(resp.Body).Decode(&videoResp); err != nil {
		log.Printf("❌ レスポンス解析失敗 (VideoID: %s): %v", videoID, err)
		return nil, fmt.Errorf("レスポンス解析失敗: %v", err)
	}

	if len(videoResp.Items) == 0 {
		log.Printf("⚠️ 動画情報なし (VideoID: %s)", videoID)
		return nil, fmt.Errorf("動画情報が見つかりません")
	}

	broadcastInfo := &videoResp.Items[0]

	// デバッグ: APIレスポンスの詳細をログ
	log.Printf("[DEBUG] ライブ配信情報詳細 (VideoID: %s):", videoID)
	log.Printf("  - LifecycleStatus: %s", broadcastInfo.Status.LifecycleStatus)
	log.Printf("  - ActiveLiveChatID: '%s'", broadcastInfo.LiveStreamingDetails.ActiveLiveChatID)
	log.Printf("  - Title: %s", broadcastInfo.Snippet.Title)

	// ライブチャットIDが存在するかチェック
	if broadcastInfo.LiveStreamingDetails.ActiveLiveChatID != "" {
		log.Printf("✅ ライブ配信 - LiveChatID存在 (VideoID: %s, LiveChatID: %s)", videoID, broadcastInfo.LiveStreamingDetails.ActiveLiveChatID)
	} else {
		log.Printf("📹 アーカイブ/通常動画 - ライブチャットIDなし (VideoID: %s, LifecycleStatus: %s)", videoID, broadcastInfo.Status.LifecycleStatus)
	}

	return broadcastInfo, nil
}
