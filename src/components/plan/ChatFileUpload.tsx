import { useState, useRef } from "react";
import { Paperclip, X, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
}

interface ChatFileUploadProps {
  onFilesSelected: (files: ChatAttachment[]) => void;
  pendingFiles: ChatAttachment[];
  onRemoveFile: (id: string) => void;
  projectId: string;
  stepId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export function ChatFileUpload({ 
  onFilesSelected, 
  pendingFiles, 
  onRemoveFile,
  projectId,
  stepId 
}: ChatFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} е твърде голям (макс. 10MB)`);
        continue;
      }
      
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isAllowedFile = ALLOWED_FILE_TYPES.includes(file.type);
      
      if (!isImage && !isAllowedFile) {
        toast.error(`${file.name} - неподдържан формат`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const uploaded: ChatAttachment[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Трябва да сте логнат за да качвате файлове");
        return;
      }

      for (const file of validFiles) {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${projectId}/${stepId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Грешка при качване на ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: isImage ? 'image' : 'file',
          size: file.size,
        });
      }

      if (uploaded.length > 0) {
        onFilesSelected(uploaded);
        toast.success(`${uploaded.length} файл${uploaded.length > 1 ? 'а качени' : ' качен'} успешно`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Грешка при качване на файловете');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3">
          {pendingFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "relative group rounded-xl overflow-hidden border border-border/50 bg-secondary/30",
                file.type === 'image' ? "w-16 h-16" : "flex items-center gap-2 px-3 py-2"
              )}
            >
              {file.type === 'image' ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate max-w-[100px]">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </>
              )}
              <button
                onClick={() => onRemoveFile(file.id)}
                className={cn(
                  "absolute bg-destructive text-destructive-foreground rounded-full p-0.5 transition-opacity",
                  file.type === 'image' 
                    ? "top-1 right-1 opacity-0 group-hover:opacity-100" 
                    : "-top-1 -right-1"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_FILE_TYPES].join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// Component to display attachments in messages
export function ChatAttachmentDisplay({ attachments }: { attachments: ChatAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors",
            attachment.type === 'image' ? "w-32 h-32" : "flex items-center gap-2 px-3 py-2 bg-secondary/30"
          )}
        >
          {attachment.type === 'image' ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate max-w-[150px]">{attachment.name}</p>
              </div>
            </>
          )}
        </a>
      ))}
    </div>
  );
}
