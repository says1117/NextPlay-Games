package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"nextplay/backend/db"
)

type Comment struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateCommentInput struct {
	Content string `json:"content" binding:"required"`
}

func ListComments(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	// Verify task belongs to user
	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, task_id, user_id, content, created_at
		 FROM comments WHERE task_id = $1 ORDER BY created_at ASC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	comments := []Comment{}
	for rows.Next() {
		var com Comment
		if err := rows.Scan(&com.ID, &com.TaskID, &com.UserID, &com.Content, &com.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		comments = append(comments, com)
	}

	c.JSON(http.StatusOK, comments)
}

func CreateComment(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var input CreateCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify task belongs to user
	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	var com Comment
	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3)
		RETURNING id, task_id, user_id, content, created_at
	`, taskID, userID, input.Content).Scan(
		&com.ID, &com.TaskID, &com.UserID, &com.Content, &com.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	logActivity(taskID, userID, "commented", "", "")

	c.JSON(http.StatusCreated, com)
}

func DeleteComment(c *gin.Context) {
	userID := c.GetString("user_id")
	commentID := c.Param("commentId")

	result, err := db.Pool.Exec(context.Background(),
		`DELETE FROM comments WHERE id = $1 AND user_id = $2`, commentID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "comment deleted"})
}
