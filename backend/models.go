package main

import "gorm.io/gorm"

// --- データモデル定義 ---

type User struct {
	gorm.Model
	Name          string   `json:"name" binding:"required"`
	Email         string   `json:"email" binding:"required,email" gorm:"unique"`
	DefaultVolume int      `json:"default_volume" gorm:"default:50"`
	LayoutSetting string   `json:"layout_setting" gorm:"default:'grid'"`
	Favorites     []Talent `gorm:"many2many:user_favorites;" json:"favorites"`
}

type Talent struct {
	gorm.Model
	Name      string  `json:"name" binding:"required"`
	ChannelID string  `json:"channel_id" binding:"required" gorm:"unique"`
	Platform  string  `json:"platform" binding:"required"`
	Groups    []Group `gorm:"many2many:talent_groups;" json:"groups"`
}

type Group struct {
	gorm.Model
	Name    string   `json:"name" binding:"required" gorm:"unique"`
	Talents []Talent `gorm:"many2many:talent_groups;" json:"talents"`
}

// 配信状態
type StreamStatus struct {
	TalentID     uint   `json:"talent_id"`
	TalentName   string `json:"talent_name"`
	ChannelID    string `json:"channel_id"`
	Platform     string `json:"platform"`
	IsLive       bool   `json:"is_live"`
	StreamURL    string `json:"stream_url"`
	Title        string `json:"title"`
	ViewerCount  int    `json:"viewer_count"`
	ThumbnailURL string `json:"thumbnail_url"`
}

// ルームレイアウト
type RoomLayout struct {
	gorm.Model
	UserID      uint   `json:"user_id" gorm:"index"`
	MonitorID   string `json:"monitor_id"`   // モニター識別子（一意）
	VideoID     string `json:"video_id"`     // YouTube動画ID
	X           int    `json:"x"`            // X座標
	Y           int    `json:"y"`            // Y座標
	Rotate      int    `json:"rotate"`       // 回転角度
	Width       int    `json:"width"`        // 幅
	Height      int    `json:"height"`       // 高さ
	ZIndex      int    `json:"z_index"`      // z-index
	IsMain      bool   `json:"is_main"`      // メインモニターか
	IsOshi      bool   `json:"is_oshi"`      // 推しモニターか
	Label       string `json:"label"`        // ラベル
	MonitorType string `json:"monitor_type"` // モニタータイプ（"main", "small"など）
}

