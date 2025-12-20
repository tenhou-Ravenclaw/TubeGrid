package main

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
)

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

