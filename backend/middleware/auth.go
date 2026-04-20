package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var (
	keyCache   jwk.Set
	keyCacheAt time.Time
	keyMu      sync.RWMutex
)

func getKeySet() (jwk.Set, error) {
	keyMu.RLock()
	if keyCache != nil && time.Since(keyCacheAt) < 30*time.Minute {
		defer keyMu.RUnlock()
		return keyCache, nil
	}
	keyMu.RUnlock()

	keyMu.Lock()
	defer keyMu.Unlock()

	supabaseURL := os.Getenv("SUPABASE_URL")
	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

	set, err := jwk.Fetch(context.Background(), jwksURL)
	if err != nil {
		return nil, err
	}

	keyCache = set
	keyCacheAt = time.Now()
	return set, nil
}

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		keySet, err := getKeySet()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "could not fetch auth keys"})
			return
		}

		token, err := jwt.Parse([]byte(tokenStr),
			jwt.WithKeySet(keySet),
			jwt.WithValidate(true),
		)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		userID := token.Subject()
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing user id in token"})
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}
