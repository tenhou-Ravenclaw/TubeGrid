package main

import (
	"net/http"
	"strings"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name        string         `json:"name" binding:"required"`
	Email       string         `json:"email" binding:"required,email" gorm:"unique"`
	Oshis       []Oshi         `gorm:"foreignKey:UserID"`
	Groups      []Group        `gorm:"foreignKey:UserID"`
	Settings    UserSettings   `gorm:"foreignKey:UserID"`
}

// 推し情報
type Oshi struct {
	gorm.Model
	UserID    uint   `json:"user_id"`
	Name      string `json:"name" binding:"required"`
	ChannelID string `json:"channel_id" binding:"required"`
	Platform  string `json:"platform" binding:"required"` // "youtube", "twitch"
	User      User   `gorm:"foreignKey:UserID"`
}

// グループ（箱）
type Group struct {
	gorm.Model
	UserID uint   `json:"user_id"`
	Name   string `json:"name" binding:"required"`
	User   User   `gorm:"foreignKey:UserID"`
}

// グループ × メンバーの紐付け（多対多）
type GroupMember struct {
	gorm.Model
	GroupID uint  `json:"group_id"`
	OshiID  uint  `json:"oshi_id"`
	Group   Group `gorm:"foreignKey:GroupID"`
	Oshi    Oshi  `gorm:"foreignKey:OshiID"`
}

// ユーザー設定
type UserSettings struct {
	gorm.Model
	UserID       uint   `json:"user_id" gorm:"unique"`
	VolumePreset string `json:"volume_preset" gorm:"type:text"` // JSON文字列
	LayoutPreset string `json:"layout_preset" gorm:"type:text"` // JSON文字列
	OshiPriority string `json:"oshi_priority" gorm:"type:text"` // JSON文字列（推しIDの配列）
	User         User   `gorm:"foreignKey:UserID"`
}

func main() {
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		panic("データベースに接続できませんでした")
	}

	db.AutoMigrate(&User{}, &Oshi{}, &Group{}, &GroupMember{}, &UserSettings{})

	r := gin.Default()

	r.POST("/register", func(c *gin.Context) {
		var newUser User
		if err := c.ShouldBindJSON(&newUser) ; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error" :"入力データが正しくありません:" + err.Error(),
			})
			return
		}

		if err := db.Create(&newUser).Error; err != nil {
			// 重複エラー（UNIQUE制約違反）の判定
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				c.JSON(http.StatusConflict, gin.H{
					"error": "すでにこのメールアドレスは既に登録されています",
				})
				return
			}
				c.JSON(http.StatusInternalServerError, gin.H{"error" :"サーバーエラーが発生しました"})
		}

		c.JSON(http.StatusOK, gin.H{
			"message" : "ユーザー登録が完了しました",
			"user" : newUser,
		})
	})
	r.Run()
}