import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Film, Loader2 } from "lucide-react";
import { supabase, isDemoMode } from "@/lib/supabase";
import { useState } from "react";

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  file?: File;
  type: "image" | "video";
}

interface FileUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept: string;
  maxFiles?: number;
  label: string;
  description?: string;
  userId?: string;
}

async function uploadToSupabase(file: File, userId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const ext = file.name.split(".").pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return data.publicUrl;
}

export function FileUpload({ files, onChange, accept, maxFiles = 5, label, description, userId }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newFiles: UploadedFile[] = [];
    setUploading(true);

    try {
      for (let i = 0; i < fileList.length && files.length + newFiles.length < maxFiles; i++) {
        const f = fileList[i];
        const isVideo = f.type.startsWith("video/");
        let url: string;

        if (!isDemoMode && supabase && userId) {
          url = await uploadToSupabase(f, userId);
        } else {
          url = URL.createObjectURL(f);
        }

        newFiles.push({
          id: crypto.randomUUID(),
          name: f.name,
          url,
          file: isDemoMode ? f : undefined,
          type: isVideo ? "video" : "image",
        });
      }
      onChange([...files, ...newFiles]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  function removeFile(id: string) {
    const file = files.find((f) => f.id === id);
    if (file?.file) URL.revokeObjectURL(file.url);
    // TODO: also delete from Supabase storage if needed
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div className="grid grid-cols-3 gap-2">
        {files.map((f) => (
          <div key={f.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            {f.type === "image" ? (
              <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground" />
                <video src={f.url} className="absolute inset-0 h-full w-full object-cover opacity-50" />
              </div>
            )}
            <button
              type="button"
              onClick={() => removeFile(f.id)}
              className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50 disabled:opacity-50"
          >
            <div className="text-center">
              {uploading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
              )}
              <span className="mt-1 block text-xs text-muted-foreground">
                {uploading ? "Enviando..." : "Adicionar"}
              </span>
            </div>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
