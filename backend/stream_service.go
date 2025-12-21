package main

import (
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

// 盛り上がり単語リスト
var SurgeKeywords = []string{
	"w", "W", "草", "kusa", "KUSA",
	"8888", "888", "88",
	"！", "！？", "！？", "!!!",
	"lol", "LOL", "笑", "www",
	"かわいい", "すごい", "すげえ", "やばい",
	"神", "尊い", "尊", "推し",
}

// 盛り上がり単語を検出
func detectSurgeKeywords(commentText string) bool {
	textLower := strings.ToLower(commentText)
	for _, keyword := range SurgeKeywords {
		// 大文字小文字を区別しない検索
		if strings.Contains(textLower, strings.ToLower(keyword)) {
			return true
		}
	}
	// 感嘆符のパターンもチェック
	exclamationPattern := regexp.MustCompile(`[！!]{2,}`)
	if exclamationPattern.MatchString(commentText) {
		return true
	}
	return false
}

// 配信状態取得関数（プラットフォーム判定と結果正規化）
func getStreamStatus(talent Talent) (*StreamStatus, error) {
	status := &StreamStatus{
		TalentID:   talent.ID,
		TalentName: talent.Name,
		ChannelID:  talent.ChannelID,
		Platform:   talent.Platform,
		IsLive:     false,
	}

	switch strings.ToLower(talent.Platform) {
	case "youtube":
		youtubeStatus, err := getYouTubeLiveStatus(talent.ChannelID)
		if err != nil {
			log.Printf("YouTube配信状態取得エラー (ChannelID: %s): %v", talent.ChannelID, err)
			return status, err
		}
		status.IsLive = youtubeStatus.IsLive
		status.StreamURL = youtubeStatus.StreamURL
		status.Title = youtubeStatus.Title
		status.ViewerCount = youtubeStatus.ViewerCount
		status.ThumbnailURL = youtubeStatus.ThumbnailURL
	case "twitch":
		// Twitchは後で実装
		log.Printf("Twitch配信状態取得は未実装です (ChannelID: %s)", talent.ChannelID)
		status.IsLive = false
	default:
		return nil, fmt.Errorf("サポートされていないプラットフォーム: %s", talent.Platform)
	}

	return status, nil
}

// 推し優先ルール適用
// ユーザーの推しをメイン枠に設定し、音量プリセットを適用
func applyOshiPriorityRule(db *gorm.DB, userID uint, liveStreams []StreamStatus, defaultVolume int) ([]SessionStream, error) {
	// ユーザーの推しを取得
	var user User
	if err := db.Preload("Favorites").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("ユーザーの取得に失敗しました: %v", err)
	}

	// 推しのTalentIDをマップに変換（高速検索用）
	oshiMap := make(map[uint]bool)
	for _, favorite := range user.Favorites {
		oshiMap[favorite.ID] = true
	}

	// 推しの音量プリセットを取得
	var presets []OshiVolumePreset
	db.Where("user_id = ?", userID).Find(&presets)
	presetMap := make(map[uint]int)
	for _, preset := range presets {
		presetMap[preset.TalentID] = preset.Volume
	}

	var sessionStreams []SessionStream
	position := 0
	mainSet := false

	// 推しの配信を先に処理（メイン枠に設定）
	for _, stream := range liveStreams {
		if oshiMap[stream.TalentID] {
			volume := defaultVolume
			if v, ok := presetMap[stream.TalentID]; ok {
				volume = v
			}

			// VideoIDをStreamURLから抽出
			videoID := extractVideoIDFromURL(stream.StreamURL)

			sessionStreams = append(sessionStreams, SessionStream{
				TalentID:  stream.TalentID,
				VideoID:   videoID,
				StreamURL: stream.StreamURL,
				Title:     stream.Title,
				IsMain:    !mainSet, // 最初の推しをメインに
				Volume:    volume,
				Position:  position,
			})
			if !mainSet {
				mainSet = true
			}
			position++
		}
	}

	// その他の配信をサブ枠に設定
	for _, stream := range liveStreams {
		if !oshiMap[stream.TalentID] {
			videoID := extractVideoIDFromURL(stream.StreamURL)

			sessionStreams = append(sessionStreams, SessionStream{
				TalentID:  stream.TalentID,
				VideoID:   videoID,
				StreamURL: stream.StreamURL,
				Title:     stream.Title,
				IsMain:    false,
				Volume:    defaultVolume,
				Position:  position,
			})
			position++
		}
	}

	return sessionStreams, nil
}

// StreamURLからVideoIDを抽出
func extractVideoIDFromURL(url string) string {
	// YouTube URL形式: https://www.youtube.com/watch?v=VIDEO_ID
	if strings.Contains(url, "watch?v=") {
		parts := strings.Split(url, "watch?v=")
		if len(parts) > 1 {
			videoID := strings.Split(parts[1], "&")[0]
			return videoID
		}
	}
	// YouTube URL形式: https://youtu.be/VIDEO_ID
	if strings.Contains(url, "youtu.be/") {
		parts := strings.Split(url, "youtu.be/")
		if len(parts) > 1 {
			videoID := strings.Split(parts[1], "?")[0]
			return videoID
		}
	}
	return ""
}

// コメント増加量スコア計算
func calculateCommentGrowthScore(current CommentSnapshot, history []CommentSnapshot) float64 {
	if len(history) < 1 {
		log.Printf("  [コメント増加] 履歴なし → スコア: 0.0")
		return 0.0
	}

	// 過去5分間の平均コメント数
	recentTime := current.Timestamp.Add(-5 * time.Minute)
	recentCount := 0
	recentSamples := 0

	for _, h := range history {
		if h.Timestamp.After(recentTime) {
			recentCount += h.CommentCount
			recentSamples++
		}
	}

	if recentSamples == 0 {
		log.Printf("  [コメント増加] 5分以内のデータなし → スコア: 0.0")
		return 0.0
	}

	avgRecentComments := float64(recentCount) / float64(recentSamples)

	// 現在のコメント数との比較
	growthRate := 0.0
	if avgRecentComments > 0 {
		growthRate = float64(current.CommentCount) / avgRecentComments
	}

	log.Printf("  [コメント増加] 現在: %d, 平均: %.1f, 増加率: %.2fx",
		current.CommentCount, avgRecentComments, growthRate)

	// スコア化（0.0-1.0）
	score := 0.0
	if growthRate > 3.0 {
		score = 1.0 // 3倍以上で最大
	} else if growthRate > 2.0 {
		score = 0.7
	} else if growthRate > 1.5 {
		score = 0.5
	} else if growthRate > 1.2 {
		score = 0.3
	} else if growthRate > 1.0 {
		score = 0.1
	}

	log.Printf("  [コメント増加] → スコア: %.2f", score)
	return score
}

// 盛り上がり単語含有率スコア計算
func calculateKeywordScore(analysis CommentAnalysis) float64 {
	// 含有率に基づいてスコア化
	rate := analysis.SurgeKeywordRate

	log.Printf("  [キーワード] キーワード率: %.2f%% (%d/%d)",
		rate*100, analysis.SurgeKeywordCount, analysis.TotalComments)

	score := 0.0
	if rate > 0.5 {
		score = 1.0 // 50%以上で最大
	} else if rate > 0.3 {
		score = 0.7
	} else if rate > 0.2 {
		score = 0.5
	} else if rate > 0.1 {
		score = 0.3
	} else if rate > 0.05 {
		score = 0.1
	}

	log.Printf("  [キーワード] → スコア: %.2f", score)
	return score
}

// スーパーチャットスコア計算
func calculateSuperChatScore(amount float64, count int, viewerCount int) float64 {
	score := 0.0

	// スーパーチャット件数ベース
	if count > 10 {
		score += 0.5 // 10件以上で0.5点
	} else if count > 5 {
		score += 0.3
	} else if count > 2 {
		score += 0.1
	}

	// スーパーチャット金額ベース（視聴者数で正規化）
	if viewerCount > 0 {
		amountPerViewer := amount / float64(viewerCount)
		if amountPerViewer > 1.0 {
			score += 0.5 // 1円/視聴者以上で0.5点
		} else if amountPerViewer > 0.5 {
			score += 0.3
		} else if amountPerViewer > 0.1 {
			score += 0.1
		}
	} else {
		// 視聴者数が不明な場合、絶対額で判定
		if amount > 1000 {
			score += 0.5
		} else if amount > 500 {
			score += 0.3
		} else if amount > 100 {
			score += 0.1
		}
	}

	// スコアを0.0-1.0に正規化
	if score > 1.0 {
		score = 1.0
	}

	return score
}

// 盛り上がりスコア計算（重み付け版）
func calculateSurgeScore(
	videoID string,
	talentID uint,
	current CommentSnapshot,
	currentAnalysis CommentAnalysis,
	superChatAmount float64,
	superChatCount int,
	history []CommentSnapshot,
	weights SurgeWeightSettings,
) SurgeMetrics {
	metrics := SurgeMetrics{
		VideoID:  videoID,
		TalentID: talentID,
	}

	// 1. コメント増加量スコア（0.0-1.0）
	commentGrowthScore := calculateCommentGrowthScore(current, history)
	metrics.CommentGrowthScore = commentGrowthScore

	// 2. 盛り上がり単語含有率スコア（0.0-1.0）
	keywordScore := calculateKeywordScore(currentAnalysis)
	metrics.KeywordScore = keywordScore

	// 3. スーパーチャットスコア（0.0-1.0）
	superChatScore := calculateSuperChatScore(superChatAmount, superChatCount, current.ViewerCount)
	metrics.SuperChatScore = superChatScore

	// 4. 総合スコア（重み付け平均）
	metrics.SurgeScore = commentGrowthScore*weights.CommentGrowthWeight +
		keywordScore*weights.KeywordWeight +
		superChatScore*weights.SuperChatWeight

	// スコアを0.0-1.0の範囲に正規化
	if metrics.SurgeScore > 1.0 {
		metrics.SurgeScore = 1.0
	}

	// コメント速度の計算
	if len(history) > 0 {
		oldest := history[0]
		timeDiff := current.Timestamp.Sub(oldest.Timestamp).Seconds()
		commentDiff := current.CommentCount - oldest.CommentCount
		if timeDiff > 0 {
			metrics.CommentRate = float64(commentDiff) / timeDiff
		}
	}

	// コメント増加率の計算
	if len(history) >= 5 {
		var totalComments int
		for _, h := range history {
			totalComments += h.CommentCount
		}
		avgComments := float64(totalComments) / float64(len(history))
		if avgComments > 0 {
			metrics.CommentGrowthRate = float64(current.CommentCount) / avgComments
		}
	}

	metrics.LastUpdated = time.Now()
	return metrics
}
