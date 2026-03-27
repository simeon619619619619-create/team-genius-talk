import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Search,
  Settings,
  Wifi,
  WifiOff,
  BarChart3,
  Clock,
  Zap,
  MessageSquare,
  Bot,
  Plus,
  ArrowLeft,
  MoreVertical,
  Archive,
  Ban,
  Tag,
  ChevronDown,
  Inbox,
  Sparkles,
  Link2,
  CheckCircle2,
  ExternalLink,
  Image,
  Video,
  Mic,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface SocialConnection {
  id: string;
  organization_id: string;
  platform: "instagram" | "facebook" | "whatsapp";
  page_id: string | null;
  page_name: string | null;
  access_token: string | null;
  is_active: boolean;
  auto_reply: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  platform: "instagram" | "facebook";
  external_user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  status: "active" | "archived" | "blocked";
  last_message_at: string;
  unread_count: number;
  tags: string[];
  notes: string | null;
  last_message_preview?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  platform: string;
  direction: "incoming" | "outgoing";
  content: string;
  message_type: string;
  is_auto_reply: boolean;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

// Platform config
const PLATFORMS = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    gradient: "from-purple-500 via-pink-500 to-orange-500",
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    gradient: "from-blue-600 to-blue-400",
  },
} as const;

// Mock data for demonstration
const MOCK_CONVERSATIONS: Conversation[] = [];
const MOCK_MESSAGES: Message[] = [];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Сега";
  if (diffMins < 60) return `${diffMins} мин`;
  if (diffHours < 24) return `${diffHours} ч`;
  if (diffDays < 7) return `${diffDays} дни`;
  return date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==================== Sub-components ====================

function StatsBar({
  connections,
}: {
  connections: SocialConnection[];
}) {
  const igConnected = connections.some(
    (c) => c.platform === "instagram" && c.is_active
  );
  const fbConnected = connections.some(
    (c) => c.platform === "facebook" && c.is_active
  );

  const stats = [
    {
      label: "Съобщения днес",
      value: "0",
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      label: "Авто-отговори",
      value: "0%",
      icon: Bot,
      color: "text-purple-500",
    },
    {
      label: "Ср. време отговор",
      value: "--",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      label: "Нови разговори",
      value: "0",
      icon: Zap,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-xl",
                  stat.color === "text-blue-500" && "bg-blue-500/10",
                  stat.color === "text-purple-500" && "bg-purple-500/10",
                  stat.color === "text-orange-500" && "bg-orange-500/10",
                  stat.color === "text-green-500" && "bg-green-500/10"
                )}
              >
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ConnectionStatusBar({
  connections,
  onOpenSettings,
}: {
  connections: SocialConnection[];
  onOpenSettings: () => void;
}) {
  const igConnection = connections.find((c) => c.platform === "instagram");
  const fbConnection = connections.find((c) => c.platform === "facebook");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Instagram status */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border",
          igConnection?.is_active
            ? "border-pink-500/30 bg-pink-500/5"
            : "border-border bg-muted/50"
        )}
      >
        <Instagram
          className={cn(
            "h-4 w-4",
            igConnection?.is_active ? "text-pink-500" : "text-muted-foreground"
          )}
        />
        <span
          className={
            igConnection?.is_active ? "text-pink-500" : "text-muted-foreground"
          }
        >
          {igConnection?.is_active ? "Свързан" : "Не е свързан"}
        </span>
        {igConnection?.is_active ? (
          <Wifi className="h-3 w-3 text-pink-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* Facebook status */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border",
          fbConnection?.is_active
            ? "border-blue-500/30 bg-blue-500/5"
            : "border-border bg-muted/50"
        )}
      >
        <Facebook
          className={cn(
            "h-4 w-4",
            fbConnection?.is_active ? "text-blue-500" : "text-muted-foreground"
          )}
        />
        <span
          className={
            fbConnection?.is_active ? "text-blue-500" : "text-muted-foreground"
          }
        >
          {fbConnection?.is_active ? "Свързан" : "Не е свързан"}
        </span>
        {fbConnection?.is_active ? (
          <Wifi className="h-3 w-3 text-blue-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="ml-auto gap-1.5"
        onClick={onOpenSettings}
      >
        <Settings className="h-3.5 w-3.5" />
        Настройки
      </Button>
    </div>
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  platformFilter,
  searchQuery,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  platformFilter: string;
  searchQuery: string;
}) {
  const filtered = conversations.filter((c) => {
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    if (
      searchQuery &&
      !c.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">Няма разговори</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {conversations.length === 0
            ? "Свържете Instagram или Facebook за да започнете да получавате съобщения"
            : "Няма резултати за тази филтрация"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((conv) => {
        const platform = PLATFORMS[conv.platform];
        const PlatformIcon = platform.icon;
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors",
              isSelected
                ? "bg-secondary"
                : "hover:bg-secondary/50"
            )}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={conv.user_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {conv.user_name
                    ? conv.user_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-card"
                )}
              >
                <PlatformIcon
                  className={cn("h-3 w-3", platform.color)}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">
                  {conv.user_name || "Неизвестен"}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {conv.last_message_preview || "Няма съобщения"}
                </p>
                {conv.unread_count > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-primary text-primary-foreground shrink-0">
                    {conv.unread_count > 9 ? "9+" : conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChatView({
  conversation,
  messages,
  onSend,
  onBack,
}: {
  conversation: Conversation | null;
  messages: Message[];
  onSend: (text: string) => void;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="p-5 rounded-full bg-muted/50 mb-4">
          <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground">
          Изберете разговор
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
          Изберете разговор от списъка отляво или свържете социалните си мрежи за
          да започнете
        </p>
      </div>
    );
  }

  const platform = PLATFORMS[conversation.platform];
  const PlatformIcon = platform.icon;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Avatar className="h-9 w-9">
          <AvatarImage src={conversation.user_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {conversation.user_name
              ? conversation.user_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {conversation.user_name || "Неизвестен"}
            </span>
            <PlatformIcon className={cn("h-3.5 w-3.5", platform.color)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {conversation.status === "active"
              ? "Активен"
              : conversation.status === "archived"
              ? "Архивиран"
              : "Блокиран"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" />
              Архивирай
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Tag className="mr-2 h-4 w-4" />
              Добави таг
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              Блокирай
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Няма съобщения в този разговор
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOutgoing = msg.direction === "outgoing";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    isOutgoing ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5",
                      isOutgoing
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mt-1",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.is_auto_reply && (
                        <Bot className="h-3 w-3 opacity-60" />
                      )}
                      <span className="text-[10px] opacity-60">
                        {formatMessageTime(msg.sent_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Напишете съобщение..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="pr-10 rounded-xl"
            />
          </div>
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConnectPlatformDialog({
  open,
  onOpenChange,
  connections,
  onConnect,
  onToggleAutoReply,
  onDisconnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: SocialConnection[];
  onConnect: (platform: string, pageId: string, accessToken: string) => void;
  onToggleAutoReply: (connectionId: string, value: boolean) => void;
  onDisconnect: (connectionId: string) => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<
    "instagram" | "facebook"
  >("instagram");
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const igConnection = connections.find((c) => c.platform === "instagram");
  const fbConnection = connections.find((c) => c.platform === "facebook");

  const handleConnect = () => {
    if (!pageId.trim() || !accessToken.trim()) {
      toast.error("Моля попълнете всички полета");
      return;
    }
    onConnect(selectedPlatform, pageId.trim(), accessToken.trim());
    setPageId("");
    setAccessToken("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки на социални мрежи
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Existing connections */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Свързани платформи
            </p>

            {/* Instagram connection */}
            <Card
              className={cn(
                igConnection?.is_active
                  ? "border-pink-500/20 bg-pink-500/5"
                  : "border-dashed"
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-xl shrink-0",
                    igConnection?.is_active ? "bg-pink-500/10" : "bg-muted"
                  )}
                >
                  <Instagram
                    className={cn(
                      "h-5 w-5",
                      igConnection?.is_active
                        ? "text-pink-500"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Instagram</p>
                  {igConnection?.is_active ? (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Свързан
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Авто-отговор
                        </span>
                        <Switch
                          checked={igConnection.auto_reply}
                          onCheckedChange={(v) =>
                            onToggleAutoReply(igConnection.id, v)
                          }
                          className="scale-75"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Не е свързан
                    </p>
                  )}
                </div>
                {igConnection?.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => onDisconnect(igConnection.id)}
                  >
                    Прекъсни
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Facebook connection */}
            <Card
              className={cn(
                fbConnection?.is_active
                  ? "border-blue-500/20 bg-blue-500/5"
                  : "border-dashed"
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-xl shrink-0",
                    fbConnection?.is_active ? "bg-blue-500/10" : "bg-muted"
                  )}
                >
                  <Facebook
                    className={cn(
                      "h-5 w-5",
                      fbConnection?.is_active
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Facebook</p>
                  {fbConnection?.is_active ? (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Свързан
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Авто-отговор
                        </span>
                        <Switch
                          checked={fbConnection.auto_reply}
                          onCheckedChange={(v) =>
                            onToggleAutoReply(fbConnection.id, v)
                          }
                          className="scale-75"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Не е свързан
                    </p>
                  )}
                </div>
                {fbConnection?.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => onDisconnect(fbConnection.id)}
                  >
                    Прекъсни
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Connect new */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Свържи нова платформа
            </p>

            <Tabs
              value={selectedPlatform}
              onValueChange={(v) =>
                setSelectedPlatform(v as "instagram" | "facebook")
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="instagram" className="gap-2">
                  <Instagram className="h-4 w-4" /> Instagram
                </TabsTrigger>
                <TabsTrigger value="facebook" className="gap-2">
                  <Facebook className="h-4 w-4" /> Facebook
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Page ID</Label>
                <Input
                  placeholder={
                    selectedPlatform === "instagram"
                      ? "Instagram Business Account ID"
                      : "Facebook Page ID"
                  }
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  placeholder="Поставете вашия access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Получете токен от Meta Business Suite &gt; Settings &gt; API
                </p>
              </div>
              <Button className="w-full gap-2" onClick={handleConnect}>
                <Link2 className="h-4 w-4" />
                Свържи{" "}
                {selectedPlatform === "instagram" ? "Instagram" : "Facebook"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="relative inline-block mb-6">
          <div className="p-6 rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-card border border-border">
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </div>
        </div>

        <h2 className="text-xl font-display font-bold mb-2">
          Социална пощенска кутия
        </h2>
        <p className="text-muted-foreground mb-6">
          Свържете Instagram и Facebook за да управлявате всички съобщения от
          едно място. AI асистентът ще отговаря автоматично на клиентите ви.
        </p>

        <div className="grid gap-3 text-left mb-6">
          {[
            {
              icon: Instagram,
              color: "text-pink-500",
              bg: "bg-pink-500/10",
              title: "Instagram DM",
              desc: "Автоматични отговори на директни съобщения и story реакции",
            },
            {
              icon: Facebook,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
              title: "Facebook Messenger",
              desc: "Управлявайте чат съобщенията от вашата Facebook страница",
            },
            {
              icon: Bot,
              color: "text-purple-500",
              bg: "bg-purple-500/10",
              title: "AI авто-отговори",
              desc: "Интелигентни отговори 24/7 базирани на вашия бизнес",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className="border-dashed">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl shrink-0", item.bg)}>
                    <item.icon className={cn("h-4 w-4", item.color)} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button className="gap-2" onClick={onOpenSettings}>
          <Plus className="h-4 w-4" />
          Свържи платформа
        </Button>
      </motion.div>
    </div>
  );
}

// ==================== Main Page ====================

export default function SocialInboxPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Fetch connections
  const { data: connections = [] } = useQuery({
    queryKey: ["social_connections", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_connections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SocialConnection[];
    },
    enabled: !!user,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["social_conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["social_messages", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data, error } = await (supabase as any)
        .from("social_messages")
        .select("*")
        .eq("conversation_id", selectedConvId)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!selectedConvId,
  });

  const selectedConversation =
    conversations.find((c) => c.id === selectedConvId) || null;

  // Connect platform
  const connectPlatform = useMutation({
    mutationFn: async ({
      platform,
      pageId,
      accessToken,
    }: {
      platform: string;
      pageId: string;
      accessToken: string;
    }) => {
      const { error } = await (supabase as any)
        .from("social_connections")
        .upsert(
          {
            platform,
            page_id: pageId,
            access_token: accessToken,
            is_active: true,
            auto_reply: true,
          },
          { onConflict: "organization_id,platform" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_connections"] });
      toast.success("Платформата е свързана успешно!");
    },
    onError: () => toast.error("Грешка при свързване"),
  });

  // Toggle auto-reply
  const toggleAutoReply = useMutation({
    mutationFn: async ({
      id,
      value,
    }: {
      id: string;
      value: boolean;
    }) => {
      const { error } = await (supabase as any)
        .from("social_connections")
        .update({ auto_reply: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_connections"] });
      toast.success("Настройката е обновена");
    },
  });

  // Disconnect platform
  const disconnectPlatform = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("social_connections")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_connections"] });
      toast.success("Платформата е изключена");
    },
  });

  // Send message handler (placeholder)
  const handleSendMessage = (text: string) => {
    toast("Изпращането на съобщения ще бъде налично след свързване с Meta API");
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    setShowMobileChat(true);
  };

  const hasAnyConnection = connections.some((c) => c.is_active);

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              Социална кутия
            </h1>
            <p className="text-muted-foreground mt-1">
              Управлявай съобщенията от Instagram и Facebook
            </p>
          </div>
        </div>

        {/* Stats */}
        <StatsBar connections={connections} />

        {/* Connection status */}
        <ConnectionStatusBar
          connections={connections}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Main content */}
        {!hasAnyConnection && conversations.length === 0 ? (
          <Card className="min-h-[500px] flex">
            <EmptyState onOpenSettings={() => setSettingsOpen(true)} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="flex h-[600px]">
              {/* Sidebar - conversation list */}
              <div
                className={cn(
                  "w-full md:w-80 lg:w-96 border-r border-border flex flex-col",
                  showMobileChat && "hidden md:flex"
                )}
              >
                {/* Search & filter */}
                <div className="p-3 space-y-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Търси разговори..."
                      className="pl-9 rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Tabs
                    value={platformFilter}
                    onValueChange={setPlatformFilter}
                  >
                    <TabsList className="w-full grid grid-cols-3 h-8">
                      <TabsTrigger value="all" className="text-xs h-7">
                        Всички
                      </TabsTrigger>
                      <TabsTrigger value="instagram" className="text-xs h-7 gap-1">
                        <Instagram className="h-3 w-3" /> IG
                      </TabsTrigger>
                      <TabsTrigger value="facebook" className="text-xs h-7 gap-1">
                        <Facebook className="h-3 w-3" /> FB
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Conversation list */}
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    <ConversationList
                      conversations={conversations}
                      selectedId={selectedConvId}
                      onSelect={handleSelectConversation}
                      platformFilter={platformFilter}
                      searchQuery={searchQuery}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Chat area */}
              <div
                className={cn(
                  "flex-1 flex flex-col",
                  !showMobileChat && "hidden md:flex"
                )}
              >
                <ChatView
                  conversation={selectedConversation}
                  messages={messages}
                  onSend={handleSendMessage}
                  onBack={() => setShowMobileChat(false)}
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Settings Dialog */}
      <ConnectPlatformDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connections={connections}
        onConnect={(platform, pageId, accessToken) =>
          connectPlatform.mutate({ platform, pageId, accessToken })
        }
        onToggleAutoReply={(id, value) =>
          toggleAutoReply.mutate({ id, value })
        }
        onDisconnect={(id) => disconnectPlatform.mutate(id)}
      />
    </MainLayout>
  );
}
