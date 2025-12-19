package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// --- モデル定義 ---

type User struct {
	gorm.Model
	Name          string `json:"name" binding:"required"`
	Email         string `json:"email" binding:"required,email" gorm:"unique"`
	DefaultVolume int    `json:"default_volume" gorm:"default:50"`
	LayoutSetting string `json:"layout_setting" gorm:"default:'grid'"`

	// 追加：ユーザーが「お気に入り」登録した配信者たち（多対多）
	Favorites []Talent `gorm:"many2many:user_favorites;" json:"favorites"`
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

// --- メイン処理 ---

func main() {
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		panic("データベースに接続できませんでした")
	}

	// 構造体の変更を反映
	db.AutoMigrate(&User{}, &Talent{}, &Group{})

	r := gin.Default()

	// 1~4. 登録系エンドポイント（これまでの実装分）
	r.POST("/register", func(c *gin.Context) { /* ... */ })
	r.POST("/talents", func(c *gin.Context) { /* ... */ })
	r.POST("/groups", func(c *gin.Context) { /* ... */ })
	r.POST("/groups/:group_id/add-talent/:talent_id", func(c *gin.Context) { /* ... */ })

	// 5. 追加：ユーザーが推し（配信者）をお気に入り登録する
	// POST /users/1/favorite/5 (ユーザーID 1が配信者ID 5を推し登録)
	r.POST("/users/:user_id/favorite/:talent_id", func(c *gin.Context) {
		userID := c.Param("user_id")
		talentID := c.Param("talent_id")

		var user User
		var talent Talent

		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		if err := db.First(&talent, talentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}

		// 紐付け（お気に入り登録）
		db.Model(&user).Association("Favorites").Append(&talent)

		c.JSON(http.StatusOK, gin.H{"message": "推しを登録しました"})
	})

	// 6. 追加：ユーザーの推し一覧を取得する（確認用）
	r.GET("/users/:user_id/favorites", func(c *gin.Context) {
		userID := c.Param("user_id")
		var user User

		// Preloadを使うことで、Favorites情報（Talent一覧）も一緒に読み込む
		if err := db.Preload("Favorites").First(&user, userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		c.JSON(http.StatusOK, user.Favorites)
	})

	r.Run()
}
