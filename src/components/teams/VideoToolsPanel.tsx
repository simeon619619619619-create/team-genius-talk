import { useState } from "react";
import { Scissors, Crop, Type, Gauge, Palette, Film, Image, FileText, Merge, Volume2, FolderOpen, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
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

// ─── Google Drive Link Section ───
function DriveSection({ onSendToChat }: { onSendToChat: (msg: string) => void }) {
  const [driveLink, setDriveLink] = useState("");
  const [savedLink, setSavedLink] = useState<string | null>(() => {
    try { return localStorage.getItem("simora_drive_link"); } catch { return null; }
  });
  const [fileList, setFileList] = useState("");

  const handleSaveLink = () => {
    if (!driveLink.trim()) return;
    localStorage.setItem("simora_drive_link", driveLink.trim());
    setSavedLink(driveLink.trim());
    setDriveLink("");
    toast.success("Google Drive папката е свързана!");
  };

  const handleDisconnect = () => {
    localStorage.removeItem("simora_drive_link");
    localStorage.removeItem("simora_drive_files");
    setSavedLink(null);
    setFileList("");
    toast.success("Google Drive е изключен");
  };

  const handleSaveFiles = () => {
    if (!fileList.trim()) return;
    localStorage.setItem("simora_drive_files", fileList.trim());
    toast.success("Файловете са запазени!");
  };

  const savedFiles = (() => {
    try { return localStorage.getItem("simora_drive_files") || ""; } catch { return ""; }
  })();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/5">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <FolderOpen className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">Google Drive</h4>
          <p className="text-xs text-muted-foreground">
            {savedLink ? "Папка свързана" : "Свържи папка с видео файлове"}
          </p>
        </div>
        {savedLink && (
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={savedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Отвори
            </a>
            <span className="text-muted-foreground/30">|</span>
            <button onClick={handleDisconnect} className="text-xs text-red-400 hover:underline">
              Изключи
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 space-y-3">
        {!savedLink ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Paste-ни линк към Google Drive папка с видео файлове:</p>
            <div className="flex gap-2">
              <Input
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="h-9 bg-secondary/50 text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveLink(); }}
              />
              <Button size="sm" onClick={handleSaveLink} disabled={!driveLink.trim()} className="text-xs shrink-0">
                Свържи
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Напиши имената на файловете от папката (по едно на ред).
              Ще ги ползваш в инструментите по-долу:
            </p>
            <textarea
              value={fileList || savedFiles}
              onChange={(e) => setFileList(e.target.value)}
              placeholder={"intro_clip.mp4\nbroll_office.mp4\ninterview_raw.mp4\nlogo_animation.mov"}
              rows={4}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveFiles} className="text-xs flex-1">
                Запази файлове
              </Button>
              <Button
                size="sm"
                onClick={() => onSendToChat(`Ето файловете от моя Google Drive:\n\n${fileList || savedFiles}\n\nНапиши ми сценарий за Reels видео (30 сек) и кажи кои файлове за кой кадър.`)}
                className="text-xs flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={!(fileList || savedFiles).trim()}
              >
                Генерирай сценарий
              </Button>
            </div>
          </div>
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
      {/* Google Drive */}
      <DriveSection onSendToChat={onSendToChat} />

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
