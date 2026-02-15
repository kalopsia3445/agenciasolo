// Geração de imagens via Pollinations.ai (100% grátis, sem API key)

export interface ImageGenOptions {
  hook: string;
  inputSummary: string;
  niche: string;
  format: "reels" | "stories" | "carousel";
  objective: string;
  businessName?: string;
  visualStyle?: string;
}

function buildImagePrompt(opts: ImageGenOptions): string {
  const style = opts.visualStyle
    ? `, estilo visual: ${opts.visualStyle}`
    : ", estilo profissional, moderno, clean";

  return `Instagram post image for ${opts.niche} business "${opts.businessName || ""}". ${opts.inputSummary}. Hook: ${opts.hook}. Objective: ${opts.objective}. Professional social media design, vibrant colors, high quality, no text overlay${style}`;
}

function getDimensions(format: "reels" | "stories" | "carousel"): { width: number; height: number } {
  switch (format) {
    case "reels":
    case "stories":
      return { width: 1080, height: 1920 };
    case "carousel":
      return { width: 1080, height: 1080 };
  }
}

export function generateImageUrl(opts: ImageGenOptions, seed?: number): { url: string; prompt: string } {
  const prompt = buildImagePrompt(opts);
  const { width, height } = getDimensions(opts.format);
  const seedParam = seed ?? Math.floor(Math.random() * 999999);
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seedParam}`;
  return { url, prompt };
}

export function regenerateImageUrl(prompt: string, format: "reels" | "stories" | "carousel"): string {
  const { width, height } = getDimensions(format);
  const seed = Math.floor(Math.random() * 999999);
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
}

export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Download failed:", err);
  }
}
