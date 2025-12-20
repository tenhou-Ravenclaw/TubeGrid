package main

import (
	"database/sql"
	"fmt"
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
	db.AutoMigrate(&User{}, &Talent{}, &Group{}, &RoomLayout{}, &ViewingSession{}, &SessionStream{}, &OshiVolumePreset{})

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

	// ユーザー一覧取得
	r.GET("/users", func(c *gin.Context) {
		var users []User
		if err := db.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーの取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, users)
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

	// ルームレイアウト取得
	r.GET("/users/:id/room-layout", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var layouts []RoomLayout
		if err := db.Where("user_id = ?", c.Param("id")).Find(&layouts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "レイアウトの取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, layouts)
	})

	// ルームレイアウト保存（既存を削除して新規保存）
	r.POST("/users/:id/room-layout", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var layouts []RoomLayout
		if err := c.ShouldBindJSON(&layouts); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := c.Param("id")
		// 既存のレイアウトを削除
		if err := db.Where("user_id = ?", userID).Delete(&RoomLayout{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "既存レイアウトの削除に失敗しました"})
			return
		}

		// 新しいレイアウトを保存
		for i := range layouts {
			var userIDUint uint
			fmt.Sscanf(userID, "%d", &userIDUint)
			layouts[i].UserID = userIDUint
		}
		if err := db.Create(&layouts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "レイアウトの保存に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "レイアウトを保存しました", "layouts": layouts})
	})

	// 特定モニターのレイアウト更新
	r.PUT("/users/:id/room-layout/:monitor_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var layout RoomLayout
		if err := db.Where("user_id = ? AND monitor_id = ?", c.Param("id"), c.Param("monitor_id")).First(&layout).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "レイアウトが見つかりません"})
			return
		}

		var updateData RoomLayout
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// 更新可能なフィールドを更新（UserIDとMonitorIDは変更不可）
		layout.VideoID = updateData.VideoID
		layout.X = updateData.X
		layout.Y = updateData.Y
		layout.Rotate = updateData.Rotate
		layout.Width = updateData.Width
		layout.Height = updateData.Height
		layout.ZIndex = updateData.ZIndex
		layout.IsMain = updateData.IsMain
		layout.IsOshi = updateData.IsOshi
		layout.Label = updateData.Label
		layout.MonitorType = updateData.MonitorType

		if err := db.Save(&layout).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "レイアウトの更新に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "レイアウトの更新が完了しました",
			"layout":  layout,
		})
	})

	// 特定モニターのレイアウト削除
	r.DELETE("/users/:id/room-layout/:monitor_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var layout RoomLayout
		if err := db.Where("user_id = ? AND monitor_id = ?", c.Param("id"), c.Param("monitor_id")).First(&layout).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "レイアウトが見つかりません"})
			return
		}

		if err := db.Delete(&layout).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "レイアウトの削除に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "レイアウトの削除が完了しました"})
	})

	// 動画情報取得
	r.GET("/videos/:video_id/info", func(c *gin.Context) {
		videoID := c.Param("video_id")
		info, err := getVideoInfo(videoID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "動画情報の取得に失敗しました: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, info)
	})

	// チャンネル情報取得
	r.GET("/channels/:channel_id/info", func(c *gin.Context) {
		channelID := c.Param("channel_id")
		info, err := getChannelInfo(channelID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネル情報の取得に失敗しました: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, info)
	})

	// --- 音量プリセット管理API ---

	// 推し音量プリセット一覧取得
	r.GET("/users/:id/volume-presets", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var presets []OshiVolumePreset
		if err := db.Where("user_id = ?", c.Param("id")).Find(&presets).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "プリセットの取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, presets)
	})

	// 推し音量プリセット保存
	r.POST("/users/:id/volume-presets", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var presetData struct {
			TalentID uint `json:"talent_id" binding:"required"`
			Volume   int  `json:"volume" binding:"required"`
		}

		if err := c.ShouldBindJSON(&presetData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// 音量のバリデーション
		if presetData.Volume < 0 || presetData.Volume > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "音量は0-100の範囲で指定してください"})
			return
		}

		// 配信者の存在確認
		var talent Talent
		if err := db.First(&talent, presetData.TalentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "配信者が見つかりません"})
			return
		}

		// 既存のプリセットを確認
		var existingPreset OshiVolumePreset
		if err := db.Where("user_id = ? AND talent_id = ?", c.Param("id"), presetData.TalentID).First(&existingPreset).Error; err == nil {
			// 既に存在する場合は更新
			existingPreset.Volume = presetData.Volume
			if err := db.Save(&existingPreset).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "プリセットの更新に失敗しました"})
				return
			}
			c.JSON(http.StatusOK, existingPreset)
			return
		}

		// 新規作成
		var userIDUint uint
		fmt.Sscanf(c.Param("id"), "%d", &userIDUint)
		newPreset := OshiVolumePreset{
			UserID:   userIDUint,
			TalentID: presetData.TalentID,
			Volume:   presetData.Volume,
		}

		if err := db.Create(&newPreset).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "プリセットの保存に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, newPreset)
	})

	// 推し音量プリセット更新
	r.PUT("/users/:id/volume-presets/:talent_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var preset OshiVolumePreset
		if err := db.Where("user_id = ? AND talent_id = ?", c.Param("id"), c.Param("talent_id")).First(&preset).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "プリセットが見つかりません"})
			return
		}

		var updateData struct {
			Volume int `json:"volume" binding:"required"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		if updateData.Volume < 0 || updateData.Volume > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "音量は0-100の範囲で指定してください"})
			return
		}

		preset.Volume = updateData.Volume
		if err := db.Save(&preset).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "プリセットの更新に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, preset)
	})

	// 推し音量プリセット削除
	r.DELETE("/users/:id/volume-presets/:talent_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var preset OshiVolumePreset
		if err := db.Where("user_id = ? AND talent_id = ?", c.Param("id"), c.Param("talent_id")).First(&preset).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "プリセットが見つかりません"})
			return
		}

		if err := db.Delete(&preset).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "プリセットの削除に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "プリセットの削除が完了しました"})
	})

	// --- 視聴セッション管理API ---

	// セッション作成
	r.POST("/users/:id/sessions", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var requestData struct {
			SessionName string `json:"session_name"`
			GroupID     *uint  `json:"group_id"`
			Streams     []struct {
				TalentID  uint   `json:"talent_id"`
				VideoID   string `json:"video_id"`
				StreamURL string `json:"stream_url"`
				Title     string `json:"title"`
			} `json:"streams"`
		}

		if err := c.ShouldBindJSON(&requestData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		var liveStreams []StreamStatus

		// グループIDが指定されている場合、LIVE配信を自動取得
		if requestData.GroupID != nil {
			var group Group
			if err := db.Preload("Talents").First(&group, *requestData.GroupID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "グループが見つかりません"})
				return
			}

			// 並列で配信状態を取得
			var wg sync.WaitGroup
			var mu sync.Mutex

			for _, talent := range group.Talents {
				wg.Add(1)
				go func(t Talent) {
					defer wg.Done()
					status, err := getStreamStatus(t)
					if err != nil {
						log.Printf("配信状態取得エラー (TalentID: %d): %v", t.ID, err)
						return
					}
					if status.IsLive {
						mu.Lock()
						liveStreams = append(liveStreams, *status)
						mu.Unlock()
					}
				}(talent)
			}
			wg.Wait()
		} else if len(requestData.Streams) > 0 {
			// 手動で配信を指定した場合
			for _, stream := range requestData.Streams {
				var talent Talent
				if err := db.First(&talent, stream.TalentID).Error; err != nil {
					continue
				}
				liveStreams = append(liveStreams, StreamStatus{
					TalentID:   stream.TalentID,
					TalentName: talent.Name,
					StreamURL:  stream.StreamURL,
					Title:      stream.Title,
					IsLive:     true,
				})
			}
		}

		// 推し優先ルール適用
		var userIDUint uint
		fmt.Sscanf(c.Param("id"), "%d", &userIDUint)
		sessionStreams, err := applyOshiPriorityRule(db, userIDUint, liveStreams, user.DefaultVolume)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "推し優先ルールの適用に失敗しました: " + err.Error()})
			return
		}

		// セッション作成
		newSession := ViewingSession{
			UserID:      userIDUint,
			SessionName: requestData.SessionName,
			IsActive:    true,
		}

		if err := db.Create(&newSession).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの作成に失敗しました"})
			return
		}

		// ストリームを保存
		for i := range sessionStreams {
			sessionStreams[i].SessionID = newSession.ID
		}
		if len(sessionStreams) > 0 {
			if err := db.Create(&sessionStreams).Error; err != nil {
				// セッションを削除
				db.Delete(&newSession)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ストリームの保存に失敗しました"})
				return
			}
		}

		// セッションとストリームを再取得
		db.Preload("Streams").First(&newSession, newSession.ID)

		c.JSON(http.StatusOK, newSession)
	})

	// セッション一覧取得
	r.GET("/users/:id/sessions", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var sessions []ViewingSession
		if err := db.Preload("Streams").Where("user_id = ?", c.Param("id")).Find(&sessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの取得に失敗しました"})
			return
		}
		c.JSON(http.StatusOK, sessions)
	})

	// セッション詳細取得
	r.GET("/users/:id/sessions/:session_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var session ViewingSession
		if err := db.Preload("Streams").Where("id = ? AND user_id = ?", c.Param("session_id"), c.Param("id")).First(&session).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "セッションが見つかりません"})
			return
		}
		c.JSON(http.StatusOK, session)
	})

	// セッション更新
	r.PUT("/users/:id/sessions/:session_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var session ViewingSession
		if err := db.Preload("Streams").Where("id = ? AND user_id = ?", c.Param("session_id"), c.Param("id")).First(&session).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "セッションが見つかりません"})
			return
		}

		var updateData struct {
			SessionName  *string `json:"session_name"`
			MainStreamID *uint   `json:"main_stream_id"`
			AddStreams   []struct {
				TalentID  uint   `json:"talent_id"`
				VideoID   string `json:"video_id"`
				StreamURL string `json:"stream_url"`
				Title     string `json:"title"`
			} `json:"add_streams"`
			RemoveStreamIDs []uint `json:"remove_stream_ids"`
			UpdateVolumes   []struct {
				StreamID uint `json:"stream_id"`
				Volume   int  `json:"volume"`
			} `json:"update_volumes"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// セッション名の更新
		if updateData.SessionName != nil {
			session.SessionName = *updateData.SessionName
		}

		// メイン入れ替え
		if updateData.MainStreamID != nil {
			// 既存のメインを解除
			for i := range session.Streams {
				session.Streams[i].IsMain = false
			}
			// 新しいメインを設定
			for i := range session.Streams {
				if session.Streams[i].ID == *updateData.MainStreamID {
					session.Streams[i].IsMain = true
					break
				}
			}
		}

		// 配信の削除
		if len(updateData.RemoveStreamIDs) > 0 {
			if err := db.Where("session_id = ? AND id IN ?", session.ID, updateData.RemoveStreamIDs).Delete(&SessionStream{}).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ストリームの削除に失敗しました"})
				return
			}
		}

		// 配信の追加
		if len(updateData.AddStreams) > 0 {
			var newStreams []SessionStream
			maxPosition := 0
			for _, stream := range session.Streams {
				if stream.Position > maxPosition {
					maxPosition = stream.Position
				}
			}
			for i, stream := range updateData.AddStreams {
				newStreams = append(newStreams, SessionStream{
					SessionID: session.ID,
					TalentID:  stream.TalentID,
					VideoID:   stream.VideoID,
					StreamURL: stream.StreamURL,
					Title:     stream.Title,
					IsMain:    false,
					Volume:    user.DefaultVolume,
					Position:  maxPosition + i + 1,
				})
			}
			if err := db.Create(&newStreams).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ストリームの追加に失敗しました"})
				return
			}
		}

		// 音量更新
		if len(updateData.UpdateVolumes) > 0 {
			for _, volUpdate := range updateData.UpdateVolumes {
				if volUpdate.Volume < 0 || volUpdate.Volume > 100 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "音量は0-100の範囲で指定してください"})
					return
				}
				if err := db.Model(&SessionStream{}).Where("id = ? AND session_id = ?", volUpdate.StreamID, session.ID).Update("volume", volUpdate.Volume).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "音量の更新に失敗しました"})
					return
				}
			}
		}

		// ストリームの更新を保存
		if err := db.Save(&session.Streams).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの更新に失敗しました"})
			return
		}

		// セッションを保存
		if err := db.Save(&session).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの更新に失敗しました"})
			return
		}

		// 更新後のセッションを取得
		db.Preload("Streams").First(&session, session.ID)

		c.JSON(http.StatusOK, session)
	})

	// セッション削除
	r.DELETE("/users/:id/sessions/:session_id", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var session ViewingSession
		if err := db.Where("id = ? AND user_id = ?", c.Param("session_id"), c.Param("id")).First(&session).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "セッションが見つかりません"})
			return
		}

		// 関連するストリームを削除
		if err := db.Where("session_id = ?", session.ID).Delete(&SessionStream{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ストリームの削除に失敗しました"})
			return
		}

		// セッションを削除
		if err := db.Delete(&session).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの削除に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "セッションの削除が完了しました"})
	})

	r.Run()
}
