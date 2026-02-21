import { uploadImage } from "./data-service";

export interface ImageGenOptions {
  hook?: string; // Changed to optional
  inputSummary: string;
  niche: string;
  format: "reels" | "stories" | "carousel";
  objective: string;
  businessName?: string;
  visualStyle?: string;
  targetAudience?: string;
  colorPalette?: string[];
  toneAdjectives?: string[];
  visualSubject?: "pessoas" | "objetos" | "abstrato" | "texto"; // Updated type
  customVisualPrompt?: string;
  onProgress?: (index: number, progress: number) => void;
  overlayDesign?: {
    fontSizeMultiplier?: number;
    textAlign?: string;
    colorOverride?: string;
    yOffset?: number;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    strokeWidth?: number;
    opacity?: number;
    letterSpacing?: number;
    textEffect?: "none" | "layered-shadow" | "glow" | "outline";
  };
  fontFamily?: string;
  baseBlob?: Blob;
  skipUpload?: boolean;
  skipOverlay?: boolean;
}

/**
 * Carrega e VERIFICA se a fonte do Google Fonts está realmente disponível
 */
export async function loadGoogleFont(fontName: string): Promise<void> {
  const family = fontName.replace(/ /g, "+");
  const id = `font-${family}`;

  console.log(`%c[v10.1 FontManager] 🚀 Universal Agency Load: ${fontName}`, "color: #00bcd4; font-weight: bold;");

  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700;800;900&display=swap`;
    document.head.appendChild(link);
  }

  // v10.1: HIDDEN FORCE-RENDER (Ensures the browser paints the glyphs before Canvas)
  let forceDiv = document.getElementById('font-force-paint');
  if (!forceDiv) {
    forceDiv = document.createElement('div');
    forceDiv.id = 'font-force-paint';
    forceDiv.style.position = 'absolute';
    forceDiv.style.left = '-9999px';
    forceDiv.style.top = '-1999px';
    forceDiv.style.visibility = 'hidden';
    document.body.appendChild(forceDiv);
  }
  forceDiv.innerHTML += `<span style="font-family: '${fontName}'; font-weight: 900;">PAINT</span>`;

  const start = Date.now();
  const weights = ["900", "800", "700"];

  while (Date.now() - start < 8000) {
    for (const w of weights) {
      try {
        await document.fonts.load(`${w} 10px "${fontName}"`);
        if (document.fonts.check(`${w} 10px "${fontName}"`)) {
          console.log(`%c[v10.1 FontManager] ✅ AGENCY READY: ${fontName} (${w})`, "color: #4caf50; font-weight: bold;");
          return;
        }
      } catch (e) { /* retry */ }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.error(`%c[v10.1 FontManager] ❌ FONT FAIL: ${fontName}`, "color: #f44336; font-weight: bold;");
}

export function buildImagePrompt(opts: ImageGenOptions, basePrompt?: string): string {
  // v10.1: BRAND-AGNOSTIC ELITE TRANSLATOR (Universal Art Direction)
  const clean = (text: string) => {
    return text.toLowerCase()
      .replace(/#[a-fA-F0-9]{3,6}/g, '')
      .replace(/#/g, '')
      .replace(/\band\s+and\b/gi, 'and')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const niche = clean(opts.niche || 'commercial');
  const style = clean(opts.visualStyle || 'modern');
  const colors = opts.colorPalette?.join(', ') || 'neutral tones';
  const subjectType = opts.visualSubject || 'objetos';

  // v10.1: Universal High-Fidelity Artist Structure
  // We use the niche and style provided by the brand kit to build an objective scene.
  let artDescriptor = "";
  if (subjectType === "pessoas") artDescriptor = "Editorial lifestyle portrait, natural lighting, high-end fashion aesthetic";
  else if (subjectType === "objetos") artDescriptor = "Professional commercial product photography, minimalist studio lighting, high-fidelity textures";
  else artDescriptor = "Cinematic abstract environment, ethereal lighting, award-winning visual design";

  const coreContext = `[v10.1 REBOOT] A high-end ${style} scene for the ${niche} niche. ${artDescriptor}. Palette: ${colors}. Captured with 8k resolution, cinematic atmosphere, 85mm lens.`;

  if (basePrompt && basePrompt.length > 5) {
    const customPrompt = clean(basePrompt);
    return `${coreContext}. Scene details: ${customPrompt}`;
  }

  const summary = clean(opts.inputSummary || '');
  return `${coreContext}. Subject focused on: ${summary}`;
}

/**
 * Sobrepõe texto em um blob de imagem usando Canvas API.
 * Garante perfeição ortográfica e alinhamento com branding.
 */
export async function applyTextOverlay(imageBlob: Blob | string, text: string, opts: ImageGenOptions): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof imageBlob === 'string' ? imageBlob : URL.createObjectURL(imageBlob);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Could not get canvas context"));

      // 1. Desenhar fundo
      ctx.drawImage(img, 0, 0);

      // 2. Carregamento de Fonte e Configuração (v7.0)
      const selectedFont = opts.fontFamily || "Montserrat";
      await loadGoogleFont(selectedFont);

      const design = opts.overlayDesign || {
        fontSizeMultiplier: 1,
        textAlign: "center",
      };

      // 2. Configurações Estéticas AI-Driven (v6.0 - Hyper-Premium)
      const shadowBlur = design.shadowBlur ?? 12;
      const shadowOffsetX = design.shadowOffsetX ?? 2;
      const shadowOffsetY = design.shadowOffsetY ?? 2;
      const strokeWidth = design.strokeWidth ?? 1.5;
      const opacity = design.opacity ?? 1;
      const letterSpacing = design.letterSpacing ?? 0;
      const textEffect = design.textEffect ?? "layered-shadow";

      // v9.0 Agency-Lux default settings (removing outer strokes for elegance)
      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";
      ctx.fillStyle = brandColor;
      ctx.globalAlpha = opacity;

      // We ONLY use stroke for specific edge cases or explicitly if outline is selected
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      ctx.textAlign = (design.textAlign as CanvasTextAlign) || "center";
      ctx.textBaseline = "middle";

      // Tipografia Dinâmica
      const fontSizeBase = Math.floor(canvas.width * 0.08);
      let fontSize = Math.floor(fontSizeBase * (design.fontSizeMultiplier || 1));

      const setFont = (size: number) => {
        // v10.1: BRAND-AGNOSTIC AGENCY FONT
        const fontStr = `900 ${size}px "${selectedFont}", sans-serif`;
        ctx.font = fontStr;

        console.log(`%c[v10.1 RenderEngine] Applying Font: ${fontStr}`, "font-weight: bold; color: #00bcd4; background: #222; padding: 2px;");

        if ((ctx as any).letterSpacing !== undefined) {
          (ctx as any).letterSpacing = `${letterSpacing}px`;
        }
      };

      // 3. Sistema de Redimensionamento Automático (Auto-fit)
      const maxWidth = canvas.width * 0.9;
      const maxHeight = canvas.height * 0.7;

      let lines: string[] = [];
      const wrapText = (size: number) => {
        setFont(size);
        const words = text.split(" ");
        const resLines = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            resLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        resLines.push(currentLine);
        return resLines;
      };

      lines = wrapText(fontSize);
      while (lines.length * (fontSize * 1.2) > maxHeight && fontSize > 24) {
        fontSize -= 4;
        lines = wrapText(fontSize);
      }
      setFont(fontSize);

      // 4. Desenhar com Posicionamento Dinâmico
      const lineHeight = fontSize * 1.1;
      const totalHeight = lines.length * lineHeight;

      // Vertical offset: design.yOffset varies from -0.5 (top) to 0.5 (bottom)
      const yOffsetValue = (design.yOffset || 0) * (canvas.height * 0.8);
      let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2) + yOffsetValue;

      // Horizontal position based on textAlign
      let x = canvas.width / 2;
      if (design.textAlign === "left") x = canvas.width * 0.05;
      else if (design.textAlign === "right") x = canvas.width * 0.95;

      lines.forEach(line => {
        // v10.0 SUPER-LUX STACKED SHADOWS (Magazine-Grade Depth)
        ctx.save();

        if (textEffect === "layered-shadow" || textEffect === undefined) {
          // Layer 1: The Glow (Legibility Aura)
          ctx.shadowColor = "rgba(255,255,255,0.2)";
          ctx.shadowBlur = 5;
          ctx.strokeText(line, x, startY);

          // Layer 2: The Core (Sharp Depth)
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.strokeText(line, x, startY);

          // Layer 3: The Float (Ultra-Soft Depth)
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 15;
        } else if (textEffect === "glow") {
          ctx.shadowColor = brandColor;
          ctx.shadowBlur = 35;
        } else if (textEffect === "outline") {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = brandColor;
          ctx.lineWidth = strokeWidth * 2.5;
          ctx.strokeText(line, x, startY);
          ctx.restore();
          startY += lineHeight;
          return;
        }

        // v10.0 CLEAN FILL (No stroke artifact unless outline)
        ctx.fillText(line, x, startY);

        ctx.restore();
        startY += lineHeight;
      });

      // BLOB FIX (v8.0): Always convert to dataURL and log exhaustive metadata
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log(`%c[v8.0 RENDER] Finalizing slide with ${selectedFont}. Size: ${Math.round(dataUrl.length / 1024)}KB`, "background: #222; color: #bada55; padding: 4px;");
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for overlay"));
    };
    img.src = url;
  });
}

// 1. NEBIUS AI STUDIO (Proxy via Supabase)
async function generateWithNebius(prompt: string, index: number, opts: ImageGenOptions): Promise<string | Blob> {
  const { visualSubject, onProgress, skipUpload, skipOverlay } = opts;
  console.log(`🚀 NEBIUS REQUEST ${index} (Proxy):`, prompt);

  if (!import.meta.env.VITE_SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL não configurado");
  }

  // Otimização: Bypassar Nebius se já tivermos um fundo
  let blob: Blob | string;
  let usedModel = "black-forest-labs/flux-dev (default)";

  if (opts.baseBlob) {
    console.log(`[ImageGen] Reusing existing background blob for index ${index}`);
    blob = opts.baseBlob;
  } else {
    onProgress?.(index, 20);
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        prompt,
        provider: "nebius",
        visualSubject,
        seed: Math.floor(Math.random() * 999999999),
        colorPalette: opts.colorPalette,
        visualStyle: opts.visualStyle
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nebius Edge Function Error: ${errorText}`);
    }

    blob = await response.blob();
    usedModel = response.headers.get("X-Used-Model") || usedModel;
  }

  // APLICAR OVERLAY SE FOR FOCO EM TEXTO (E NÃO SKIPPADO)
  if (visualSubject === 'texto' && !skipOverlay) {
    try {
      const textToShow = opts.hook || 'Solo Reels';
      console.log(`[Frontend] Applying text overlay: "${textToShow}"`);
      blob = await applyTextOverlay(blob, textToShow, opts);
      const size = typeof blob === 'string' ? blob.length : blob.size;
      console.log(`[Frontend] Text overlay applied successfully. New size: ${size} bytes`);
    } catch (e) {
      console.warn("Falha ao aplicar overlay de texto:", e);
    }
  }

  if (skipUpload) {
    console.log(`[ImageGen] skipUpload is true, returning blob.`);
    return blob;
  }

  const isString = typeof blob === 'string';
  const type = isString ? 'image/jpeg' : (blob as Blob).type;

  if (!isString && !type.startsWith('image/')) {
    const text = await (blob as Blob).text();
    throw new Error(`Nebius Studio Error (Non-Image): ${text}`);
  }

  const path = `nebius_${Date.now()}_${index}.jpg`;
  const persistentUrl = await uploadImage(blob, path);

  onProgress?.(index, 100);
  return persistentUrl;
}

export async function generateImagePipeline(
  _originalPrompt: string,
  kit: ImageGenOptions | undefined,
  index: number = 0
): Promise<string | Blob> {
  const safeKit = kit || {
    niche: 'business',
    visualStyle: 'professional',
    colorPalette: ['#000000'],
    inputSummary: 'image',
    hook: '',
    format: 'stories',
    objective: 'engagement'
  };

  // Garantir prompt em Inglês e PERSONALIZADO com o roteiro
  const prompt = buildImagePrompt({ ...safeKit, index } as any, _originalPrompt);

  // Pipeline Exclusiva: Inteligência de Modelos via Nebius AI Studio
  return await generateWithNebius(prompt, index, safeKit);
}

// Mantendo compatibilidade com Generate.tsx
export async function generateImage(
  prompt: string,
  _apiKey?: string,
  opts?: ImageGenOptions,
  index: number = 0
): Promise<string | Blob> {
  return generateImagePipeline(prompt, opts, index);
}

export async function regenerateImage(
  prompt: string,
  apiKey: string
): Promise<string | Blob> {
  const variedPrompt = `${prompt} variation ${Math.floor(Math.random() * 1000)}`;
  return generateImage(variedPrompt, apiKey);
}

export async function downloadImage(dataUri: string, filename: string): Promise<void> {
  try {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error("Download failed:", err);
  }
}
