package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"nextplay/backend/db"
)

type Member struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email"`
	AvatarURL *string   `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateMemberInput struct {
	Name      string  `json:"name" binding:"required"`
	Email     *string `json:"email"`
	AvatarURL *string `json:"avatar_url"`
}

func ListMembers(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, user_id, name, email, avatar_url, created_at
		 FROM team_members WHERE user_id = $1 ORDER BY name ASC`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	members := []Member{}
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.UserID, &m.Name, &m.Email, &m.AvatarURL, &m.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		members = append(members, m)
	}

	c.JSON(http.StatusOK, members)
}

func CreateMember(c *gin.Context) {
	userID := c.GetString("user_id")

	var input CreateMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var m Member
	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO team_members (user_id, name, email, avatar_url)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, email, avatar_url, created_at
	`, userID, input.Name, input.Email, input.AvatarURL).Scan(
		&m.ID, &m.UserID, &m.Name, &m.Email, &m.AvatarURL, &m.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, m)
}

func AddAssignee(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")

	var input struct {
		MemberID string `json:"member_id" binding:"required"`
	}
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

	_, err := db.Pool.Exec(context.Background(),
		`INSERT INTO task_assignees (task_id, team_member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		taskID, input.MemberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get member name for activity log
	var memberName string
	db.Pool.QueryRow(context.Background(),
		`SELECT name FROM team_members WHERE id = $1`, input.MemberID).Scan(&memberName)
	logActivity(taskID, userID, "assigned", "", memberName)

	c.JSON(http.StatusOK, gin.H{"message": "assignee added"})
}

func RemoveAssignee(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	memberID := c.Param("memberId")

	// Verify task belongs to user
	var exists bool
	db.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`,
		taskID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	db.Pool.Exec(context.Background(),
		`DELETE FROM task_assignees WHERE task_id = $1 AND team_member_id = $2`,
		taskID, memberID)

	c.JSON(http.StatusOK, gin.H{"message": "assignee removed"})
}

func getTaskAssignees(taskID string) []Member {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT tm.id, tm.user_id, tm.name, tm.email, tm.avatar_url, tm.created_at
		FROM team_members tm
		JOIN task_assignees ta ON ta.team_member_id = tm.id
		WHERE ta.task_id = $1
	`, taskID)
	if err != nil {
		return []Member{}
	}
	defer rows.Close()

	members := []Member{}
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.UserID, &m.Name, &m.Email, &m.AvatarURL, &m.CreatedAt); err != nil {
			continue
		}
		members = append(members, m)
	}
	return members
}

func DeleteMember(c *gin.Context) {
	userID := c.GetString("user_id")
	memberID := c.Param("id")

	result, err := db.Pool.Exec(context.Background(),
		`DELETE FROM team_members WHERE id = $1 AND user_id = $2`, memberID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member deleted"})
}

func GetMember(c *gin.Context) {
	userID := c.GetString("user_id")
	memberID := c.Param("id")

	var m Member
	err := db.Pool.QueryRow(context.Background(),
		`SELECT id, user_id, name, email, avatar_url, created_at
		 FROM team_members WHERE id = $1 AND user_id = $2`,
		memberID, userID).Scan(&m.ID, &m.UserID, &m.Name, &m.Email, &m.AvatarURL, &m.CreatedAt)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}
