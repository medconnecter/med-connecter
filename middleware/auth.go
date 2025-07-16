
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
)

// Claims defines the JWT claims structure
type Claims struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// AuthMiddleware verifies JWT tokens for protected routes
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip authentication for login, register and public routes
		if strings.HasPrefix(r.URL.Path, "/api/auth/login") ||
			strings.HasPrefix(r.URL.Path, "/api/auth/register") ||
			strings.HasPrefix(r.URL.Path, "/api/doctors") && r.Method == "GET" {
			next.ServeHTTP(w, r)
			return
		}

		// Get the JWT token from the Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}

		// Extract the token from the "Bearer token" format
		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

		// Parse and validate the token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Validate the signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Add user information to the request context
		ctx := context.WithValue(r.Context(), "userId", claims.UserID)
		ctx = context.WithValue(ctx, "userRole", claims.Role)

		// Continue with the next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GenerateJWT creates a new JWT token for a user
func GenerateJWT(userID, role string) (string, error) {
	// Set expiration time
	expirationTime := time.Now().Add(24 * time.Hour)

	// Create claims
	claims := &Claims{
		UserID: userID,
		Role:   role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
			IssuedAt:  time.Now().Unix(),
			Issuer:    "practo-clone",
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret key
	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
