import { useEffect, useRef, useCallback } from "react";

interface WebSocketOptions {
  onMessage?: (data: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

interface User {
  id: string;
  name: string;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const user = useRef<User | null>(null);

  const connect = useCallback(
    (userInfo: User) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      user.current = userInfo;
      const socket = new WebSocket("ws://localhost:8080/ws");

      socket.onopen = () => {
        console.log("WebSocket connected");
        // Send user information as the first message
        socket.send(JSON.stringify(userInfo));
        reconnectAttempts.current = 0;
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      socket.onmessage = (event) => {
        console.log("Message received:", event.data);
        options.onMessage?.(event.data);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        options.onError?.(new Error("WebSocket error"));
      };

      socket.onclose = () => {
        console.log("WebSocket closed");
        options.onClose?.();

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
          reconnectTimeout.current = window.setTimeout(() => {
            reconnectAttempts.current++;
            connect(userInfo);
          }, delay);
        }
      };

      ws.current = socket;
    },
    [options]
  );

  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);

  return {
    connect,
    sendMessage,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
};
