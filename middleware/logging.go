
package middleware

import (
	"log"
	"net/http"
	"time"
)

// LoggingMiddleware logs HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a custom response writer to capture the status code
		writer := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Call the next handler
		next.ServeHTTP(writer, r)

		// Calculate request duration
		duration := time.Since(start)

		// Log request details
		log.Printf(
			"Method: %s | Path: %s | Status: %d | Duration: %v | IP: %s | User-Agent: %s",
			r.Method,
			r.URL.Path,
			writer.statusCode,
			duration,
			r.RemoteAddr,
			r.UserAgent(),
		)
	})
}

// responseWriter is a wrapper for http.ResponseWriter that captures the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
