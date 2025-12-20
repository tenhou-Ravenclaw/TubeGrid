package main

import (
	"fmt"
	"log"
	"strings"
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

