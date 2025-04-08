package toxicity

import (
	"cloud.google.com/go/vertexai/genai"
	"context"
	"encoding/json"
	"fmt"
	"google.golang.org/protobuf/proto"
	"log"
	"regexp"
)

const (
	location  = "us-central1"
	modelName = "gemini-2.0-flash-001"
	projectID = "faceit-playground"
)

const systemInstruction = `You are a chat moderator assistant for an esports viewing platform. Your task is to analyze chat messages, translate them if necessary, and assign a toxicity score to each message.`

type inputMessage struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type outputMessage struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}

func CalculateToxicityScore(message []inputMessage) ([]outputMessage, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, projectID, location)
	if err != nil {
		return nil, fmt.Errorf("error creating client: %w", err)
	}
	defer client.Close()

	model := client.GenerativeModel(modelName)

	model.GenerationConfig = genai.GenerationConfig{
		TopP:            proto.Float32(1),
		TopK:            proto.Int32(32),
		Temperature:     proto.Float32(0.4),
		MaxOutputTokens: proto.Int32(2048),
	}

	model.SystemInstruction = &genai.Content{
		Role:  "user",
		Parts: []genai.Part{genai.Text(systemInstruction)},
	}

	prompt := genai.Text("Assign a toxicity score to each message based on the following criteria: " +
		"- Harassing other users - Using hateful language - Wishing harm on others - Promoting divisive political rhetoric to instigate arguments d. " +
		"The toxicity score should be a number between 0 and 1 with two decimal places. " +
		"Consider the context of esports viewing, where strong expressions of frustration about the game are common, and avoid penalizing passionate fans for expressing their emotions. " +
		"Please return poor json array with the following fields: id, score.")

	parts := make([]genai.Part, 0)
	parts = append(parts, prompt)
	for _, msg := range message {
		part, err := json.Marshal(msg)
		if err != nil {
			log.Printf("error marshalling message: %v", err)
			continue
		}
		parts = append(parts, genai.Text(part))
	}

	resp, err := model.GenerateContent(ctx, parts...)
	if err != nil {
		return nil, fmt.Errorf("error generating content: %w", err)
	}

	// Debugging response
	debugResponse(resp)

	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("no candidates returned")
	}

	if len(resp.Candidates) > 1 {
		return nil, fmt.Errorf("multiple candidates returned, expected one")
	}

	candidate := resp.Candidates[0]
	if len(candidate.Content.Parts) == 0 {
		return nil, fmt.Errorf("no content parts returned")
	}

	part := candidate.Content.Parts[0]

	text, ok := part.(genai.Text)
	if !ok {
		return nil, fmt.Errorf("expected genai.Text, got %T", part)
	}

	// Extract the JSON string from the text
	return extractResponse(string(text))
}

func extractResponse(input string) ([]outputMessage, error) {
	// Use regex to extract content between triple backticks
	re := regexp.MustCompile("(?s)```json\\s*(.*?)\\s*```")
	matches := re.FindStringSubmatch(input)
	if len(matches) < 2 {
		return nil, fmt.Errorf("no JSON found in input")
	}

	jsonData := matches[1]

	// Unmarshal the JSON into the struct
	var items []outputMessage
	if err := json.Unmarshal([]byte(jsonData), &items); err != nil {
		return nil, fmt.Errorf("error parsing JSON: %w", err)
	}

	return items, nil
}

func debugResponse(resp *genai.GenerateContentResponse) {
	// https://pkg.go.dev/cloud.google.com/go/vertexai/genai#GenerateContentResponse.
	rb, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		log.Printf("json.MarshalIndent: %v", err)
		return
	}
	fmt.Println(string(rb))
}
