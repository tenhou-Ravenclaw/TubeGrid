package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// HTTPクライアント（タイムアウト設定付き）
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// YouTube API Key取得と検証
func getYouTubeAPIKey() (string, error) {
	apiKey := os.Getenv("YOUTUBE_API_KEY")
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
			Title      string `json:"title"`
			Thumbnails struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
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
			Title       string `json:"title"`
			Description string `json:"description"`
			PublishedAt string `json:"publishedAt"`
			ChannelID   string `json:"channelId"`
			ChannelTitle string `json:"channelTitle"`
			Thumbnails struct {
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
	ChannelID    string `json:"channel_id"`
	ChannelName  string `json:"channel_name"`
	ThumbnailURL string `json:"thumbnail_url"`
	Description  string `json:"description"`
	SubscriberCount string `json:"subscriber_count"`
}

// YouTubeチャンネル情報取得用レスポンス構造体
type YouTubeChannelInfoResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Thumbnails struct {
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
		ChannelID:     channelID,
		ChannelName:   item.Snippet.Title,
		ThumbnailURL:  item.Snippet.Thumbnails.Default.URL,
		Description:   item.Snippet.Description,
		SubscriberCount: item.Statistics.SubscriberCount,
	}, nil
}

