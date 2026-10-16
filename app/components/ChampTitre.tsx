// Liste déroulante du titre de la personne (liste réglable par le super administrateur).
export default function ChampTitre({ valeur, onChange, titres }: { valeur: string; onChange: (v: string) => void; titres: string[] }) {
  // Un titre retiré de la liste reste affiché pour les comptes qui l'ont déjà.
  const options = valeur && !titres.includes(valeur) ? [...titres, valeur] : titres;
  return (
    <label className="fin-champ">
      <span>Titre</span>
      <select className="fin-input" value={valeur} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Aucun —</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
