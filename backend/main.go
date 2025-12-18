package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

type Task struct {
	ID    uint 		`gorm:"primaryKey`
	Name  string 	`json:"name" binding:"required"`
	Email string	`json:"email" binding:"required"`
}

func main() {
	r := gin.Default()

	r.POST("/register", func(c *gin.Context) {
		var newUser Task
		if err := c.ShouldBindJSON(&newUser) ; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error" : err.Error(),
			})
			return
		}

		//データベースの処理

		c.JSON(http.StatusOK, gin.H{
			"message" : "ユーザー登録が完了しました",
			"user" : newUser,
		})
	})
	r.Run()
}