import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image, Film } from "lucide-react";

export interface UploadedFile {
  id: string;
  name: string;
  url: string; // object URL for preview
  file: File;
  type: "image" | "video";
}

interface FileUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept: string;
  maxFiles?: number;
  label: string;
  description?: string;
}

export function FileUpload({ files, onChange, accept, maxFiles = 5, label, description }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < fileList.length && files.length + newFiles.length < maxFiles; i++) {
      const f = fileList[i];
      const isVideo = f.type.startsWith("video/");
      newFiles.push({
        id: crypto.randomUUID(),
        name: f.name,
        url: URL.createObjectURL(f),
        file: f,
        type: isVideo ? "video" : "image",
      });
    }
    onChange([...files, ...newFiles]);
  }

  function removeFile(id: string) {
    const file = files.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.url);
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
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50"
          >
            <div className="text-center">
              <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
              <span className="mt-1 block text-xs text-muted-foreground">Adicionar</span>
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
