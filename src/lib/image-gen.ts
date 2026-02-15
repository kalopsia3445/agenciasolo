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

function getAspectLabel(format: "reels" | "stories" | "carousel"): string {
  switch (format) {
    case "reels":
    case "stories":
      return "vertical 9:16 portrait";
    case "carousel":
      return "square 1:1";
  }
}

function buildImagePrompt(opts: ImageGenOptions, seed: number): string {
  const aspect = getAspectLabel(opts.format);
  const style = opts.visualStyle || "professional, modern, clean";

  // Keep prompt short and English-only for best results
  const parts = [
    `Instagram ${opts.format} cover image`,
    `${aspect} composition`,
    opts.niche,
    opts.inputSummary.slice(0, 80),
    `style: ${style}`,
    "vibrant colors, high quality, social media design, no text",
    `seed:${seed}`,
  ];

  return parts.join(", ");
}

export function generateImageUrl(opts: ImageGenOptions, seed?: number): { url: string; prompt: string } {
  const s = seed ?? Math.floor(Math.random() * 999999);
  const prompt = buildImagePrompt(opts, s);
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}`;
  return { url, prompt };
}

export function regenerateImageUrl(prompt: string, _format: "reels" | "stories" | "carousel"): string {
  // Replace the seed in the prompt to get a different image
  const newSeed = Math.floor(Math.random() * 999999);
  const newPrompt = prompt.replace(/seed:\d+/, `seed:${newSeed}`);
  const encoded = encodeURIComponent(newPrompt);
  return `https://image.pollinations.ai/prompt/${encoded}`;
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
