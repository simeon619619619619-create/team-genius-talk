import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import {
  FolderOpen, Play, X, AlertTriangle, Palette
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useNavigate } from "react-router-dom";

export default function VideoPage() {
  const [folderFiles, setFolderFiles] = useState<string[]>([]);
  const [hasBrandPlan, setHasBrandPlan] = useState<boolean | null>(null);
  const { projectId } = useCurrentProject();
  const navigate = useNavigate();

  // Check if business plan exists
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data } = await supabase
        .from("business_plans")
        .select("id")
        .eq("project_id", projectId)
        .limit(1);
      setHasBrandPlan(data && data.length > 0);
    })();
  }, [projectId]);

  // Build extra context string from folder files
  const extraContext = useMemo(() => {
    if (folderFiles.length === 0) return undefined;
    const videoFiles = folderFiles.filter(f => /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f));
    const imageFiles = folderFiles.filter(f => /\.(jpg|jpeg|png|heic|arw|raw)$/i.test(f));
    const otherFiles = folderFiles.filter(f => !videoFiles.includes(f) && !imageFiles.includes(f));
    let ctx = "";
    if (videoFiles.length > 0) ctx += `Видеа (${videoFiles.length}):\n${videoFiles.map(f => `  - ${f}`).join("\n")}\n`;
    if (imageFiles.length > 0) ctx += `Снимки (${imageFiles.length}):\n${imageFiles.map(f => `  - ${f}`).join("\n")}\n`;
    if (otherFiles.length > 0) ctx += `Други (${otherFiles.length}):\n${otherFiles.map(f => `  - ${f}`).join("\n")}\n`;
    return ctx;
  }, [folderFiles]);

  // File System Access API - pick folder
  const openFolder = useCallback(async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "read" });
      const files: string[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file") {
          const name = entry.name as string;
          if (/\.(mp4|mov|avi|webm|mkv|m4v|jpg|jpeg|png|heic|arw|raw|gif|srt)$/i.test(name)) {
            files.push(name);
          }
        }
      }
      files.sort();
      setFolderFiles(files);
      if (files.length > 0) {
        const vids = files.filter(f => /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f)).length;
        const imgs = files.filter(f => /\.(jpg|jpeg|png|heic|arw|raw|gif)$/i.test(f)).length;
        toast.success(`${vids} видеа, ${imgs} снимки — ботът ги вижда`);
      } else {
        toast.info("Няма медийни файлове в тази папка");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error("Браузърът не поддържа достъп до папки. Използвай Chrome.");
      }
    }
  }, []);

  const clearFolder = useCallback(() => {
    setFolderFiles([]);
  }, []);

  const vidCount = folderFiles.filter(f => /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f)).length;
  const imgCount = folderFiles.filter(f => /\.(jpg|jpeg|png|heic|arw|raw|gif)$/i.test(f)).length;

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Brand plan warning */}
        {hasBrandPlan === false && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Нямаш маркетинг план</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Създай първо маркетинг и брандинг план — за да знае ботът какви цветове, шрифтове и стил да използва.
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => navigate("/business-plan")}>
              <Palette className="h-3.5 w-3.5" /> Създай план
            </Button>
          </div>
        )}

        {/* Main chat area */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header with folder controls */}
          <div className="border-b border-border px-4 py-3 flex items-center gap-3">
            <Play className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Видео обработка</h2>

            <div className="ml-auto flex items-center gap-2">
              {folderFiles.length > 0 ? (
                <>
                  <span className="text-[11px] text-emerald-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {vidCount} видеа, {imgCount} снимки
                  </span>
                  <button onClick={clearFolder} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">Отвори папка за да виждам файлове</span>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={openFolder}>
                <FolderOpen className="h-3.5 w-3.5" />
                {folderFiles.length > 0 ? "Смени" : "Папка"}
              </Button>
            </div>
          </div>

          {/* Chat - full height */}
          <div className="h-[calc(100vh-180px)] min-h-[500px]">
            <ChatInterface context="video" extraContext={extraContext} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
