import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Upload, Copy, Check, Scissors, Subtitles, Crop, Package, Image as ImageIcon,
  CloudUpload, Link as LinkIcon, Loader2, Gauge, Music, Film, Type,
  RotateCw, Monitor, VolumeX, FileVideo, Wand2, SunMedium, Sparkles,
  ChevronDown, Layers, Play
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const suggestions = [
  { icon: "✂️", title: "Изрежи клип", prompt: "Имам MP4 файл. Искам да изрежеш от [START] до [END]. Дай ми ffmpeg команда." },
  { icon: "📝", title: "Субтитри SRT", prompt: "Имам MP4. Искам да генерирам SRT субтитри файл на български. Как да го направя?" },
  { icon: "🔥", title: "Burn-in субтитри", prompt: "Имам MP4 и SRT файл. Направи burn-in субтитри с добра четимост." },
  { icon: "📐", title: "Crop за Reels", prompt: "Имам хоризонтално MP4. Crop за Instagram Reels/TikTok (9:16, 1080x1920), centered." },
  { icon: "📦", title: "Компресия", prompt: "Компресирай MP4 за web (H.264, CRF 23, AAC 128k). Дай ffmpeg команда." },
  { icon: "🖼️", title: "Thumbnails", prompt: "Извади 6 thumbnails равномерно от MP4. Дай ffmpeg команда." },
  { icon: "⚡", title: "Промени скорост", prompt: "Искам да ускоря/забавя MP4 2 пъти. Дай ffmpeg команда с видео и аудио." },
  { icon: "🎵", title: "Извлечи аудио", prompt: "Извлечи аудиото от MP4 като MP3 файл с добро качество." },
  { icon: "🎞️", title: "Видео → GIF", prompt: "Конвертирай 5 секунди от MP4 в качествен GIF с palette метода." },
];

function fmtFileName(name: string) {
  return name.replace(/\s+/g, "_");
}

async function copyCmd(text: string, msg = "Командата е копирана!") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    toast.error("Грешка при копиране");
  }
}

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  color?: string;
}

function ToolCard({ icon, title, children, color = "text-primary" }: ToolCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-border/80 hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn("flex-shrink-0", color)}>{icon}</div>
        <span className="font-medium text-sm flex-1">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50 bg-secondary/10">
          {children}
        </div>
      )}
    </div>
  );
}

function CmdBlock({ cmd, label }: { cmd: string; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="relative group">
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-secondary/60 rounded-lg p-3 pr-10 overflow-x-auto font-mono">{cmd}</pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => copyCmd(cmd)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function VideoPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Tool states
  const [cutStart, setCutStart] = useState("00:00:00");
  const [cutEnd, setCutEnd] = useState("00:00:10");
  const [srtName, setSrtName] = useState("subtitles.srt");
  const [speed, setSpeed] = useState("2");
  const [audioFmt, setAudioFmt] = useState("mp3");
  const [gifStart, setGifStart] = useState("00:00:00");
  const [gifDuration, setGifDuration] = useState("5");
  const [gifWidth, setGifWidth] = useState("480");
  const [watermarkText, setWatermarkText] = useState("Simora");
  const [watermarkPos, setWatermarkPos] = useState("br");
  const [rotation, setRotation] = useState("cw");
  const [resolution, setResolution] = useState("1080");
  const [targetFormat, setTargetFormat] = useState("mov");
  const [brightness, setBrightness] = useState([0]);
  const [contrast, setContrast] = useState([1]);
  const [saturation, setSaturation] = useState([1]);
  const [fadeIn, setFadeIn] = useState("2");
  const [fadeOut, setFadeOut] = useState("3");
  const [totalDuration, setTotalDuration] = useState("60");

  const inp = file ? fmtFileName(file.name) : "input.mp4";
  const out = file ? `out_${fmtFileName(file.name)}` : "output.mp4";
  const ff = "/opt/homebrew/bin/ffmpeg";

  // Speed helpers
  const speedNum = parseFloat(speed) || 2;
  const setptsVal = (1 / speedNum).toFixed(4);
  const buildAtempo = (s: number) => {
    if (s >= 0.5 && s <= 2.0) return `atempo=${s}`;
    if (s > 2.0) {
      const parts: string[] = [];
      let rem = s;
      while (rem > 2.0) { parts.push("atempo=2.0"); rem /= 2.0; }
      if (rem > 1.001) parts.push(`atempo=${rem.toFixed(2)}`);
      return parts.join(",");
    }
    const parts: string[] = [];
    let rem = s;
    while (rem < 0.5) { parts.push("atempo=0.5"); rem *= 2; }
    if (rem < 0.999) parts.push(`atempo=${rem.toFixed(2)}`);
    return parts.join(",");
  };

  const posMap: Record<string, string> = {
    tl: "x=20:y=20", tr: "x=w-tw-20:y=20",
    bl: "x=20:y=h-th-20", br: "x=w-tw-20:y=h-th-20",
    center: "x=(w-tw)/2:y=(h-th)/2",
  };

  const rotateMap: Record<string, { filter: string; label: string }> = {
    cw: { filter: "transpose=1", label: "90° по часовника" },
    ccw: { filter: "transpose=2", label: "90° обратно" },
    "180": { filter: "transpose=1,transpose=1", label: "180°" },
    hflip: { filter: "hflip", label: "Огледално хоризонтално" },
    vflip: { filter: "vflip", label: "Огледално вертикално" },
  };

  const formatMap: Record<string, string> = {
    mov: `-c:v copy -c:a copy "${out.replace('.mp4', '.mov')}"`,
    webm: `-c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus "${out.replace('.mp4', '.webm')}"`,
    avi: `-c:v mpeg4 -q:v 5 -c:a libmp3lame "${out.replace('.mp4', '.avi')}"`,
    mkv: `-c copy "${out.replace('.mp4', '.mkv')}"`,
  };

  const fadeDur = parseFloat(totalDuration) || 60;
  const fadeOutStart = fadeDur - (parseFloat(fadeOut) || 3);

  const uploadToCloud = async () => {
    if (!file) { toast.error("Първо избери видео файл"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("Файлът е над 100MB."); return; }
    setIsUploading(true);
    setUploadedUrl("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${userId}/${Date.now()}_${fmtFileName(file.name)}`;
      const { error: uploadErr } = await supabase.storage.from("chat-attachments").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || `video/${ext}` });
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      if (!publicData?.publicUrl) throw new Error("No public URL");
      setUploadedUrl(publicData.publicUrl);
      toast.success("Качено! Линкът е готов.");
    } catch (e: any) {
      toast.error(e?.message || "Грешка при качване");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyPrompt = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIdx(index);
      toast.success("Промптът е копиран!");
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { toast.error("Грешка при копиране"); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Видео обработка
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            17 инструмента за видео — изрязване, ефекти, субтитри, конвертиране и още. Готови ffmpeg команди.
          </p>
        </div>

        {/* Upload */}
        <Card className="rounded-2xl border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Input type="file" accept="video/*" className="hidden" id="video-upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); toast.success(`Файл: ${f.name}`); }
              }}
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-sm">Избери видео файл</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, AVI, WebM (до 100MB за upload)</p>
              {file && (
                <div className="text-xs text-foreground/80 mt-1 space-y-2 text-center">
                  <p>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-muted-foreground"> ({Math.round(file.size / 1024 / 1024)}MB)</span>
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button type="button" variant="secondary" size="sm" disabled={isUploading}
                      onClick={(e) => { e.preventDefault(); uploadToCloud(); }} className="gap-1.5">
                      {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
                      Качи в облака
                    </Button>
                    {uploadedUrl && (
                      <Button type="button" variant="outline" size="sm"
                        onClick={(e) => { e.preventDefault(); copyCmd(uploadedUrl, "Линкът е копиран!"); }} className="gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5" /> Копирай линк
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </label>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tools Column */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Основни</h2>

            {/* 1. Cut */}
            <ToolCard icon={<Scissors className="h-4.5 w-4.5" />} title="Изрязване" color="text-red-500">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[11px]">Начало</Label><Input value={cutStart} onChange={e => setCutStart(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[11px]">Край</Label><Input value={cutEnd} onChange={e => setCutEnd(e.target.value)} className="h-8 text-xs" /></div>
              </div>
              <CmdBlock cmd={`${ff} -i "${inp}" -ss ${cutStart} -to ${cutEnd} -c copy "cut_${out}"`} />
            </ToolCard>

            {/* 2. Crop */}
            <ToolCard icon={<Crop className="h-4.5 w-4.5" />} title="Crop за Reels/TikTok (9:16)" color="text-purple-500">
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "crop=ih*9/16:ih" -c:a copy "crop_${out}"`} />
            </ToolCard>

            {/* 3. Rotate */}
            <ToolCard icon={<RotateCw className="h-4.5 w-4.5" />} title="Завъртане / Обръщане" color="text-cyan-500">
              <Select value={rotation} onValueChange={setRotation}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(rotateMap).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "${rotateMap[rotation].filter}" -c:a copy "rotated_${out}"`} />
            </ToolCard>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Качество и размер</h2>

            {/* 4. Compress */}
            <ToolCard icon={<Package className="h-4.5 w-4.5" />} title="Компресия (H.264)" color="text-orange-500">
              <CmdBlock cmd={`${ff} -i "${inp}" -vcodec libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k "compress_${out}"`} />
            </ToolCard>

            {/* 5. Resolution */}
            <ToolCard icon={<Monitor className="h-4.5 w-4.5" />} title="Промяна на резолюция" color="text-indigo-500">
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="480" className="text-xs">480p</SelectItem>
                  <SelectItem value="720" className="text-xs">720p</SelectItem>
                  <SelectItem value="1080" className="text-xs">1080p (Full HD)</SelectItem>
                  <SelectItem value="2160" className="text-xs">4K (2160p)</SelectItem>
                </SelectContent>
              </Select>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "scale=-2:${resolution}" -c:a copy "res${resolution}_${out}"`} />
            </ToolCard>

            {/* 6. Format */}
            <ToolCard icon={<FileVideo className="h-4.5 w-4.5" />} title="Конвертиране на формат" color="text-teal-500">
              <Select value={targetFormat} onValueChange={setTargetFormat}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mov" className="text-xs">MOV</SelectItem>
                  <SelectItem value="webm" className="text-xs">WebM (VP9)</SelectItem>
                  <SelectItem value="avi" className="text-xs">AVI</SelectItem>
                  <SelectItem value="mkv" className="text-xs">MKV</SelectItem>
                </SelectContent>
              </Select>
              <CmdBlock cmd={`${ff} -i "${inp}" ${formatMap[targetFormat]}`} />
            </ToolCard>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Аудио</h2>

            {/* 7. Extract Audio */}
            <ToolCard icon={<Music className="h-4.5 w-4.5" />} title="Извличане на аудио" color="text-pink-500">
              <Select value={audioFmt} onValueChange={setAudioFmt}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3" className="text-xs">MP3</SelectItem>
                  <SelectItem value="wav" className="text-xs">WAV</SelectItem>
                </SelectContent>
              </Select>
              <CmdBlock cmd={audioFmt === "mp3"
                ? `${ff} -i "${inp}" -vn -acodec libmp3lame -q:a 2 "audio.mp3"`
                : `${ff} -i "${inp}" -vn -acodec pcm_s16le "audio.wav"`
              } />
            </ToolCard>

            {/* 8. Remove Audio */}
            <ToolCard icon={<VolumeX className="h-4.5 w-4.5" />} title="Премахване на аудио (Mute)" color="text-gray-500">
              <CmdBlock cmd={`${ff} -i "${inp}" -an -c:v copy "muted_${out}"`} />
            </ToolCard>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Ефекти</h2>

            {/* 9. Speed */}
            <ToolCard icon={<Gauge className="h-4.5 w-4.5" />} title="Промяна на скорост" color="text-yellow-500">
              <Select value={speed} onValueChange={setSpeed}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25" className="text-xs">0.25x (супер бавно)</SelectItem>
                  <SelectItem value="0.5" className="text-xs">0.5x (бавно)</SelectItem>
                  <SelectItem value="1.5" className="text-xs">1.5x (леко бързо)</SelectItem>
                  <SelectItem value="2" className="text-xs">2x (двойна скорост)</SelectItem>
                  <SelectItem value="4" className="text-xs">4x (четворна)</SelectItem>
                </SelectContent>
              </Select>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "setpts=${setptsVal}*PTS" -af "${buildAtempo(speedNum)}" "speed${speed}x_${out}"`} />
            </ToolCard>

            {/* 10. Color Correction */}
            <ToolCard icon={<SunMedium className="h-4.5 w-4.5" />} title="Корекция на цветовете" color="text-amber-500">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between"><Label className="text-[11px]">Яркост</Label><span className="text-[11px] text-muted-foreground">{brightness[0].toFixed(1)}</span></div>
                  <Slider min={-1} max={1} step={0.1} value={brightness} onValueChange={setBrightness} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between"><Label className="text-[11px]">Контраст</Label><span className="text-[11px] text-muted-foreground">{contrast[0].toFixed(1)}</span></div>
                  <Slider min={0} max={2} step={0.1} value={contrast} onValueChange={setContrast} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between"><Label className="text-[11px]">Наситеност</Label><span className="text-[11px] text-muted-foreground">{saturation[0].toFixed(1)}</span></div>
                  <Slider min={0} max={3} step={0.1} value={saturation} onValueChange={setSaturation} className="mt-1" />
                </div>
              </div>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "eq=brightness=${brightness[0].toFixed(1)}:contrast=${contrast[0].toFixed(1)}:saturation=${saturation[0].toFixed(1)}" -c:a copy "color_${out}"`} />
            </ToolCard>

            {/* 11. Fade */}
            <ToolCard icon={<Sparkles className="h-4.5 w-4.5" />} title="Fade In / Out" color="text-violet-500">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[11px]">Fade In (сек)</Label><Input value={fadeIn} onChange={e => setFadeIn(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[11px]">Fade Out (сек)</Label><Input value={fadeOut} onChange={e => setFadeOut(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[11px]">Общо (сек)</Label><Input value={totalDuration} onChange={e => setTotalDuration(e.target.value)} className="h-8 text-xs" /></div>
              </div>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${fadeOutStart}:d=${fadeOut}" -af "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}" "fade_${out}"`} />
            </ToolCard>

            {/* 12. Stabilize */}
            <ToolCard icon={<Wand2 className="h-4.5 w-4.5" />} title="Стабилизация" color="text-emerald-500">
              <CmdBlock label="Стъпка 1: Анализ" cmd={`${ff} -i "${inp}" -vf vidstabdetect=shakiness=5:accuracy=15 -f null -`} />
              <CmdBlock label="Стъпка 2: Стабилизиране" cmd={`${ff} -i "${inp}" -vf vidstabtransform=smoothing=10:input="transforms.trf" "stabilized_${out}"`} />
            </ToolCard>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Добавки</h2>

            {/* 13. Burn-in Subtitles */}
            <ToolCard icon={<Subtitles className="h-4.5 w-4.5" />} title="Burn-in субтитри" color="text-blue-500">
              <div><Label className="text-[11px]">SRT файл</Label><Input value={srtName} onChange={e => setSrtName(e.target.value)} className="h-8 text-xs" /></div>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "subtitles=${srtName}:force_style='FontSize=22,Outline=2,Shadow=0,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&'" -c:a copy "burnin_${out}"`} />
            </ToolCard>

            {/* 14. Watermark */}
            <ToolCard icon={<Type className="h-4.5 w-4.5" />} title="Воден знак (текст)" color="text-sky-500">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[11px]">Текст</Label><Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="h-8 text-xs" /></div>
                <div>
                  <Label className="text-[11px]">Позиция</Label>
                  <Select value={watermarkPos} onValueChange={setWatermarkPos}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tl" className="text-xs">Горе ляво</SelectItem>
                      <SelectItem value="tr" className="text-xs">Горе дясно</SelectItem>
                      <SelectItem value="bl" className="text-xs">Долу ляво</SelectItem>
                      <SelectItem value="br" className="text-xs">Долу дясно</SelectItem>
                      <SelectItem value="center" className="text-xs">Център</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "drawtext=text='${watermarkText}':fontsize=24:fontcolor=white@0.7:${posMap[watermarkPos]}" "wm_${out}"`} />
            </ToolCard>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Експорт</h2>

            {/* 15. Thumbnails */}
            <ToolCard icon={<ImageIcon className="h-4.5 w-4.5" />} title="Thumbnails" color="text-green-500">
              <CmdBlock cmd={`${ff} -i "${inp}" -vf "fps=1/5,scale=1080:-1" -q:v 2 "thumb_%03d.jpg"`} />
              <p className="text-[11px] text-muted-foreground">1 кадър на 5 секунди. Промени fps=1/N за различен интервал.</p>
            </ToolCard>

            {/* 16. GIF */}
            <ToolCard icon={<Film className="h-4.5 w-4.5" />} title="Видео → GIF" color="text-rose-500">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[11px]">Начало</Label><Input value={gifStart} onChange={e => setGifStart(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[11px]">Секунди</Label><Input value={gifDuration} onChange={e => setGifDuration(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[11px]">Ширина</Label><Input value={gifWidth} onChange={e => setGifWidth(e.target.value)} className="h-8 text-xs" /></div>
              </div>
              <CmdBlock label="Стъпка 1: Палитра" cmd={`${ff} -i "${inp}" -ss ${gifStart} -t ${gifDuration} -vf "fps=15,scale=${gifWidth}:-1:flags=lanczos,palettegen" palette.png`} />
              <CmdBlock label="Стъпка 2: GIF" cmd={`${ff} -i "${inp}" -i palette.png -ss ${gifStart} -t ${gifDuration} -filter_complex "fps=15,scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif`} />
            </ToolCard>

            {/* 17. Merge */}
            <ToolCard icon={<Layers className="h-4.5 w-4.5" />} title="Обединяване на клипове" color="text-fuchsia-500">
              <CmdBlock label="Създай concat.txt:" cmd={`echo "file 'clip1.mp4'\nfile 'clip2.mp4'\nfile 'clip3.mp4'" > concat.txt`} />
              <CmdBlock label="Обедини (без прекодиране):" cmd={`${ff} -f concat -safe 0 -i concat.txt -c copy "merged_${out}"`} />
            </ToolCard>
          </div>

          {/* Chat Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Видео агент (AI чат)</h2>
              </div>
              <div className="h-[600px]">
                <ChatInterface suggestions={suggestions} context="video" />
              </div>
            </div>

            {/* Quick prompts */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Бързи промптове</CardTitle>
                <CardDescription className="text-xs">Кликни за копиране → paste в чата</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {suggestions.map((s, idx) => (
                    <Button key={idx} variant="outline" size="sm"
                      className="justify-start text-left h-auto py-2 px-3 text-xs"
                      onClick={() => handleCopyPrompt(s.prompt, idx)}>
                      <span className="mr-1.5">{s.icon}</span>
                      <span className="flex-1 truncate">{s.title}</span>
                      {copiedIdx === idx ? <Check className="h-3 w-3 text-green-500 ml-1" /> : <Copy className="h-3 w-3 text-muted-foreground ml-1" />}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
