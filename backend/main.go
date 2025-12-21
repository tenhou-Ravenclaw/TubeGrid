package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

// --- グローバル変数 ---
var (
	eventHistory        = make(map[uint][]StreamEvent)
	eventMutex          sync.Mutex
	streamCache         = make(map[uint]CacheItem)
	cacheMutex          sync.RWMutex
	cacheDuration       = 1 * time.Minute
	commentHistory      = make(map[string][]CommentSnapshot)
	commentHistoryMutex sync.RWMutex
	surgeMetricsCache   = make(map[string]SurgeMetrics)
	surgeMetricsMutex   sync.RWMutex
)

// --- ロジック関数 ---
func detectSurge(talentID uint, current StreamEvent) bool {
	eventMutex.Lock()
	defer eventMutex.Unlock()

	history := eventHistory[talentID]
	if len(history) < 5 {
		eventHistory[talentID] = append(history, current)
		return false
	}

	var totalChat int
	for _, h := range history {
		totalChat += h.ChatCount
	}
	avgChat := float64(totalChat) / float64(len(history))

	if len(history) > 10 {
		history = history[1:]
	}
	eventHistory[talentID] = append(history, current)

	return float64(current.ChatCount) > avgChat*2.0 || current.SuperChat > 0
}

func getStreamStatusWithCache(t Talent) (*StreamStatus, error) {
	cacheMutex.RLock()
	item, found := streamCache[t.ID]
	cacheMutex.RUnlock()

	if found && time.Now().Before(item.ExpiresAt) {
		return item.Status, nil
	}

	// stream_service.go の関数を呼び出す
	status, err := getStreamStatus(t)
	if err != nil {
		return nil, err
	}

	cacheMutex.Lock()
	streamCache[t.ID] = CacheItem{
		Status:    status,
		ExpiresAt: time.Now().Add(cacheDuration),
	}
	cacheMutex.Unlock()

	return status, nil
}

func main() {
	// #region agent log
	// .env の探索パスを増やして、ルート起動と backend 起動の両方に対応
	// 優先順: backend/.env -> ルート/.env
	envPaths := []string{".env", "../.env"}
	if err := godotenv.Load(envPaths...); err != nil {
		log.Printf("[DEBUG] godotenv.Load() エラー (paths=%v): %v", envPaths, err)
	} else {
		log.Printf("[DEBUG] godotenv.Load() 成功 (paths=%v)", envPaths)
	}
	// .envファイルの内容を確認（APIキーの存在のみ）
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey != "" {
		log.Printf("[DEBUG] YOUTUBE_API_KEY が読み込まれました (長さ: %d)", len(apiKey))
	} else {
		log.Printf("[DEBUG] YOUTUBE_API_KEY が設定されていません")
	}
	// #endregion

	dbPath := filepath.Join(".", "user.db")
	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	db, err := gorm.Open(sqlite.Dialector{Conn: sqlDB}, &gorm.Config{})
	if err != nil {
		log.Fatalf("GORM初期化失敗: %v", err)
	}
	log.Println("データベース接続成功")
	db.AutoMigrate(&User{}, &Talent{}, &Group{}, &RoomLayout{}, &ViewingSession{}, &SessionStream{}, &OshiVolumePreset{}, &SurgeWeightSettings{})

	r := gin.Default()

	// CORS設定
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 各種エンドポイント
	r.POST("/register", func(c *gin.Context) {
		var req struct {
			Name     string `json:"name" binding:"required"`
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required,min=8"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// メール重複チェック
		var existingUser User
		if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "このメールアドレスは既に登録されています"})
			return
		}

		// パスワードハッシュ化
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "パスワードのハッシュ化に失敗しました"})
			return
		}

		// ユーザー作成
		user := User{
			Name:     req.Name,
			Email:    req.Email,
			Password: string(hashedPassword),
		}
		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーの登録に失敗しました: " + err.Error()})
			return
		}

		// パスワードを除外してレスポンス
		user.Password = ""
		c.JSON(http.StatusOK, user)
	})

	// ログインAPI
	r.POST("/login", func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// ユーザー検索
		var user User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "メールアドレスまたはパスワードが正しくありません"})
			return
		}

		// パスワード検証
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "メールアドレスまたはパスワードが正しくありません"})
			return
		}

		// ログイン成功 - シンプルなトークン（後でJWTに置き換え可能）
		// ここではユーザーIDをトークンとして使用（本番環境ではJWT推奨）
		token := fmt.Sprintf("user_%d_%d", user.ID, time.Now().Unix())

		// パスワードを除外してレスポンス
		user.Password = ""
		c.JSON(http.StatusOK, gin.H{
			"token":   token,
			"user":    user,
			"message": "ログイン成功",
		})
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
		var talent Talent
		if err := c.ShouldBindJSON(&talent); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		db.Create(&talent)
		c.JSON(200, talent)
	})

	r.POST("/groups", func(c *gin.Context) {
		var group Group
		if err := c.ShouldBindJSON(&group); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		db.Create(&group)
		c.JSON(200, group)
	})

	r.POST("/groups/:id/add-talent/:talent_id", func(c *gin.Context) {
		var group Group
		var talent Talent
		db.First(&group, c.Param("id"))
		db.First(&talent, c.Param("talent_id"))
		db.Model(&group).Association("Talents").Append(&talent)
		c.JSON(200, gin.H{"message": "Success"})
	})

	r.GET("/groups/:id/live-streams", func(c *gin.Context) {
		var group Group
		if err := db.Preload("Talents").First(&group, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "Group not found"})
			return
		}

		var wg sync.WaitGroup
		var mu sync.Mutex
		var liveStreams []StreamStatus

		for _, talent := range group.Talents {
			wg.Add(1)
			go func(t Talent) {
				defer wg.Done()
				status, err := getStreamStatusWithCache(t)
				if err == nil && status.IsLive {
					mu.Lock()
					liveStreams = append(liveStreams, *status)
					mu.Unlock()
				}
			}(talent)
		}
		wg.Wait()
		c.JSON(200, gin.H{"group": group.Name, "lives": liveStreams})
	})

	r.POST("/streams/:talent_id/metrics", func(c *gin.Context) {
		var event StreamEvent
		if err := c.ShouldBindJSON(&event); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var tid uint
		fmt.Sscanf(c.Param("talent_id"), "%d", &tid)
		event.TalentID = tid
		event.Timestamp = time.Now()

		isSurge := detectSurge(tid, event)
		c.JSON(200, gin.H{"is_surge": isSurge})
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
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "レイアウトの保存に失敗しました",
				"details": err.Error(),
			})
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

	// YouTube動画検索
	r.GET("/youtube/search", func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "検索クエリ（q）が指定されていません"})
			return
		}

		maxResultsStr := c.DefaultQuery("max_results", "10")
		maxResults := 10
		if parsed, err := fmt.Sscanf(maxResultsStr, "%d", &maxResults); err != nil || parsed != 1 {
			maxResults = 10
		}
		if maxResults < 1 {
			maxResults = 1
		}
		if maxResults > 50 {
			maxResults = 50
		}

		results, err := searchYouTubeVideos(query, maxResults)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "動画検索に失敗しました: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"query":   query,
			"results": results,
			"count":   len(results),
		})
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

		// 配信の削除
		if len(updateData.RemoveStreamIDs) > 0 {
			if err := db.Where("session_id = ? AND id IN ?", session.ID, updateData.RemoveStreamIDs).Delete(&SessionStream{}).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ストリームの削除に失敗しました"})
				return
			}
			// 削除後にストリームリストを再読み込み
			db.Preload("Streams").First(&session, session.ID)
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
			// 追加後にストリームリストを再読み込み
			db.Preload("Streams").First(&session, session.ID)
		}

		// メイン入れ替え（削除・追加後に処理）
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
			// メインストリームの変更を保存
			if err := db.Save(&session.Streams).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの更新に失敗しました"})
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

	// 盛り上がり配信取得API
	r.GET("/users/:id/sessions/:session_id/surge-streams", func(c *gin.Context) {
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

		// ユーザーの重み設定を取得（デフォルト値を使用）
		var weightSettings SurgeWeightSettings
		if err := db.Where("user_id = ?", user.ID).First(&weightSettings).Error; err != nil {
			// デフォルト値を使用
			weightSettings = SurgeWeightSettings{
				CommentGrowthWeight: 0.5,
				KeywordWeight:       0.3,
				SuperChatWeight:     0.2,
			}
		}

		var surgeStreams []SurgeMetrics

		// 並列処理で各ストリームのコメント・スーパーチャットを取得
		var wg sync.WaitGroup
		var mu sync.Mutex

		for _, stream := range session.Streams {
			videoID := stream.VideoID
			if videoID == "" {
				continue
			}

			wg.Add(1)
			go func(s SessionStream, vID string) {
				defer wg.Done()

				// Step 1: ライブ配信情報を取得（liveChatIdを確認）
				broadcastInfo, err := getYouTubeBroadcastInfo(vID)
				if err != nil {
					log.Printf("⚠️ 配信情報取得失敗 (VideoID: %s): %v", vID, err)
				}

				var commentAnalysis *CommentAnalysis

				// Step 2: ライブ配信ならライブチャットAPI、アーカイブなら従来のコメントAPIを使用
				if broadcastInfo != nil && broadcastInfo.LiveStreamingDetails.ActiveLiveChatID != "" {
					log.Printf("📡 ライブ配信検出 (VideoID: %s, LiveChatID: %s)", vID, broadcastInfo.LiveStreamingDetails.ActiveLiveChatID)

					// ライブチャットメッセージを取得
					analysis, _, _, err := getYouTubeLiveChatMessages(
						broadcastInfo.LiveStreamingDetails.ActiveLiveChatID,
						"",  // pageToken（初回は空）
						500, // maxResults
					)
					if err != nil {
						log.Printf("❌ ライブチャット取得失敗 (VideoID: %s): %v", vID, err)
						commentAnalysis = &CommentAnalysis{
							TotalComments:     0,
							SurgeKeywordCount: 0,
							SurgeKeywordRate:  0.0,
							UniqueUsers:       0,
						}
					} else {
						commentAnalysis = analysis
					}
				} else {
					// アーカイブなら従来のコメントAPIを使用
					log.Printf("📹 アーカイブ/通常動画 (VideoID: %s)", vID)

					analysis, err := getYouTubeComments(vID, 100) // 最新100件
					if err != nil {
						log.Printf("❌ コメント取得失敗 (VideoID: %s): %v", vID, err)
						analysis = &CommentAnalysis{
							TotalComments:     0,
							SurgeKeywordCount: 0,
							SurgeKeywordRate:  0.0,
							UniqueUsers:       0,
						}
					}
					commentAnalysis = analysis
				}

				// スーパーチャット取得
				superChatAmount, superChatCount, err := getYouTubeSuperChats(vID, 50)
				if err != nil {
					log.Printf("スーパーチャット取得エラー (VideoID: %s): %v", vID, err)
					// エラーでも続行（スーパーチャットは0として扱う）
				}

				// 現在のスナップショット
				currentSnapshot := CommentSnapshot{
					VideoID:      vID,
					CommentCount: commentAnalysis.TotalComments,
					ViewerCount:  0, // 必要に応じて取得
					Timestamp:    time.Now(),
				}

				// 履歴を取得
				commentHistoryMutex.RLock()
				history := commentHistory[vID]
				commentHistoryMutex.RUnlock()

				// デバッグ: 計算前の情報をログ
				log.Printf("🔍 [VideoID: %s] 盛り上がり計算開始", vID)
				log.Printf("  - 現在のコメント数: %d", commentAnalysis.TotalComments)
				log.Printf("  - キーワード含有数: %d", commentAnalysis.SurgeKeywordCount)
				log.Printf("  - キーワード率: %.2f%%", commentAnalysis.SurgeKeywordRate*100)
				log.Printf("  - ユニークユーザー: %d", commentAnalysis.UniqueUsers)
				log.Printf("  - スーパーチャット: %.2f円 (%d件)", superChatAmount, superChatCount)
				log.Printf("  - 履歴データ数: %d", len(history))
				log.Printf("  - 重み設定: コメント増加=%.2f, キーワード=%.2f, スパチャ=%.2f",
					weightSettings.CommentGrowthWeight, weightSettings.KeywordWeight, weightSettings.SuperChatWeight)

				// スコア計算
				metrics := calculateSurgeScore(
					vID,
					s.TalentID,
					currentSnapshot,
					*commentAnalysis,
					superChatAmount,
					superChatCount,
					history,
					weightSettings,
				)

				// デバッグ: 計算結果をログ
				log.Printf("📊 [VideoID: %s] 盛り上がり計算結果", vID)
				log.Printf("  - コメント増加スコア: %.2f", metrics.CommentGrowthScore)
				log.Printf("  - キーワードスコア: %.2f", metrics.KeywordScore)
				log.Printf("  - スパチャスコア: %.2f", metrics.SuperChatScore)
				log.Printf("  - 🎯 総合盛り上がりスコア: %.2f (%.0f%%)", metrics.SurgeScore, metrics.SurgeScore*100)

				// 履歴を更新（最新20件を保持）
				commentHistoryMutex.Lock()
				history = append(history, currentSnapshot)
				if len(history) > 20 {
					history = history[len(history)-20:]
				}
				// 30分以上前のデータを削除
				cutoffTime := time.Now().Add(-30 * time.Minute)
				filteredHistory := []CommentSnapshot{}
				for _, h := range history {
					if h.Timestamp.After(cutoffTime) {
						filteredHistory = append(filteredHistory, h)
					}
				}
				commentHistory[vID] = filteredHistory
				commentHistoryMutex.Unlock()

				// キャッシュを更新
				surgeMetricsMutex.Lock()
				surgeMetricsCache[vID] = metrics
				surgeMetricsMutex.Unlock()

				mu.Lock()
				surgeStreams = append(surgeStreams, metrics)
				mu.Unlock()
			}(stream, videoID)
		}

		wg.Wait()

		// スコア順にソート
		sort.Slice(surgeStreams, func(i, j int) bool {
			return surgeStreams[i].SurgeScore > surgeStreams[j].SurgeScore
		})

		c.JSON(http.StatusOK, gin.H{
			"streams":    surgeStreams,
			"updated_at": time.Now(),
		})
	})

	// ユーザー重み設定取得API
	r.GET("/users/:id/surge-weights", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var weightSettings SurgeWeightSettings
		if err := db.Where("user_id = ?", user.ID).First(&weightSettings).Error; err != nil {
			// デフォルト値を返す
			c.JSON(http.StatusOK, SurgeWeightSettings{
				CommentGrowthWeight: 0.5,
				KeywordWeight:       0.3,
				SuperChatWeight:     0.2,
			})
			return
		}

		c.JSON(http.StatusOK, weightSettings)
	})

	// ユーザー重み設定更新API
	r.PUT("/users/:id/surge-weights", func(c *gin.Context) {
		var user User
		if err := db.First(&user, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}

		var updateData struct {
			CommentGrowthWeight float64 `json:"comment_growth_weight"`
			KeywordWeight       float64 `json:"keyword_weight"`
			SuperChatWeight     float64 `json:"super_chat_weight"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "入力データが正しくありません: " + err.Error()})
			return
		}

		// バリデーション: 重みの合計を確認
		totalWeight := updateData.CommentGrowthWeight + updateData.KeywordWeight + updateData.SuperChatWeight
		if totalWeight <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "重みの合計が0以下です"})
			return
		}

		// 自動正規化（合計が1.0になるように）
		if totalWeight != 1.0 {
			updateData.CommentGrowthWeight /= totalWeight
			updateData.KeywordWeight /= totalWeight
			updateData.SuperChatWeight /= totalWeight
		}

		var weightSettings SurgeWeightSettings
		if err := db.Where("user_id = ?", user.ID).First(&weightSettings).Error; err != nil {
			// 新規作成
			weightSettings = SurgeWeightSettings{
				UserID:              user.ID,
				CommentGrowthWeight: updateData.CommentGrowthWeight,
				KeywordWeight:       updateData.KeywordWeight,
				SuperChatWeight:     updateData.SuperChatWeight,
			}
			if err := db.Create(&weightSettings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "重み設定の保存に失敗しました"})
				return
			}
		} else {
			// 更新
			weightSettings.CommentGrowthWeight = updateData.CommentGrowthWeight
			weightSettings.KeywordWeight = updateData.KeywordWeight
			weightSettings.SuperChatWeight = updateData.SuperChatWeight
			if err := db.Save(&weightSettings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "重み設定の更新に失敗しました"})
				return
			}
		}

		c.JSON(http.StatusOK, weightSettings)
	})

	r.Run()
}
