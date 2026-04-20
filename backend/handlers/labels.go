package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"nextplay/backend/db"
)

type Label struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateLabelInput struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

func ListLabels(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, user_id, name, color, created_at FROM labels WHERE user_id = $1 ORDER BY name ASC`,
		userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	labels := []Label{}
	for rows.Next() {
		var l Label
		if err := rows.Scan(&l.ID, &l.UserID, &l.Name, &l.Color, &l.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		labels = append(labels, l)
	}

	c.JSON(http.StatusOK, labels)
}

func CreateLabel(c *gin.Context) {
	userID := c.GetString("user_id")

	var input CreateLabelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Color == "" {
		input.Color = "#6366f1"
	}

	var l Label
	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO labels (user_id, name, color) VALUES ($1, $2, $3)
		RETURNING id, user_id, name, color, created_at
	`, userID, input.Name, input.Color).Scan(&l.ID, &l.UserID, &l.Name, &l.Color, &l.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, l)
}

func DeleteLabel(c *gin.Context) {
	userID := c.GetString("user_id")
	labelID := c.Param("id")

	result, err := db.Pool.Exec(context.Background(),
		`DELETE FROM labels WHERE id = $1 AND user_id = $2`, labelID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "label not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "label deleted"})
}

func AddTaskLabel(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var input struct {
		LabelID string `json:"label_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	_, err := db.Pool.Exec(context.Background(),
		`INSERT INTO task_labels (task_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		taskID, input.LabelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "label added"})
}

func RemoveTaskLabel(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	labelID := c.Param("labelId")

	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	db.Pool.Exec(context.Background(),
		`DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2`, taskID, labelID)

	c.JSON(http.StatusOK, gin.H{"message": "label removed"})
}

func getTaskLabels(taskID string) []Label {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT l.id, l.user_id, l.name, l.color, l.created_at
		FROM labels l
		JOIN task_labels tl ON tl.label_id = l.id
		WHERE tl.task_id = $1
	`, taskID)
	if err != nil {
		return []Label{}
	}
	defer rows.Close()

	labels := []Label{}
	for rows.Next() {
		var l Label
		if err := rows.Scan(&l.ID, &l.UserID, &l.Name, &l.Color, &l.CreatedAt); err != nil {
			continue
		}
		labels = append(labels, l)
	}
	return labels
}
