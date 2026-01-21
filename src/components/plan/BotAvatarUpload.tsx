import { useState, useRef } from "react";
import { Upload, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BotAvatarUploadProps {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  botName: string;
}

export function BotAvatarUpload({ currentUrl, onUpload, botName }: BotAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Моля, изберете изображение');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Файлът е твърде голям (макс. 2MB)');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bot-${Date.now()}.${fileExt}`;
      const filePath = `bot-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success('Аватарът е качен успешно');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Грешка при качване на аватара');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div 
        className={cn(
          "relative h-16 w-16 rounded-full overflow-hidden",
          "bg-primary/10 flex items-center justify-center",
          "border-2 border-dashed border-primary/30"
        )}
      >
        {currentUrl ? (
          <>
            <img 
              src={currentUrl} 
              alt={botName}
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => onUpload('')}
              className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </>
        ) : (
          <Bot className="h-8 w-8 text-primary/50" />
        )}
      </div>
      
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Качване...' : 'Качи аватар'}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG до 2MB
        </p>
      </div>
    </div>
  );
}
