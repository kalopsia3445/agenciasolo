export const NICHES = [
  { id: "beleza", label: "Beleza / Estética", emoji: "💅" },
  { id: "delivery", label: "Delivery / Entregas", emoji: "🛵" },
  { id: "transporte", label: "Transporte / Frete / Carreto", emoji: "🚛" },
  { id: "fitness", label: "Condicionamento Físico / Personal", emoji: "💪" },
  { id: "ensino", label: "Ensino / Aulas", emoji: "📚" },
  { id: "pet", label: "Pet", emoji: "🐾" },
  { id: "reparos", label: "Reparos / Manutenção", emoji: "🔧" },
  { id: "consultoria", label: "Consultoria", emoji: "💼" },
  { id: "marketing", label: "Marketing / Publicidade", emoji: "📣" },
  { id: "contabilidade", label: "Contabilidade / Escrituração", emoji: "📊" },
] as const;

export type NicheId = (typeof NICHES)[number]["id"];
