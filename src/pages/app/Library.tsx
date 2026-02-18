import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getScripts, getFavoriteIds, toggleFavorite, deleteScript } from "@/lib/data-service";
import type { SavedScript } from "@/types/schema";
import { Star, Copy, Video, Search, Loader2, Trash2, FileText, Sparkles, Eye, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { downloadImage } from "@/lib/image-gen";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Library() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<SavedScript | null>(null);

  useEffect(() => {
    Promise.all([getScripts(), getFavoriteIds()]).then(([s, f]) => {
      setScripts(s);
      setFavIds(f);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return scripts;
    const q = search.toLowerCase();
    return scripts.filter(
      (s) => s.inputSummary.toLowerCase().includes(q) || s.niche.toLowerCase().includes(q) || s.format.toLowerCase().includes(q)
    );
  }, [scripts, search]);

  const favorites = filtered.filter((s) => favIds.has(s.id));

  async function handleFav(id: string) {
    await toggleFavorite(id);
    const newFavs = await getFavoriteIds();
    setFavIds(newFavs);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este roteiro permanentemente?")) return;
    await deleteScript(id);
    setScripts(prev => prev.filter(s => s.id !== id));
    toast({ title: "Excluído com sucesso! 🗑️" });
  }

  function ScriptItem({ script }: { script: SavedScript }) {
    const v = script.resultJson.variants[0];
    const hasDetailed = script.resultJson.variants.some(variant => !!variant.detailedContent);

    return (
      <Card className="relative overflow-hidden group hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {v.imageUrl && (
              <div className="h-20 w-20 flex-shrink-0 relative">
                <img src={v.imageUrl} alt={v.title} className="h-full w-full rounded-lg object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg z-10">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/20 hover:bg-white/40 text-white border-0 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScript(script);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/20 hover:bg-white/40 text-white border-0 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(v.imageUrl!, `soloreels-${v.title.replace(/\s+/g, "-")}.png`);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  className="absolute inset-0"
                  onClick={() => setSelectedScript(script)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0" onClick={() => setSelectedScript(script)} style={{ cursor: 'pointer' }}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{v.title}</p>
                    {hasDetailed && (
                      <Badge variant="secondary" className="px-1.5 h-4 text-[9px] bg-primary/10 text-primary border-primary/20 gap-0.5">
                        <Sparkles className="h-2 w-2" /> Estudo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {script.format} • {script.objective} • {new Date(script.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleFav(script.id)}>
                    <Star className={`h-4 w-4 ${favIds.has(script.id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(script.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{v.hook}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setSelectedScript(script)}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Ver Completo
            </Button>
            <Button size="sm" className="flex-1 text-xs gradient-primary border-0 h-8" onClick={() => navigate(`/app/teleprompter/${script.id}?variant=0`)}>
              <Video className="mr-1 h-3.5 w-3.5" /> Gravar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function ScriptDetailModal() {
    if (!selectedScript) return null;
    const variants = selectedScript.resultJson.variants;
    const isCarousel = selectedScript.format === "carousel";

    return (
      <Dialog open={!!selectedScript} onOpenChange={(open) => !open && setSelectedScript(null)}>
        <DialogContent className="max-w-lg p-0 bg-card border-primary/20 overflow-hidden h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2 border-b border-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold font-[Space_Grotesk] leading-none mb-1">
                  {variants[0].title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedScript.format} • {selectedScript.objective} • {new Date(selectedScript.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="space-y-8 py-4">
              {variants.map((variant, i) => (
                <div key={i} className="space-y-6">
                  {variants.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-primary">Variação {i + 1}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* IMAGENS */}
                  {isCarousel ? (
                    <div className="grid grid-cols-3 gap-2">
                      {(variant.imageUrls || []).map((url, idx) => (
                        <div key={idx} className="aspect-square relative rounded-lg overflow-hidden border border-primary/10 group/img">
                          <img src={url} className="h-full w-full object-cover" alt={`Slide ${idx + 1}`} />
                          <div className="absolute top-1 left-1 bg-black/60 text-[8px] text-white px-1 rounded uppercase font-bold">Lâmina {idx + 1}</div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center z-10">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 bg-white/20 hover:bg-white/40 text-white border-0 backdrop-blur-sm"
                              onClick={() => downloadImage(url, `soloreels-${variant.title.replace(/\s+/g, "-")}-slide-${idx + 1}.png`)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : variant.imageUrl && (
                    <div className="aspect-square w-full relative rounded-xl overflow-hidden border border-primary/10 bg-muted group/img">
                      <img src={variant.imageUrl} className="h-full w-full object-cover" alt="Capa" />
                      <div className="absolute top-3 left-3 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded uppercase font-bold backdrop-blur-sm">Imagem de Capa</div>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm shadow-xl"
                          onClick={() => downloadImage(variant.imageUrl!, `soloreels-${variant.title.replace(/\s+/g, "-")}.png`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* CONTEÚDO PRINCIPAL */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary/70 mb-1.5 tracking-wider">🪝 Gancho (Hook)</h4>
                      <p className="text-sm font-medium bg-muted/30 p-3 rounded-lg border border-primary/5">{variant.hook}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase text-primary/70 mb-1.5 tracking-wider">📜 Roteiro (Script)</h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-primary/5 italic text-muted-foreground font-medium">
                        {variant.script}
                      </div>
                    </div>

                    {variant.detailedContent && (
                      <div className="bg-primary/5 rounded-xl border border-primary/10 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Estudo de Roteiro (Aprofundado)</h4>
                        </div>
                        <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium">
                          {variant.detailedContent}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-primary/70 mb-1.5 tracking-wider">🎬 Shot List</h4>
                        <ul className="space-y-1.5">
                          {variant.shotList.map((shot, idx) => (
                            <li key={idx} className="text-xs flex gap-2 items-start text-muted-foreground">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-[8px]">{idx + 1}</span>
                              {shot}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-black uppercase text-primary/70 mb-1.5 tracking-wider">✍️ Legenda Sugerida</h4>
                        <div className="text-xs leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-primary/5 text-muted-foreground">
                          {variant.captionLong}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <footer className="p-4 border-t border-primary/5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const allContent = variants.map((v, i) =>
                  `--- VARIAÇÃO ${i + 1} ---\nGANCHO: ${v.hook}\nROTEIRO: ${v.script}\nLEGENDA: ${v.captionLong}\n\n${v.detailedContent ? `ESTUDO DE ROTEIRO:\n${v.detailedContent}\n\n` : ''}`
                ).join('\n');
                navigator.clipboard.writeText(allContent);
                toast({ title: "Copiado! 📋" });
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar Tudo
            </Button>
            <Button
              className="flex-1 gradient-primary border-0"
              onClick={() => navigate(`/app/teleprompter/${selectedScript.id}?variant=0`)}
            >
              <Video className="mr-2 h-4 w-4" /> Ir p/ Teleprompter
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
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

      <ScriptDetailModal />
    </div>
  );
}
