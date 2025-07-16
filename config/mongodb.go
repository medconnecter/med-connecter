
package config

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// ConnectMongoDB establishes a connection to MongoDB
func ConnectMongoDB() (*mongo.Client, error) {
	// Get MongoDB connection string from environment variables
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable not set")
	}

	// Create a context with timeout for the connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Printf("Failed to connect to MongoDB: %v", err)
		return nil, err
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Printf("Failed to ping MongoDB: %v", err)
		return nil, err
	}

	log.Println("Successfully connected to MongoDB")
	return client, nil
}

// GetCollection returns a MongoDB collection
func GetCollection(client *mongo.Client, collectionName string) *mongo.Collection {
	// Get database name from environment variables or use default
	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "practo_clone"
	}

	return client.Database(dbName).Collection(collectionName)
}
