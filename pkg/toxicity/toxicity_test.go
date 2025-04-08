package toxicity

import (
	"github.com/stretchr/testify/require"
	"testing"
)

func TestCalculateToxicityScore(t *testing.T) {
	messages := []inputMessage{
		{
			ID:   "1",
			Text: "This is a test message",
		},
		{
			ID:   "2",
			Text: "Go and f*ck yourself",
		},
	}

	scores, err := CalculateToxicityScore(messages)
	require.NoError(t, err)
	require.Len(t, scores, 2)
	require.GreaterOrEqual(t, scores[1].Score, float64(0.5))
}
