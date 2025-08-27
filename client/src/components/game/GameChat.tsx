import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GameChatProps {
  tableId: string;
  onSendMessage: (message: string) => void;
  className?: string;
  isCompact?: boolean;
}

export function GameChat({ tableId, onSendMessage, className, isCompact = false }: GameChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/tables', tableId, 'chat'],
    refetchInterval: 3000, // Poll for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      await apiRequest('POST', `/api/tables/${tableId}/chat`, { message: messageText });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId, 'chat'] });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate(message.trim());
    onSendMessage(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isMyMessage = msg.userId === user?.id;
    const isSystemMessage = !msg.userId;

    return (
      <div 
        key={msg.id}
        className={cn(
          "flex gap-2 mb-3",
          isMyMessage && "flex-row-reverse"
        )}
        data-testid={`chat-message-${index}`}
      >
        {!isSystemMessage && (
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage src={msg.user?.profileImageUrl || ''} />
            <AvatarFallback className="text-xs">
              {msg.user?.firstName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn(
          "max-w-[80%] space-y-1",
          isSystemMessage && "w-full text-center"
        )}>
          {!isSystemMessage && (
            <div className={cn(
              "flex items-center gap-2 text-xs",
              isMyMessage && "flex-row-reverse"
            )}>
              <span className="font-medium">
                {isMyMessage ? 'You' : (msg.user?.firstName || 'User')}
              </span>
              <span className="text-muted-foreground">
                {formatTime(msg.createdAt)}
              </span>
              {msg.isModerated && (
                <Badge variant="destructive" className="text-xs">
                  Moderated
                </Badge>
              )}
            </div>
          )}

          <div className={cn(
            "px-3 py-2 rounded-lg text-sm",
            isSystemMessage ? "bg-muted text-muted-foreground italic" : 
            isMyMessage ? "bg-primary text-primary-foreground" : 
            "bg-muted"
          )}>
            {msg.message}
          </div>
        </div>
      </div>
    );
  };

  if (isCompact && !isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("w-full", className)}
        data-testid="expand-chat-button"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Chat ({messages.length})
      </Button>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)} data-testid="game-chat">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <span className="font-medium text-sm">Table Chat</span>
          <Badge variant="secondary" className="text-xs">
            {messages.length}
          </Badge>
        </div>
        
        {isCompact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 p-3"
          data-testid="chat-messages"
        >
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm">
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => renderMessage(message, index))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              className="text-sm"
              maxLength={200}
              data-testid="chat-input"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="send-message-button"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {message.length > 150 && (
            <p className="text-xs text-muted-foreground mt-1">
              {200 - message.length} characters remaining
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
