import { useState, useRef } from "react";
import { Plus, Image, Video, Calendar, Edit2, Trash2, Upload, X, Play } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { bg } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContentPost {
  id: string;
  business_plan_id: string;
  post_date: string;
  title: string | null;
  description: string | null;
  media_type: "image" | "video";
  media_url: string;
  platform: string | null;
  status: "draft" | "scheduled" | "published";
  created_at: string;
}

interface ContentPostsSectionProps {
  businessPlanId: string | null;
  weekNumber: number;
  year: number;
  posts: ContentPost[];
  onPostsUpdate: (posts: ContentPost[]) => void;
}

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Друго" },
];

const statusOptions = [
  { value: "draft", label: "Чернова" },
  { value: "scheduled", label: "Планиран" },
  { value: "published", label: "Публикуван" },
];

// Get the dates for a given week number
function getWeekDates(year: number, weekNumber: number) {
  // Calculate the first day of the year
  const firstDayOfYear = new Date(year, 0, 1);
  // Calculate the first Monday of the year
  const dayOfWeek = firstDayOfYear.getDay();
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  const firstMonday = addDays(firstDayOfYear, daysToFirstMonday);
  // Calculate the Monday of the target week
  const targetMonday = addDays(firstMonday, (weekNumber - 1) * 7);
  
  return Array.from({ length: 7 }, (_, i) => addDays(targetMonday, i));
}

export function ContentPostsSection({
  businessPlanId,
  weekNumber,
  year,
  posts,
  onPostsUpdate,
}: ContentPostsSectionProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [postDate, setPostDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [platform, setPlatform] = useState("instagram");
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">("draft");

  const weekDates = getWeekDates(year, weekNumber);

  const resetForm = () => {
    setPostDate("");
    setTitle("");
    setDescription("");
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType("image");
    setPlatform("instagram");
    setStatus("draft");
    setEditingPost(null);
  };

  const handleOpenDialog = (post?: ContentPost) => {
    if (post) {
      setEditingPost(post);
      setPostDate(post.post_date);
      setTitle(post.title || "");
      setDescription(post.description || "");
      setMediaPreview(post.media_url);
      setMediaType(post.media_type);
      setPlatform(post.platform || "instagram");
      setStatus(post.status);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast.error("Поддържат се само изображения и видеа");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Файлът е твърде голям (макс. 50MB)");
      return;
    }

    setMediaFile(file);
    setMediaType(isVideo ? "video" : "image");
    setMediaPreview(URL.createObjectURL(file));
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("content-posts")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      toast.error("Грешка при качване на файла");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("content-posts")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!businessPlanId) {
      toast.error("Първо запазете бизнес плана");
      return;
    }

    if (!postDate) {
      toast.error("Моля, изберете дата");
      return;
    }

    if (!mediaPreview && !mediaFile) {
      toast.error("Моля, качете изображение или видео");
      return;
    }

    setUploading(true);

    try {
      let mediaUrl = editingPost?.media_url || "";

      if (mediaFile) {
        const uploadedUrl = await uploadMedia(mediaFile);
        if (!uploadedUrl) {
          setUploading(false);
          return;
        }
        mediaUrl = uploadedUrl;
      }

      if (editingPost) {
        // Update existing post
        const { data, error } = await supabase
          .from("content_posts")
          .update({
            post_date: postDate,
            title: title || null,
            description: description || null,
            media_url: mediaUrl,
            media_type: mediaType,
            platform,
            status,
          })
          .eq("id", editingPost.id)
          .select()
          .single();

        if (error) throw error;

        onPostsUpdate(
          posts.map((p) => (p.id === editingPost.id ? (data as ContentPost) : p))
        );
        toast.success("Постът е обновен");
      } else {
        // Create new post
        const { data, error } = await supabase
          .from("content_posts")
          .insert({
            business_plan_id: businessPlanId,
            created_by: user?.id,
            post_date: postDate,
            title: title || null,
            description: description || null,
            media_url: mediaUrl,
            media_type: mediaType,
            platform,
            status,
          })
          .select()
          .single();

        if (error) throw error;

        onPostsUpdate([...posts, data as ContentPost]);
        toast.success("Постът е добавен");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Грешка при запазване");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("content_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      onPostsUpdate(posts.filter((p) => p.id !== postId));
      toast.success("Постът е изтрит");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Грешка при изтриване");
    }
  };

  // Group posts by date
  const postsByDate: Record<string, ContentPost[]> = {};
  weekDates.forEach((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    postsByDate[dateStr] = posts.filter((p) => p.post_date === dateStr);
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Съдържание за седмицата
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4" />
                Добави пост
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPost ? "Редактирай пост" : "Нов пост"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Date selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Дата</label>
                  <Select value={postDate} onValueChange={setPostDate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Изберете ден" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDates.map((date) => (
                        <SelectItem
                          key={date.toISOString()}
                          value={format(date, "yyyy-MM-dd")}
                        >
                          {format(date, "EEEE, d MMMM", { locale: bg })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Media upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Изображение / Видео</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {mediaPreview ? (
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      {mediaType === "video" ? (
                        <video
                          src={mediaPreview}
                          className="w-full max-h-[300px] object-contain"
                          controls
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full max-h-[300px] object-contain"
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Кликнете за качване на изображение или видео
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Макс. 50MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Заглавие (опционално)</label>
                  <Input
                    placeholder="Заглавие на поста"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Описание / Текст на поста</label>
                  <Textarea
                    placeholder="Въведете текста, който ще публикувате..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Platform & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Платформа</label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Статус</label>
                    <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Отказ
                  </Button>
                  <Button onClick={handleSave} disabled={uploading}>
                    {uploading ? "Качване..." : editingPost ? "Запази" : "Добави"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weekDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayPosts = postsByDate[dateStr] || [];
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={dateStr}
                className={cn(
                  "border rounded-lg p-3",
                  isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {format(date, "EEEE", { locale: bg })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(date, "d MMM", { locale: bg })}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">
                        Днес
                      </Badge>
                    )}
                  </div>
                  {dayPosts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayPosts.length} {dayPosts.length === 1 ? "пост" : "поста"}
                    </Badge>
                  )}
                </div>

                {dayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Няма планирано съдържание
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex gap-3 p-2 bg-background rounded-lg border"
                      >
                        {/* Media preview */}
                        <div className="relative w-20 h-20 rounded overflow-hidden bg-muted shrink-0">
                          {post.media_type === "video" ? (
                            <>
                              <video
                                src={post.media_url}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                            </>
                          ) : (
                            <img
                              src={post.media_url}
                              alt={post.title || "Post"}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {platformOptions.find((p) => p.value === post.platform)?.label || post.platform}
                            </Badge>
                            <Badge
                              variant={
                                post.status === "published"
                                  ? "default"
                                  : post.status === "scheduled"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {statusOptions.find((s) => s.value === post.status)?.label}
                            </Badge>
                          </div>
                          {post.title && (
                            <p className="font-medium text-sm truncate">{post.title}</p>
                          )}
                          {post.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {post.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenDialog(post)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Изтриване на пост</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Сигурни ли сте, че искате да изтриете този пост?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отказ</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Изтрий
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
