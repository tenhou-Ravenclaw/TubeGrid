package main

import (
	"time"

	"gorm.io/gorm"
)

// --- データモデル定義 ---

type User struct {
	gorm.Model
	Name          string             `json:"name" binding:"required"`
	Email         string             `json:"email" binding:"required,email" gorm:"unique"`
	Password      string             `json:"-" gorm:"not null"` // JSONから除外、DBに保存
	DefaultVolume int                `json:"default_volume" gorm:"default:50"`
	LayoutSetting string             `json:"layout_setting" gorm:"default:'grid'"`
	Favorites     []Talent           `gorm:"many2many:user_favorites;" json:"favorites"`
	VolumePresets []OshiVolumePreset `json:"volume_presets"`
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

// 視聴セッション
type ViewingSession struct {
	gorm.Model
	UserID      uint            `json:"user_id" gorm:"index"`
	SessionName string          `json:"session_name"`                  // セッション名（オプション）
	IsActive    bool            `json:"is_active" gorm:"default:true"` // アクティブなセッションか
	Streams     []SessionStream `json:"streams" gorm:"foreignKey:SessionID"`
}

// セッションストリーム
type SessionStream struct {
	gorm.Model
	SessionID uint   `json:"session_id" gorm:"index"`
	TalentID  uint   `json:"talent_id"`
	VideoID   string `json:"video_id"` // YouTube動画ID
	StreamURL string `json:"stream_url"`
	Title     string `json:"title"`    // 配信タイトル
	IsMain    bool   `json:"is_main"`  // メイン枠か
	Volume    int    `json:"volume"`   // 音量設定（0-100）
	Position  int    `json:"position"` // 表示順序
}

// 推し音量プリセット
type OshiVolumePreset struct {
	gorm.Model
	UserID   uint `json:"user_id" gorm:"index"`
	TalentID uint `json:"talent_id" gorm:"index"`
	Volume   int  `json:"volume" gorm:"default:50"` // 推しごとの音量設定
}

// --- グローバル変数 (メモリ保持用) ---
type CacheItem struct {
	Status    *StreamStatus
	ExpiresAt time.Time
}

type StreamEvent struct {
	TalentID    uint    `json:"talent_id"`
	VolumeLevel float64 `json:"volume_level"`
	ChatCount   int     `json:"chat_count"`
	SuperChat   float64 `json:"super_chat"`
	Timestamp   time.Time
}

// コメントスナップショット（時系列データ）
type CommentSnapshot struct {
	VideoID      string    `json:"video_id"`
	CommentCount int       `json:"comment_count"`
	ViewerCount  int       `json:"viewer_count"`
	Timestamp    time.Time `json:"timestamp"`
}

// コメント分析結果
type CommentAnalysis struct {
	TotalComments     int     `json:"total_comments"`
	SurgeKeywordCount int     `json:"surge_keyword_count"` // 盛り上がり単語含有数
	SurgeKeywordRate  float64 `json:"surge_keyword_rate"`  // 盛り上がり単語含有率
	SuperChatAmount   float64 `json:"super_chat_amount"`   // スーパーチャット総額
	SuperChatCount    int     `json:"super_chat_count"`     // スーパーチャット件数
	UniqueUsers       int     `json:"unique_users"`         // ユニークユーザー数
}

// 盛り上がりメトリクス
type SurgeMetrics struct {
	VideoID            string    `json:"video_id"`
	TalentID           uint      `json:"talent_id"`
	
	// 各指標のスコア（0.0-1.0）
	CommentGrowthScore float64   `json:"comment_growth_score"`  // コメント増加量スコア
	KeywordScore       float64   `json:"keyword_score"`         // 盛り上がり単語含有率スコア
	SuperChatScore     float64   `json:"super_chat_score"`     // スーパーチャットスコア
	
	// 総合スコア
	SurgeScore         float64   `json:"surge_score"`           // 総合盛り上がりスコア（0.0-1.0）
	
	// 詳細情報
	CommentRate        float64   `json:"comment_rate"`          // コメント/秒
	CommentGrowthRate  float64   `json:"comment_growth_rate"`  // 増加率
	LastUpdated        time.Time `json:"last_updated"`
}

// 盛り上がり判定の重み設定
type SurgeWeightSettings struct {
	gorm.Model
	UserID              uint    `json:"user_id" gorm:"index"`
	CommentGrowthWeight float64 `json:"comment_growth_weight" gorm:"default:0.5"` // デフォルト: 50%
	KeywordWeight       float64 `json:"keyword_weight" gorm:"default:0.3"`         // デフォルト: 30%
	SuperChatWeight     float64 `json:"super_chat_weight" gorm:"default:0.2"`       // デフォルト: 20%
}