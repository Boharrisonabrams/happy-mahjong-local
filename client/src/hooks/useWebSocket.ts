import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./useAuth";

export interface WebSocketMessage {
  type: string;
  data?: any;
  tableId?: string;
  gameId?: string;
}

export interface WebSocketHook {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  reconnect: () => void;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void): WebSocketHook {
  const { user, isAuthenticated } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messageQueue = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (!isAuthenticated || ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);

        // Authenticate with the server
        if (user?.id) {
          ws.current?.send(JSON.stringify({
            type: 'authenticate',
            data: { userId: user.id }
          }));
        }

        // Send any queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          if (message && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
          }
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          
          if (onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
          setError("Failed to parse server message");
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect unless it was a manual close
        if (event.code !== 1000 && isAuthenticated) {
          setError("Connection lost. Reconnecting...");
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error occurred");
      };

    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to connect to server");
    }
  }, [isAuthenticated, user?.id, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, "Manual disconnect");
      ws.current = null;
    }
    
    setIsConnected(false);
    setError(null);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    console.log('SendMessage called with:', message);
    console.log('WebSocket state:', ws.current?.readyState, 'isConnected:', isConnected);
    console.log('Queue length before:', messageQueue.current.length);
    
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not open, queueing message. State:', ws.current?.readyState);
      // Queue the message for when connection is restored
      messageQueue.current.push(message);
      console.log('Queue length after:', messageQueue.current.length);
      
      if (!isConnected) {
        setError("Not connected. Message queued.");
      }
      return;
    }

    try {
      console.log('Sending WebSocket message:', JSON.stringify(message));
      ws.current.send(JSON.stringify(message));
      console.log('Message sent successfully');
    } catch (err) {
      console.error("Error sending WebSocket message:", err);
      setError("Failed to send message");
    }
  }, [isConnected]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Heartbeat to detect connection issues
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.ping?.();
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  return {
    isConnected,
    sendMessage,
    lastMessage,
    error,
    reconnect
  };
}
