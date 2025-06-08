package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	registrationCompleted bool
	registrationMutex     sync.Mutex
	upgrader              = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins (for development only)
		},
	}
)

type PlayerData struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Mobile    string `json:"mobile"`
	Timestamp string `json:"timestamp"`
}

type ScoreboardEntry struct {
	Rank  int    `json:"rank"`
	Name  string `json:"name"`
	Score int    `json:"score"`
	Time  int    `json:"time"`
}

func main() {
	port := "8081"

	// Initialize registration state
	registrationCompleted = false

	// Create the players.csv file if it doesn't exist
	_, err := os.Stat("players.csv")
	if os.IsNotExist(err) {
		csvFile, err := os.Create("players.csv")
		if err != nil {
			log.Fatalf("Failed to create players.csv: %v", err)
		}
		writer := csv.NewWriter(csvFile)
		headers := []string{"Name", "Email", "Mobile", "Timestamp"}
		writer.Write(headers)
		writer.Flush()
		csvFile.Close()
	}

	// Set up routes with middleware
	mux := http.NewServeMux()

	// Register API endpoint
	mux.HandleFunc("/register", handleRegistration)
	log.Printf("Registration completed, setting registrationCompleted to %v", registrationCompleted)

	// WebSocket route
	mux.HandleFunc("/ws", handleWebSocket)

	// Scoreboard routes
	mux.HandleFunc("/get_scoreboard", getScoreboard)
	mux.HandleFunc("/get_player_stats", getPlayerStats)
	mux.HandleFunc("/reset_registration", resetRegistration)

	// Static files
	fs := http.FileServer(http.Dir("static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Root handler for serving HTML files
	mux.HandleFunc("/", rootHandler)

	// Wrap the mux with the registration middleware
	handler := registrationMiddleware(mux)

	fmt.Printf("Server is running at http://localhost:%s\n", port)
	err = http.ListenAndServe(":"+port, handler)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// WebSocket handler
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Failed to upgrade to WebSocket:", err)
		return
	}
	defer conn.Close()

	for {
		// Read message from client
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		// Process message (you can add your game logic here)
		log.Printf("Received: %s", msg)

		// Send response back to client
		response := fmt.Sprintf("Server received: %s", msg)
		err = conn.WriteMessage(websocket.TextMessage, []byte(response))
		if err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

// Handle player registration
func handleRegistration(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body
	var playerData PlayerData
	err := json.NewDecoder(r.Body).Decode(&playerData)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Ensure the players.csv file exists
	csvFile, err := os.OpenFile("players.csv", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		http.Error(w, "Failed to open CSV file", http.StatusInternalServerError)
		return
	}
	defer csvFile.Close()

	// Check if the file is empty and write headers if needed
	fileInfo, err := csvFile.Stat()
	if err != nil {
		http.Error(w, "Failed to get file info", http.StatusInternalServerError)
		return
	}

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	if fileInfo.Size() == 0 {
		// Write headers if the file is empty
		headers := []string{"Name", "Email", "Mobile", "Timestamp"}
		if err := writer.Write(headers); err != nil {
			http.Error(w, "Failed to write CSV headers", http.StatusInternalServerError)
			return
		}
	}

	// Write the player data to the CSV file
	record := []string{
		playerData.Name,
		playerData.Email,
		playerData.Mobile,
		time.Now().UTC().Format(time.RFC3339),
	}

	if err := writer.Write(record); err != nil {
		http.Error(w, "Failed to write to CSV file", http.StatusInternalServerError)
		return
	}

	// Set registration as completed
	registrationMutex.Lock()
	registrationCompleted = true
	registrationMutex.Unlock()
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// Middleware to check if registration is completed
func registrationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip middleware for registration endpoint and static files
		if r.URL.Path == "/register" ||
			r.URL.Path == "/reset_registration" ||
			r.URL.Path == "/ws" ||
			r.URL.Path == "/overlay.html" ||
			strings.HasPrefix(r.URL.Path, "/static/") {
			next.ServeHTTP(w, r)
			return
		}

		// If registration is not completed and not requesting overlay.html, redirect to overlay
		registrationMutex.Lock()
		completed := registrationCompleted
		registrationMutex.Unlock()

		if !completed && r.URL.Path != "/overlay.html" && r.URL.Path != "/" {
			http.Redirect(w, r, "/overlay.html", http.StatusSeeOther)
			return
		}

		// If registration is completed and requesting overlay.html, redirect to index.html
		if completed && r.URL.Path == "/overlay.html" {
			http.Redirect(w, r, "/index.html", http.StatusSeeOther)
			return
		}

		// If registration is completed, proceed with the request
		next.ServeHTTP(w, r)
	})
}

func resetRegistration(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	registrationMutex.Lock()
	registrationCompleted = false
	registrationMutex.Unlock()
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"registration reset"}`))
}

// Placeholder for scoreboard functions
func getScoreboard(w http.ResponseWriter, r *http.Request) {
	// Implement your scoreboard logic here
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`[]`))
}

func getPlayerStats(w http.ResponseWriter, r *http.Request) {
	// Implement your player stats logic here
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{}`))
}

// Root handler to serve the appropriate HTML file
func rootHandler(w http.ResponseWriter, r *http.Request) {
	registrationMutex.Lock()
	completed := registrationCompleted
	registrationMutex.Unlock()

	if r.URL.Path == "/" {
		if !completed {
			http.ServeFile(w, r, "overlay.html")
		} else {
			http.ServeFile(w, r, "index.html")
		}
		return
	}

	log.Printf("Serving %s, registrationCompleted = %v", r.URL.Path, completed)
	// For all other paths, serve the file directly
	http.FileServer(http.Dir(".")).ServeHTTP(w, r)
}
