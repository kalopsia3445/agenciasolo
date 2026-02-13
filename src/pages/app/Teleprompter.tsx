import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getScriptById } from "@/lib/demo-store";
import { Play, Pause, RotateCcw, FlipHorizontal, Minus, Plus, ArrowLeft, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Teleprompter() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variantIdx = parseInt(searchParams.get("variant") || "0");

  const script = scriptId ? getScriptById(scriptId) : null;
  const text = script?.resultJson.variants[variantIdx]?.teleprompterText || "Nenhum texto encontrado.";

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(50); // px per second
  const [fontSize, setFontSize] = useState(28);
  const [mirrored, setMirrored] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    function tick(now: number) {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (scrollRef.current) {
        scrollRef.current.scrollTop += speed * delta;
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, speed]);

  function reset() {
    setPlaying(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <span className="text-sm font-medium">Teleprompter</span>
        <div className="w-16" />
      </div>

      {/* Text area */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-6 py-16"
        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
      >
        {showGuide && (
          <div className="pointer-events-none absolute left-0 right-0 top-1/3 h-px bg-primary/50" />
        )}
        <p
          className="mx-auto max-w-md whitespace-pre-wrap leading-relaxed text-foreground"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {text}
        </p>
        <div className="h-[60vh]" />
      </div>

      {/* Controls */}
      <div className="border-t bg-card px-4 py-3 safe-bottom">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Button variant="ghost" size="icon" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
          <Button
            size="icon"
            className={`h-12 w-12 rounded-full ${playing ? "bg-destructive" : "gradient-primary border-0"}`}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Velocidade</span>
            <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={10} max={150} step={5} />
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.max(16, fontSize - 2))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs w-6 text-center">{fontSize}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.min(48, fontSize + 2))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMirrored(!mirrored)}>
            <FlipHorizontal className={`h-4 w-4 ${mirrored ? "text-primary" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGuide(!showGuide)}>
            <Eye className={`h-4 w-4 ${showGuide ? "text-primary" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
