package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"nextplay/backend/db"
)

type Task struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	DueDate     *string    `json:"due_date"`
	Position    int        `json:"position"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Assignees   []Member   `json:"assignees"`
	Labels      []Label    `json:"labels"`
}

type CreateTaskInput struct {
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	DueDate     *string `json:"due_date"`
}

type UpdateTaskInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	DueDate     *string `json:"due_date"`
	Position    *int    `json:"position"`
}

func ListTasks(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, user_id, title, description, status, priority,
		       to_char(due_date, 'YYYY-MM-DD'), position, created_at, updated_at
		FROM tasks
		WHERE user_id = $1
		ORDER BY position ASC, created_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	tasks := []Task{}
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description,
			&t.Status, &t.Priority, &t.DueDate, &t.Position,
			&t.CreatedAt, &t.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		t.Assignees = []Member{}
		t.Labels = []Label{}
		tasks = append(tasks, t)
	}

	// Enrich with assignees and labels
	for i := range tasks {
		tasks[i].Assignees = getTaskAssignees(tasks[i].ID)
		tasks[i].Labels = getTaskLabels(tasks[i].ID)
	}

	c.JSON(http.StatusOK, tasks)
}

func GetTask(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var t Task
	err := db.Pool.QueryRow(context.Background(), `
		SELECT id, user_id, title, description, status, priority,
		       to_char(due_date, 'YYYY-MM-DD'), position, created_at, updated_at
		FROM tasks
		WHERE id = $1 AND user_id = $2
	`, taskID, userID).Scan(
		&t.ID, &t.UserID, &t.Title, &t.Description,
		&t.Status, &t.Priority, &t.DueDate, &t.Position,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	t.Assignees = getTaskAssignees(t.ID)
	t.Labels = getTaskLabels(t.ID)

	c.JSON(http.StatusOK, t)
}

func CreateTask(c *gin.Context) {
	userID := c.GetString("user_id")

	var input CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Status == "" {
		input.Status = "todo"
	}
	if input.Priority == "" {
		input.Priority = "medium"
	}

	var t Task
	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO tasks (user_id, title, description, status, priority, due_date)
		VALUES ($1, $2, $3, $4, $5, $6::date)
		RETURNING id, user_id, title, description, status, priority,
		          to_char(due_date, 'YYYY-MM-DD'), position, created_at, updated_at
	`, userID, input.Title, input.Description, input.Status, input.Priority, input.DueDate).Scan(
		&t.ID, &t.UserID, &t.Title, &t.Description,
		&t.Status, &t.Priority, &t.DueDate, &t.Position,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	logActivity(t.ID, userID, "created", "", t.Status)

	t.Assignees = []Member{}
	t.Labels = []Label{}
	c.JSON(http.StatusCreated, t)
}

func UpdateTask(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var input UpdateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch current task to detect status change
	var oldStatus string
	err := db.Pool.QueryRow(context.Background(),
		`SELECT status FROM tasks WHERE id = $1 AND user_id = $2`,
		taskID, userID,
	).Scan(&oldStatus)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	var t Task
	err = db.Pool.QueryRow(context.Background(), `
		UPDATE tasks SET
			title       = COALESCE($3, title),
			description = COALESCE($4, description),
			status      = COALESCE($5, status),
			priority    = COALESCE($6, priority),
			due_date    = COALESCE($7::date, due_date),
			position    = COALESCE($8, position)
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, title, description, status, priority,
		          to_char(due_date, 'YYYY-MM-DD'), position, created_at, updated_at
	`, taskID, userID,
		input.Title, input.Description, input.Status,
		input.Priority, input.DueDate, input.Position,
	).Scan(
		&t.ID, &t.UserID, &t.Title, &t.Description,
		&t.Status, &t.Priority, &t.DueDate, &t.Position,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if input.Status != nil && *input.Status != oldStatus {
		logActivity(taskID, userID, "status_changed", oldStatus, *input.Status)
	}

	t.Assignees = getTaskAssignees(t.ID)
	t.Labels = getTaskLabels(t.ID)
	c.JSON(http.StatusOK, t)
}

func DeleteTask(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	result, err := db.Pool.Exec(context.Background(),
		`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, taskID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task deleted"})
}
