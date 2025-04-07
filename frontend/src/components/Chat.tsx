import React, { useState, useRef, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import "./Chat.css";

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  text: string;
  timestamp: number;
  user: User;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { connect, sendMessage, isConnected } = useWebSocket({
    onMessage: (data) => {
      try {
        const message = JSON.parse(data);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: message.text,
            timestamp: Date.now(),
            user: message.user,
          },
        ]);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    },
    onError: (error) => {
      setError(error.toString());
      setTimeout(() => setError(null), 5000);
    },
    onClose: () => {
      setError("Connection lost. Reconnecting...");
    },
  });

  useEffect(() => {
    if (!currentUser && !isConnected) {
      // Generate a random user ID and name when component mounts
      const userId = Math.random().toString(36).substring(2, 15);
      const userName = `User${Math.floor(Math.random() * 1000)}`;
      const user = { id: userId, name: userName };
      setCurrentUser(user);
      connect(user);
    }
  }, [connect, currentUser, isConnected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || !currentUser) return;

    const message = {
      text: input,
      user: currentUser,
    };

    sendMessage(JSON.stringify(message));
    setInput("");
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAvatarColor = (userId: string) => {
    // Generate a consistent color based on user ID
    const colors = [
      "#2ecc71",
      "#3498db",
      "#9b59b6",
      "#e74c3c",
      "#f1c40f",
      "#1abc9c",
    ];
    const index = parseInt(userId, 36) % colors.length;
    return colors[index];
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="user-info">
          <h2>Chat</h2>
          {currentUser && (
            <div className="current-user">You: {currentUser.name}</div>
          )}
        </div>
        <div
          className={`connection-status ${
            isConnected ? "connected" : "disconnected"
          }`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="messages-container">
        {messages
          .filter((message) => message.user)
          .map((message) =>
            message.user.id === currentUser?.id ? (
              <div key={message.id} className="message">
                <div
                  className="message-avatar"
                  style={{ backgroundColor: getAvatarColor(message.user?.id) }}
                >
                  {message.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-username">
                      {message.user.name}
                    </span>
                    <span className="message-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">{message.text}</div>
                </div>
              </div>
            ) : (
              <div key={message.id} className="message">
                <div className="message-text">{message.text}</div>
              </div>
            )
          )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          disabled={!isConnected}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || !isConnected}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};
