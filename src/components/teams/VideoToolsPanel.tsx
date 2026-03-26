import { useState, useRef } from "react";
import { Scissors, Crop, Type, Gauge, Palette, Film, Image, FileText, Merge, Volume2, FolderOpen, Copy, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Video Tool Definitions ───
interface VideoTool {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  fields: ToolField[];
  generateCommand: (values: Record<string, string>) => string;
}

interface ToolField {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
}

const VIDEO_TOOLS: VideoTool[] = [
  {
    id: "trim",
    icon: <Scissors className="h-5 w-5" />,
    title: "Изрязване",
    description: "Изрежи част от видео",
    color: "#f43f5e",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      { key: "start", label: "Начало", placeholder: "00:00:05", defaultValue: "00:00:00" },
      { key: "end", label: "Край", placeholder: "00:00:30", defaultValue: "00:00:30" },
      { key: "output", label: "Изходен файл", placeholder: "trimmed.mp4", defaultValue: "trimmed.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -ss ${v.start} -to ${v.end} -c copy "${v.output}"`,
  },
  {
    id: "crop",
    icon: <Crop className="h-5 w-5" />,
    title: "Crop 9:16",
    description: "За Reels / TikTok / Stories",
    color: "#8b5cf6",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      {
        key: "format", label: "Формат", placeholder: "9:16", type: "select",
        options: [
          { value: "crop=ih*9/16:ih", label: "9:16 (Reels/TikTok)" },
          { value: "crop=ih:ih", label: "1:1 (Feed квадрат)" },
          { value: "crop=iw:iw*9/16", label: "16:9 (YouTube)" },
          { value: "crop=ih*4/5:ih", label: "4:5 (Instagram Portrait)" },
        ],
        defaultValue: "crop=ih*9/16:ih",
      },
      { key: "output", label: "Изходен файл", placeholder: "cropped.mp4", defaultValue: "reels_crop.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vf "${v.format}" -c:a copy "${v.output}"`,
  },
  {
    id: "subtitles",
    icon: <Type className="h-5 w-5" />,
    title: "Субтитри",
    description: "Добави субтитри от .srt файл",
    color: "#06b6d4",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      { key: "srt", label: "SRT файл", placeholder: "subtitles.srt" },
      { key: "output", label: "Изходен файл", placeholder: "subtitled.mp4", defaultValue: "subtitled.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vf "subtitles=${v.srt}" -c:a copy "${v.output}"`,
  },
  {
    id: "text",
    icon: <FileText className="h-5 w-5" />,
    title: "Текст Overlay",
    description: "Добави текст върху видео",
    color: "#f59e0b",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      { key: "text", label: "Текст", placeholder: "Вашият текст тук" },
      { key: "size", label: "Размер шрифт", placeholder: "48", defaultValue: "48" },
      { key: "color", label: "Цвят", placeholder: "white", defaultValue: "white" },
      { key: "output", label: "Изходен файл", placeholder: "with_text.mp4", defaultValue: "with_text.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vf "drawtext=text='${v.text}':fontsize=${v.size}:fontcolor=${v.color}:x=(w-tw)/2:y=h-th-100:borderw=2:bordercolor=black" -c:a copy "${v.output}"`,
  },
  {
    id: "speed",
    icon: <Gauge className="h-5 w-5" />,
    title: "Скорост",
    description: "Ускори или забави видео",
    color: "#22c55e",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      {
        key: "speed", label: "Скорост", placeholder: "2x", type: "select",
        options: [
          { value: "0.25", label: "0.25x (Много бавно)" },
          { value: "0.5", label: "0.5x (Бавно)" },
          { value: "1.5", label: "1.5x (Бързо)" },
          { value: "2", label: "2x (Много бързо)" },
          { value: "3", label: "3x (Ултра бързо)" },
        ],
        defaultValue: "2",
      },
      { key: "output", label: "Изходен файл", placeholder: "fast.mp4", defaultValue: "speed.mp4" },
    ],
    generateCommand: (v) => {
      const speed = parseFloat(v.speed);
      const pts = (1 / speed).toFixed(4);
      const atempo = speed <= 2 ? `atempo=${speed}` : `atempo=2.0,atempo=${(speed / 2).toFixed(1)}`;
      return `ffmpeg -i "${v.input}" -vf "setpts=${pts}*PTS" -af "${atempo}" "${v.output}"`;
    },
  },
  {
    id: "color",
    icon: <Palette className="h-5 w-5" />,
    title: "Цветова корекция",
    description: "Яркост, контраст, насищане",
    color: "#ec4899",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      { key: "brightness", label: "Яркост (-1 до 1)", placeholder: "0.1", defaultValue: "0.06" },
      { key: "contrast", label: "Контраст (0-2)", placeholder: "1.3", defaultValue: "1.2" },
      { key: "saturation", label: "Насищане (0-3)", placeholder: "1.4", defaultValue: "1.3" },
      { key: "output", label: "Изходен файл", placeholder: "corrected.mp4", defaultValue: "color_corrected.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vf "eq=brightness=${v.brightness}:contrast=${v.contrast}:saturation=${v.saturation}" -c:a copy "${v.output}"`,
  },
  {
    id: "compress",
    icon: <Film className="h-5 w-5" />,
    title: "Компресия",
    description: "Намали размера на файла",
    color: "#3b82f6",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      {
        key: "quality", label: "Качество", placeholder: "Средно", type: "select",
        options: [
          { value: "18", label: "Високо (по-голям файл)" },
          { value: "23", label: "Средно (баланс)" },
          { value: "28", label: "Ниско (малък файл)" },
          { value: "32", label: "Минимум (за preview)" },
        ],
        defaultValue: "23",
      },
      { key: "output", label: "Изходен файл", placeholder: "compressed.mp4", defaultValue: "compressed.mp4" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vcodec libx264 -crf ${v.quality} -preset veryfast -c:a aac -b:a 128k "${v.output}"`,
  },
  {
    id: "thumbnails",
    icon: <Image className="h-5 w-5" />,
    title: "Thumbnails",
    description: "Извлечи кадри от видео",
    color: "#14b8a6",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      { key: "interval", label: "На всеки (секунди)", placeholder: "10", defaultValue: "10" },
      { key: "output", label: "Шаблон за имена", placeholder: "thumb_%03d.jpg", defaultValue: "thumb_%03d.jpg" },
    ],
    generateCommand: (v) => `ffmpeg -i "${v.input}" -vf "fps=1/${v.interval},scale=640:-1" "${v.output}"`,
  },
  {
    id: "merge",
    icon: <Merge className="h-5 w-5" />,
    title: "Обедини видеа",
    description: "Concat няколко клипа в едно",
    color: "#f97316",
    fields: [
      { key: "files", label: "Файлове (по един на ред)", placeholder: "clip1.mp4\nclip2.mp4\nclip3.mp4" },
      { key: "output", label: "Изходен файл", placeholder: "merged.mp4", defaultValue: "merged.mp4" },
    ],
    generateCommand: (v) => {
      const files = v.files.split("\n").filter(Boolean).map(f => `file '${f.trim()}'`).join("\\n");
      return `echo -e "${files}" > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy "${v.output}"`;
    },
  },
  {
    id: "audio",
    icon: <Volume2 className="h-5 w-5" />,
    title: "Извлечи аудио",
    description: "Извади аудио от видео файл",
    color: "#a855f7",
    fields: [
      { key: "input", label: "Входен файл", placeholder: "video.mp4" },
      {
        key: "format", label: "Формат", placeholder: "mp3", type: "select",
        options: [
          { value: "mp3", label: "MP3" },
          { value: "wav", label: "WAV" },
          { value: "aac", label: "AAC" },
        ],
        defaultValue: "mp3",
      },
      { key: "output", label: "Изходен файл", placeholder: "audio.mp3", defaultValue: "audio.mp3" },
    ],
    generateCommand: (v) => {
      if (v.format === "wav") return `ffmpeg -i "${v.input}" -vn -acodec pcm_s16le "${v.output}"`;
      if (v.format === "aac") return `ffmpeg -i "${v.input}" -vn -c:a aac -b:a 192k "${v.output}"`;
      return `ffmpeg -i "${v.input}" -vn -acodec libmp3lame -b:a 192k "${v.output}"`;
    },
  },
];

// ─── Tool Card Component ───
function ToolCard({ tool, onSendToChat }: { tool: VideoTool; onSendToChat: (cmd: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    tool.fields.forEach(f => { init[f.key] = f.defaultValue || ""; });
    return init;
  });
  const [copied, setCopied] = useState(false);

  const command = tool.generateCommand(values);
  const hasRequired = tool.fields.every(f => f.defaultValue || values[f.key]?.trim());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Командата е копирана!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-all hover:border-purple-400/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: tool.color + "20", color: tool.color }}>
          {tool.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{tool.title}</h4>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
          {tool.fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.type === "select" ? (
                <select
                  value={values[field.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.key === "files" ? (
                <textarea
                  value={values[field.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
                />
              ) : (
                <Input
                  value={values[field.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="h-9 bg-secondary/50 text-sm"
                />
              )}
            </div>
          ))}

          {/* Generated command */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Генерирана команда</Label>
            <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs text-green-400 break-all select-all">
              {command}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} className="flex-1 gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Копирано" : "Копирай"}
            </Button>
            <Button
              size="sm"
              onClick={() => onSendToChat(`Изпълни тази команда и обясни какво прави:\n\n\`${command}\``)}
              className="flex-1 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
            >
              Попитай Симона
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Folder / Files Section ───
function FolderSection({ onSendToChat }: { onSendToChat: (msg: string) => void }) {
  const [files, setFiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("simora_drive_files");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [folderPath, setFolderPath] = useState<string>(() => {
    try { return localStorage.getItem("simora_folder_path") || ""; } catch { return ""; }
  });
  const [driveLink, setDriveLink] = useState<string>(() => {
    try { return localStorage.getItem("simora_drive_link") || ""; } catch { return ""; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [manualText, setManualText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveFiles = (newFiles: string[], path?: string, link?: string) => {
    setFiles(newFiles);
    localStorage.setItem("simora_drive_files", JSON.stringify(newFiles));
    if (path !== undefined) {
      setFolderPath(path);
      localStorage.setItem("simora_folder_path", path);
    }
    if (link !== undefined) {
      setDriveLink(link);
      localStorage.setItem("simora_drive_link", link);
    }
  };

  // Use File System Access API to pick a local folder
  const handlePickFolder = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: "read" });
      setIsLoading(true);
      const fileNames: string[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file") {
          const name: string = entry.name;
          if (/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|aac|jpg|jpeg|png|gif|srt|ass|vtt)$/i.test(name)) {
            fileNames.push(name);
          }
        }
      }
      fileNames.sort();
      saveFiles(fileNames, dirHandle.name, "");
      toast.success(`${fileNames.length} файла от "${dirHandle.name}"`);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Браузърът не поддържа избор на папка. Опитай Google Drive или добави ръчно.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Pick individual files via <input type="file">
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const names = selected.map(f => f.name);
    saveFiles([...files, ...names], `${names.length} файла избрани`);
    toast.success(`${names.length} файла добавени`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = Array.from(e.dataTransfer.files);
    if (items.length === 0) return;
    const mediaFiles = items.filter(f =>
      /\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|aac|jpg|jpeg|png|gif|srt|ass|vtt)$/i.test(f.name)
    );
    const names = mediaFiles.map(f => f.name);
    saveFiles([...files, ...names], `${names.length} файла (drag & drop)`);
    toast.success(`${names.length} файла добавени`);
  };

  // Save Google Drive link
  const handleSaveDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    saveFiles(files, folderPath || "Google Drive", driveLinkInput.trim());
    setShowDriveInput(false);
    setDriveLinkInput("");
    toast.success("Google Drive папката е свързана!");
  };

  // Manual paste of file names
  const handleManualAdd = () => {
    if (!manualText.trim()) return;
    const newFiles = manualText.split("\n").map(f => f.trim()).filter(Boolean);
    saveFiles(newFiles, "Ръчно добавени");
    setManualText("");
  };

  const handleClear = () => {
    setFiles([]);
    setFolderPath("");
    setDriveLink("");
    localStorage.removeItem("simora_drive_files");
    localStorage.removeItem("simora_folder_path");
    localStorage.removeItem("simora_drive_link");
    toast.success("Изчистено");
  };

  const videoFiles = files.filter(f => /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(f));
  const audioFiles = files.filter(f => /\.(mp3|wav|aac)$/i.test(f));
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
  const subtitleFiles = files.filter(f => /\.(srt|ass|vtt)$/i.test(f));

  // Source label
  const sourceLabel = driveLink ? "Google Drive" : folderPath || "";

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <FolderOpen className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">Моите кадри</h4>
          <p className="text-xs text-muted-foreground">
            {files.length > 0
              ? `${files.length} файла${sourceLabel ? ` — ${sourceLabel}` : ""}`
              : "Добави кадри от компютър, Google Drive или ръчно"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {driveLink && (
            <a href={driveLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">
              Drive
            </a>
          )}
          {files.length > 0 && (
            <button onClick={handleClear} className="text-[10px] text-red-400 hover:underline">
              Изчисти
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*,.srt,.ass,.vtt"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="px-4 pb-4 pt-3 space-y-3">
        {files.length === 0 ? (
          <>
            {/* Drag & drop zone + click to select files */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-border hover:border-amber-400 hover:bg-amber-500/5"
              }`}
            >
              <Film className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-medium">Пусни файлове тук или натисни за избор</p>
              <p className="text-xs text-muted-foreground">Видео, снимки, аудио, субтитри</p>
            </div>

            {/* Additional options */}
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                onClick={handlePickFolder}
                disabled={isLoading}
                className="flex-1 text-xs gap-1.5"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                Цяла папка
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => setShowDriveInput(!showDriveInput)}
                className="flex-1 text-xs gap-1.5"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="M8.267 14.68l-1.605 2.776H20.09l1.605-2.776H8.267z" fill="#4285f4"/>
                  <path d="M14.635 3.275l-5.406 9.368 1.604 2.776 5.406-9.368-1.604-2.776z" fill="#ea4335"/>
                  <path d="M2.306 17.456l1.604 2.776 5.406-9.368-1.604-2.776L2.306 17.456z" fill="#fbbc04"/>
                </svg>
                Google Drive
              </Button>
            </div>

            {/* Google Drive link input */}
            {showDriveInput && (
              <div className="space-y-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">Линк към Google Drive папка:</p>
                <div className="flex gap-2">
                  <Input
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="h-9 bg-secondary/50 text-sm flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveDriveLink(); }}
                  />
                  <Button size="sm" onClick={handleSaveDriveLink} disabled={!driveLinkInput.trim()} className="text-xs shrink-0">
                    Свържи
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  След свързване, добави имената на файловете от папката отдолу или с drag & drop
                </p>
              </div>
            )}

            {/* Manual file names — collapsible */}
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                Или напиши имената ръчно
              </summary>
              <div className="mt-2 space-y-1.5">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={"intro_clip.mp4\nbroll_office.mp4\ninterview_raw.mp4"}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                />
                <Button size="sm" onClick={handleManualAdd} disabled={!manualText.trim()} className="w-full text-xs">
                  Добави
                </Button>
              </div>
            </details>
          </>
        ) : (
          <>
            {/* File summary badges */}
            <div className="flex flex-wrap gap-2">
              {videoFiles.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
                  {videoFiles.length} видео
                </span>
              )}
              {imageFiles.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                  {imageFiles.length} снимки
                </span>
              )}
              {audioFiles.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                  {audioFiles.length} аудио
                </span>
              )}
              {subtitleFiles.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">
                  {subtitleFiles.length} субтитри
                </span>
              )}
            </div>

            {/* File list */}
            <div className="max-h-28 overflow-y-auto rounded-lg bg-zinc-900/80 p-2 space-y-0.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-0.5 text-xs font-mono text-zinc-300">
                  <span className="text-zinc-500">{i + 1}.</span>
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={handlePickFolder} className="text-xs gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Смени източник
              </Button>
              <Button
                size="sm"
                onClick={() => onSendToChat(
                  `Ето моите налични кадри:\n\n${files.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nАнализирай файловете и:\n1. Предложи какво съдържание мога да направя от тях (Reels, постове, Stories)\n2. За всяко — кой файл за кой кадър\n3. Кажи какви ДОПЪЛНИТЕЛНИ кадри ми трябват за пълна седмица контент`
                )}
                className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700"
              >
                Анализирай кадри
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───
interface VideoToolsPanelProps {
  onSendToChat: (message: string) => void;
}

export function VideoToolsPanel({ onSendToChat }: VideoToolsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {/* Folder / Files */}
      <FolderSection onSendToChat={onSendToChat} />

      {/* Tools grid */}
      <div className="space-y-2">
        {VIDEO_TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onSendToChat={onSendToChat} />
        ))}
      </div>

      {/* Complex processes hint */}
      <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          За по-сложни процеси (монтаж, сценарии, batch обработка) използвай <strong>Чат</strong> таба
        </p>
      </div>
    </div>
  );
}
