package main

import (
	"database/sql"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

func main() {
	// 1. .env の読み込み
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found (using system env)")
	}
	// APIキーの検証
	if apiKey, err := getYouTubeAPIKey(); err != nil {
		log.Printf("警告: %v", err)
	} else {
		log.Printf("YouTube API Key loaded: %t", apiKey != "")
	}

	// 2. データベース接続
	dbPath := filepath.Join(".", "user.db")
	log.Printf("データベースパス: %s", dbPath)

	// modernc.org/sqliteを使用（CGO不要）
	// database/sqlを経由してmodernc.org/sqliteを明示的に使用
	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("データベースに接続できませんでした: %v", err)
	}

	// GORMに接続
	db, err := gorm.Open(sqlite.Dialector{Conn: sqlDB}, &gorm.Config{})
	if err != nil {
		log.Fatalf("GORMの初期化に失敗しました: %v", err)
	}
	log.Println("データベース接続成功")
	db.AutoMigrate(&User{}, &Talent{}, &Group{})

	r := gin.Default()

	// CORS設定
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

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

	// 配信者一覧取得
	r.GET("/talents", func(c *gin.Context) {
		var talents []Talent
		if err := db.Find(&talents).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "配信者の取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, talents)
	})

	// 配信者詳細取得
	r.GET("/talents/:id", func(c *gin.Context) {
		var talent Talent
		if err := db.Preload("Groups").First(&talent, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}
		c.JSON(http.StatusOK, talent)
	})

	// 配信者更新
	r.PUT("/talents/:id", func(c *gin.Context) {
		var talent Talent
		if err := db.First(&talent, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}

		var updateData Talent
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// 更新可能なフィールドのみ更新（ChannelIDは変更不可とする）
		talent.Name = updateData.Name
		if updateData.Platform != "" {
			talent.Platform = updateData.Platform
		}

		if err := db.Save(&talent).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "配信者の更新に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "配信者の更新が完了しました",
			"talent":  talent,
		})
	})

	// 配信者削除
	r.DELETE("/talents/:id", func(c *gin.Context) {
		var talent Talent
		if err := db.First(&talent, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}

		// グループとの関連を削除
		db.Model(&talent).Association("Groups").Clear()

		// ユーザーの推しリストからも削除
		var users []User
		db.Find(&users)
		for _, user := range users {
			db.Model(&user).Association("Favorites").Delete(&talent)
		}

		// 配信者を削除
		if err := db.Delete(&talent).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "配信者の削除に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "配信者の削除が完了しました"})
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

	// グループ一覧取得
	r.GET("/groups", func(c *gin.Context) {
		var groups []Group
		if err := db.Find(&groups).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "グループの取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, groups)
	})

	// グループにメンバーを追加（より具体的なルートを先に定義）
	r.POST("/groups/:id/add-talent/:talent_id", func(c *gin.Context) {
		var group Group
		var talent Talent
		if err := db.First(&group, c.Param("id")).Error; err != nil {
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

	// グループからメンバーを削除（より具体的なルートを先に定義）
	r.DELETE("/groups/:id/remove-talent/:talent_id", func(c *gin.Context) {
		var group Group
		var talent Talent
		if err := db.First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}
		if err := db.First(&talent, c.Param("talent_id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}
		if err := db.Model(&group).Association("Talents").Delete(&talent); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "メンバーの削除に失敗しました: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "メンバーの削除が完了しました"})
	})

	// 箱推し一括展開：グループ内の配信者一覧取得（より具体的なルートを先に定義）
	r.GET("/groups/:id/talents", func(c *gin.Context) {
		var group Group
		if err := db.Preload("Talents").First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"group_id":   group.ID,
			"group_name": group.Name,
			"talents":    group.Talents,
		})
	})

	// 箱推し一括展開API（LIVE状態フィルタリング付き）（より具体的なルートを先に定義）
	r.GET("/groups/:id/live-streams", func(c *gin.Context) {
		var group Group
		if err := db.Preload("Talents").First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}

		// 並列で配信状態を取得
		var wg sync.WaitGroup
		var mu sync.Mutex
		var liveStreams []StreamStatus

		for _, talent := range group.Talents {
			wg.Add(1)
			go func(t Talent) {
				defer wg.Done()
				status, err := getStreamStatus(t)
				if err != nil {
					log.Printf("配信状態取得エラー (TalentID: %d): %v", t.ID, err)
					return
				}
				// LIVE中の配信のみを追加
				if status.IsLive {
					mu.Lock()
					liveStreams = append(liveStreams, *status)
					mu.Unlock()
				}
			}(talent)
		}

		wg.Wait()

		c.JSON(http.StatusOK, gin.H{
			"group_id":     group.ID,
			"group_name":   group.Name,
			"live_streams": liveStreams,
			"count":        len(liveStreams),
		})
	})

	// グループ詳細取得（メンバー含む）
	r.GET("/groups/:id", func(c *gin.Context) {
		var group Group
		if err := db.Preload("Talents").First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, group)
	})

	// グループ更新
	r.PUT("/groups/:id", func(c *gin.Context) {
		var group Group
		if err := db.First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}

		var updateData Group
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// グループ名を更新
		group.Name = updateData.Name

		if err := db.Save(&group).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				c.JSON(http.StatusConflict, gin.H{"error": "既に存在するグループ名です"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "グループの更新に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "グループの更新が完了しました",
			"group":   group,
		})
	})

	// グループ削除
	r.DELETE("/groups/:id", func(c *gin.Context) {
		var group Group
		if err := db.First(&group, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
			return
		}

		// 配信者との関連を削除
		db.Model(&group).Association("Talents").Clear()

		// グループを削除
		if err := db.Delete(&group).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "グループの削除に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "グループの削除が完了しました"})
	})

	// 個別配信状態取得API
	r.GET("/talents/:id/stream-status", func(c *gin.Context) {
		var talent Talent
		if err := db.First(&talent, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}

		status, err := getStreamStatus(talent)
		if err != nil {
			log.Printf("配信状態取得エラー: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "配信状態の取得に失敗しました: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, status)
	})

	// ユーザーが推しを登録
	r.POST("/users/:id/favorite/:talent_id", func(c *gin.Context) {
		var user User
		var talent Talent
		if err := db.First(&user, c.Param("id")).Error; err != nil {
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
	r.GET("/users/:id/favorites", func(c *gin.Context) {
		var user User
		if err := db.Preload("Favorites").First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, user.Favorites)
	})

	// ユーザー設定取得
	r.GET("/users/:id/settings", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"default_volume": user.DefaultVolume,
			"layout_setting": user.LayoutSetting,
		})
	})

	// ユーザー設定更新
	r.PUT("/users/:id/settings", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var updateData struct {
			DefaultVolume *int    `json:"default_volume"`
			LayoutSetting *string `json:"layout_setting"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// 更新可能なフィールドのみ更新
		if updateData.DefaultVolume != nil {
			if *updateData.DefaultVolume < 0 || *updateData.DefaultVolume > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "音量は0-100の範囲で指定してください"})
				return
			}
			user.DefaultVolume = *updateData.DefaultVolume
		}

		if updateData.LayoutSetting != nil {
			// レイアウト設定のバリデーション
			validLayouts := []string{"grid", "main-sub"}
			isValid := false
			for _, layout := range validLayouts {
				if *updateData.LayoutSetting == layout {
					isValid = true
					break
				}
			}
			if !isValid {
				c.JSON(http.StatusBadRequest, gin.H{"error": "レイアウト設定は 'grid' または 'main-sub' を指定してください"})
				return
			}
			user.LayoutSetting = *updateData.LayoutSetting
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "設定の更新に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":        "設定の更新が完了しました",
			"default_volume": user.DefaultVolume,
			"layout_setting": user.LayoutSetting,
		})
	})

	r.Run()
}
