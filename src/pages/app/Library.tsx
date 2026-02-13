import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getScripts, getFavoriteIds, toggleFavorite } from "@/lib/demo-store";
import type { SavedScript } from "@/types/schema";
import { Heart, Copy, Video, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Library() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(getFavoriteIds());
  const scripts = getScripts();

  const filtered = useMemo(() => {
    if (!search) return scripts;
    const q = search.toLowerCase();
    return scripts.filter(
      (s) =>
        s.inputSummary.toLowerCase().includes(q) ||
        s.niche.toLowerCase().includes(q) ||
        s.format.toLowerCase().includes(q)
    );
  }, [scripts, search]);

  const favorites = filtered.filter((s) => favIds.has(s.id));

  function handleFav(id: string) {
    toggleFavorite(id);
    setFavIds(getFavoriteIds());
  }

  function ScriptItem({ script }: { script: SavedScript }) {
    const v = script.resultJson.variants[0];
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-sm">{v.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {script.format} • {script.objective} • {new Date(script.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFav(script.id)}>
              <Heart className={`h-4 w-4 ${favIds.has(script.id) ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{v.hook}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
              navigator.clipboard.writeText(`${v.hook}\n\n${v.script}\n\n${v.captionLong}\n\n${v.hashtags.join(" ")}`);
              toast({ title: "Copiado! 📋" });
            }}>
              <Copy className="mr-1 h-3 w-3" /> Copiar
            </Button>
            <Button size="sm" className="flex-1 text-xs gradient-primary border-0" onClick={() => navigate(`/app/teleprompter/${script.id}?variant=0`)}>
              <Video className="mr-1 h-3 w-3" /> Teleprompter
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-[Space_Grotesk]">Biblioteca</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar roteiros..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1">Favoritos ({favorites.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum roteiro gerado ainda.</p>
          ) : filtered.map((s) => <ScriptItem key={s.id} script={s} />)}
        </TabsContent>
        <TabsContent value="favorites" className="space-y-3 mt-4">
          {favorites.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum favorito ainda.</p>
          ) : favorites.map((s) => <ScriptItem key={s.id} script={s} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
