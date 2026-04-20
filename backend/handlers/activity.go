package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"nextplay/backend/db"
)

type ActivityLog struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`
	OldValue  *string   `json:"old_value"`
	NewValue  *string   `json:"new_value"`
	CreatedAt time.Time `json:"created_at"`
}

func ListActivity(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, task_id, user_id, action, old_value, new_value, created_at
		 FROM activity_logs WHERE task_id = $1 ORDER BY created_at DESC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	logs := []ActivityLog{}
	for rows.Next() {
		var a ActivityLog
		if err := rows.Scan(&a.ID, &a.TaskID, &a.UserID, &a.Action,
			&a.OldValue, &a.NewValue, &a.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		logs = append(logs, a)
	}

	c.JSON(http.StatusOK, logs)
}

func logActivity(taskID, userID, action, oldValue, newValue string) {
	var oldVal, newVal *string
	if oldValue != "" {
		oldVal = &oldValue
	}
	if newValue != "" {
		newVal = &newValue
	}

	db.Pool.Exec(context.Background(), `
		INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
		VALUES ($1, $2, $3, $4, $5)
	`, taskID, userID, action, oldVal, newVal)
}
