package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"nextplay/backend/db"
	"nextplay/backend/handlers"
	"nextplay/backend/middleware"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	if err := db.Init(); err != nil {
		log.Fatalf("Database init failed: %v", err)
	}
	defer db.Pool.Close()

	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Authenticated routes
	api := r.Group("/api", middleware.Auth())

	// Tasks
	api.GET("/tasks", handlers.ListTasks)
	api.POST("/tasks", handlers.CreateTask)
	api.GET("/tasks/:id", handlers.GetTask)
	api.PUT("/tasks/:id", handlers.UpdateTask)
	api.DELETE("/tasks/:id", handlers.DeleteTask)

	// Comments
	api.GET("/tasks/:id/comments", handlers.ListComments)
	api.POST("/tasks/:id/comments", handlers.CreateComment)
	api.DELETE("/tasks/:id/comments/:commentId", handlers.DeleteComment)

	// Activity
	api.GET("/tasks/:id/activity", handlers.ListActivity)

	// Assignees
	api.POST("/tasks/:id/assignees", handlers.AddAssignee)
	api.DELETE("/tasks/:id/assignees/:memberId", handlers.RemoveAssignee)

	// Labels on tasks
	api.POST("/tasks/:id/labels", handlers.AddTaskLabel)
	api.DELETE("/tasks/:id/labels/:labelId", handlers.RemoveTaskLabel)

	// Team members
	api.GET("/members", handlers.ListMembers)
	api.POST("/members", handlers.CreateMember)
	api.GET("/members/:id", handlers.GetMember)
	api.DELETE("/members/:id", handlers.DeleteMember)

	// Labels
	api.GET("/labels", handlers.ListLabels)
	api.POST("/labels", handlers.CreateLabel)
	api.DELETE("/labels/:id", handlers.DeleteLabel)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
