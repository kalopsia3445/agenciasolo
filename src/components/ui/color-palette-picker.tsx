import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface ColorPalettePickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  max?: number;
}

const PRESET_PALETTES = [
  { name: "Coral Quente", colors: ["#E8543E", "#F5A623", "#F7DC6F", "#FDEBD0", "#1A1A2E"] },
  { name: "Azul Pro", colors: ["#2C3E50", "#3498DB", "#1ABC9C", "#ECF0F1", "#E74C3C"] },
  { name: "Rosa Suave", colors: ["#E91E63", "#FF80AB", "#FCE4EC", "#F8BBD0", "#880E4F"] },
  { name: "Verde Natural", colors: ["#2E7D32", "#66BB6A", "#A5D6A7", "#E8F5E9", "#1B5E20"] },
  { name: "Roxo Luxo", colors: ["#6A1B9A", "#AB47BC", "#CE93D8", "#F3E5F5", "#4A148C"] },
  { name: "Neutro Elegante", colors: ["#212121", "#616161", "#BDBDBD", "#F5F5F5", "#FF6F00"] },
];

export function ColorPalettePicker({ colors, onChange, max = 6 }: ColorPalettePickerProps) {
  const [customColor, setCustomColor] = useState("#E8543E");

  function addColor(color: string) {
    if (colors.length >= max || colors.includes(color)) return;
    onChange([...colors, color]);
  }

  function removeColor(color: string) {
    onChange(colors.filter((c) => c !== color));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Paleta de cores da marca</label>

      {/* Current palette */}
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <div key={c} className="group relative">
            <div
              className="h-10 w-10 rounded-lg border border-border shadow-sm"
              style={{ backgroundColor: c }}
            />
            <button
              type="button"
              onClick={() => removeColor(c)}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
            >
              <X className="h-3 w-3" />
            </button>
            <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">{c}</span>
          </div>
        ))}
        {colors.length < max && (
          <div className="flex items-start gap-1">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border border-border"
            />
            <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => addColor(customColor)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Preset palettes */}
      {colors.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ou escolha uma paleta pronta:</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_PALETTES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onChange(p.colors)}
                className="rounded-lg border border-border p-2 text-left transition-all hover:border-primary/50"
              >
                <div className="flex gap-1">
                  {p.colors.map((c) => (
                    <div key={c} className="h-5 w-5 rounded" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
