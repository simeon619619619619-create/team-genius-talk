import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload } from "lucide-react";

const suggestions = [
  {
    icon: "✂️",
    title: "Изрежи клип",
    prompt:
      "Имам MP4 файл (път/линк). Искам да изрежеш от [START] до [END]. Дай ми ffmpeg команда с настройки за TikTok/Reels (9:16, 1080x1920).",
  },
  {
    icon: "📝",
    title: "Субтитри SRT",
    prompt:
      "Имам MP4. Искам да генерирам SRT субтитри файл на български език от аудиото. Дай ми ffmpeg команда или обясни как да го направя (препоръчай STT инструмент ако е нужно).",
  },
  {
    icon: "🔥",
    title: "Burn-in субтитри",
    prompt:
      "Имам MP4 и SRT файл със субтитри. Искам да направя burn-in субтитри (текстът да е част от видеото). Дай ми ffmpeg команда с добри настройки за readability.",
  },
  {
    icon: "📐",
    title: "Crop за Reels",
    prompt:
      "Имам MP4 (хоризонтално). Искам да го crop-на за Instagram Reels/TikTok (9:16, 1080x1920), centered. Дай ffmpeg команда.",
  },
  {
    icon: "📦",
    title: "Компресия",
    prompt:
      "Имам MP4. Искам да го компресирам за web (H.264, CRF 23, good quality) и да запазя звук AAC 128k. Дай ffmpeg команда.",
  },
  {
    icon: "🖼️",
    title: "Thumbnails",
    prompt:
      "Имам MP4. Извади ми 6 thumbnails (PNG/JPG) равномерно по дължината на видеото. Дай ffmpeg команда.",
  },
];

export default function VideoPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground truncate">
              Видео обработка
            </h1>
            <p className="text-sm text-muted-foreground">
              Изрязване, преоразмеряване, субтитри, компресия и още — чрез инструкции и ffmpeg.
            </p>
          </div>
        </div>

        <Alert>
          <Upload className="h-4 w-4" />
          <AlertTitle>Как работи</AlertTitle>
          <AlertDescription>
            1) Качи MP4 или дай линк
            <br />
            2) Агентът ти дава ffmpeg команди
            <br />
            3) Копирай и пусни локално в Terminal
            <br />
            <span className="text-xs opacity-70">
              FFmpeg път: /opt/homebrew/bin/ffmpeg (вече наличен)
            </span>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Какво ми трябва от теб</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1) MP4 файл (или линк/път до файла)</p>
                <p>2) Каква платформа: TikTok / Reels / YouTube</p>
                <p>3) Цел: clip / crop / subtitles / compress / thumbnails</p>
                <p>
                  Ако имаш конкретни времена — пиши ги (пример: 00:01:12–00:01:45).
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Видео агент</h2>
            </div>
            <div className="h-[500px]">
              <ChatInterface suggestions={suggestions} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
