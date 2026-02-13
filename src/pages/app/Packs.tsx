import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OFFICIAL_PACKS } from "@/data/style-packs";
import { getCustomPacks, saveCustomPack, deleteCustomPack } from "@/lib/demo-store";
import type { StylePack } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function Packs() {
  const { toast } = useToast();
  const [customPacks, setCustomPacks] = useState<StylePack[]>(getCustomPacks());
  const [editing, setEditing] = useState<StylePack | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function PackCard({ pack, editable }: { pack: StylePack; editable?: boolean }) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{pack.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{pack.description}</p>
            </div>
            {editable && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(pack); setDialogOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                  deleteCustomPack(pack.id);
                  setCustomPacks(getCustomPacks());
                  toast({ title: "Pack removido" });
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {pack.rules.slice(0, 3).map((r) => (
              <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-[Space_Grotesk]">Packs de Estilo</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary border-0"><Plus className="mr-1 h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Pack" : "Novo Pack"}</DialogTitle></DialogHeader>
            <PackForm
              initial={editing}
              onSave={(pack) => {
                saveCustomPack(pack);
                setCustomPacks(getCustomPacks());
                setDialogOpen(false);
                setEditing(null);
                toast({ title: "Pack salvo! ✅" });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {customPacks.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Seus Packs</h3>
          <div className="space-y-3">
            {customPacks.map((p) => <PackCard key={p.id} pack={p} editable />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Oficiais ({OFFICIAL_PACKS.length})</h3>
        <div className="space-y-3">
          {OFFICIAL_PACKS.map((p) => <PackCard key={p.id} pack={p} />)}
        </div>
      </div>
    </div>
  );
}

function PackForm({ initial, onSave }: { initial?: StylePack | null; onSave: (pack: StylePack) => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [rulesText, setRulesText] = useState(initial?.rules.join("\n") || "");
  const [phrasesText, setPhrasesText] = useState(initial?.examplePhrases.join("\n") || "");

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      rules: rulesText.split("\n").map((r) => r.trim()).filter(Boolean),
      examplePhrases: phrasesText.split("\n").map((p) => p.trim()).filter(Boolean),
      isOfficial: false,
    });
  }

  return (
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Nome</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Descrição</label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Regras (1 por linha)</label><Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} rows={3} /></div>
      <div><label className="text-sm font-medium">Frases exemplo (1 por linha)</label><Textarea value={phrasesText} onChange={(e) => setPhrasesText(e.target.value)} rows={3} /></div>
      <Button className="w-full gradient-primary border-0" onClick={handleSubmit}>Salvar Pack</Button>
    </div>
  );
}
