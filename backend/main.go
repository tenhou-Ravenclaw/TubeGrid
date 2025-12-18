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
	Name  string 	`json:"name" binding:"required"`
	Email string	`json:"email" binding:"required,email" gorm:"unique"`
}

func main() {
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		panic("データベースに接続できませんでした")
	}

	db.AutoMigrate(&User{})

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