import { TITRES } from "@/lib/finances";

// Liste déroulante du titre de la personne (GA, AP, PA, AE, AM, Responsable).
export default function ChampTitre({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="fin-champ">
      <span>Titre</span>
      <select className="fin-input" value={valeur} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Aucun —</option>
        {TITRES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
