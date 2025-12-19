package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// --- モデル定義 ---

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

func main() {
	// 1. .env の読み込み
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found (using system env)")
	}
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	log.Printf("YouTube API Key loaded: %t", apiKey != "")

	// 2. データベース接続
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		panic("データベースに接続できませんでした")
	}
	db.AutoMigrate(&User{}, &Talent{}, &Group{})

	r := gin.Default()

	// --- エンドポイント実装 ---

	// ユーザー登録
	r.POST("/register", func(c *gin.Context) {
		var newUser User
		if err := c.ShouldBindJSON(&newUser); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := db.Create(&newUser).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				c.JSON(http.StatusConflict, gin.H{"error": "すでにこのメールアドレスは登録されています"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーエラー"})
			return
		}
		c.JSON(http.StatusOK, newUser)
	})

	// 配信者登録
	r.POST("/talents", func(c *gin.Context) {
		var newTalent Talent
		if err := c.ShouldBindJSON(&newTalent); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := db.Create(&newTalent).Error; err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "既に登録されています"})
			return
		}
		c.JSON(http.StatusOK, newTalent)
	})

	// グループ登録
	r.POST("/groups", func(c *gin.Context) {
		var newGroup Group
		if err := c.ShouldBindJSON(&newGroup); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := db.Create(&newGroup).Error; err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "既に存在するグループ名です"})
			return
		}
		c.JSON(http.StatusOK, newGroup)
	})

	// グループにメンバーを追加
	r.POST("/groups/:group_id/add-talent/:talent_id", func(c *gin.Context) {
		var group Group
		var talent Talent
		if err := db.First(&group, c.Param("group_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}
		if err := db.First(&talent, c.Param("talent_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}
		db.Model(&group).Association("Talents").Append(&talent)
		c.JSON(http.StatusOK, gin.H{"message": "追加完了"})
	})

	// ユーザーが推しを登録
	r.POST("/users/:user_id/favorite/:talent_id", func(c *gin.Context) {
		var user User
		var talent Talent
		if err := db.First(&user, c.Param("user_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		if err := db.First(&talent, c.Param("talent_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}
		db.Model(&user).Association("Favorites").Append(&talent)
		c.JSON(http.StatusOK, gin.H{"message": "推し登録完了"})
	})

	// 推し一覧取得
	r.GET("/users/:user_id/favorites", func(c *gin.Context) {
		var user User
		if err := db.Preload("Favorites").First(&user, c.Param("user_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, user.Favorites)
	})

	r.Run()
}
