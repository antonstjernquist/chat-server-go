package main

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"cloud.google.com/go/vertexai/genai"
)

func main() {

	location := "us-central1"
	modelName := "gemini-2.0-flash-001"
	projectID := "faceit-playground"

	var buf bytes.Buffer

	if err := countTokens(&buf, projectID, location, modelName); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Result:", buf.String())
}

// countTokens returns the number of tokens for this prompt.
func countTokens(w io.Writer, projectID, location, modelName string) error {
	// location := "us-central1"
	// modelName := "gemini-1.5-flash-001"

	ctx := context.Background()
	prompt := genai.Text("Why is the sky blue?")

	client, err := genai.NewClient(ctx, projectID, location)
	if err != nil {
		return fmt.Errorf("unable to create client: %w", err)
	}
	defer client.Close()

	model := client.GenerativeModel(modelName)

	resp, err := model.CountTokens(ctx, prompt)
	if err != nil {
		return err
	}

	fmt.Fprintf(w, "Number of tokens for the prompt: %d\n", resp.TotalTokens)

	resp2, err := model.GenerateContent(ctx, prompt)
	if err != nil {
		return err
	}
	fmt.Fprintf(w, "Number of tokens for the prompt: %d\n", resp2.UsageMetadata.PromptTokenCount)
	fmt.Fprintf(w, "Number of tokens for the candidates: %d\n", resp2.UsageMetadata.CandidatesTokenCount)
	fmt.Fprintf(w, "Total number of tokens: %d\n", resp2.UsageMetadata.TotalTokenCount)

	return nil
}
