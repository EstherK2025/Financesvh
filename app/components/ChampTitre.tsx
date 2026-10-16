"use client";

import { useState } from "react";

// AP, AM et AE forment un seul choix « AP / AM / AE » dans la liste ; la
// personne précise ensuite lequel des trois (choix obligatoire).
const GROUPE = ["AP", "AM", "AE"];
const VALEUR_GROUPE = "__ap_am_ae";

// Liste déroulante du titre de la personne (liste réglable par le super administrateur).
export default function ChampTitre({ valeur, onChange, titres }: { valeur: string; onChange: (v: string) => void; titres: string[] }) {
  // Un titre retiré de la liste reste affiché pour les comptes qui l'ont déjà.
  const liste = valeur && !titres.includes(valeur) ? [...titres, valeur] : titres;
  const duGroupe = GROUPE.filter((t) => liste.includes(t));
  const [groupeOuvert, setGroupeOuvert] = useState(duGroupe.includes(valeur));
  const enGroupe = duGroupe.length > 1 && (groupeOuvert || duGroupe.includes(valeur));

  // Options principales : le groupe AP / AM / AE prend la place du premier des trois.
  const options: { valeur: string; libelle: string }[] = [];
  for (const t of liste) {
    if (duGroupe.length > 1 && duGroupe.includes(t)) {
      if (!options.some((o) => o.valeur === VALEUR_GROUPE)) options.push({ valeur: VALEUR_GROUPE, libelle: duGroupe.join(" / ") });
    } else options.push({ valeur: t, libelle: t });
  }

  return (
    <div className={enGroupe ? "fin-grille2" : undefined}>
      <label className="fin-champ">
        <span>Titre</span>
        <select
          className="fin-input"
          value={enGroupe ? VALEUR_GROUPE : valeur}
          onChange={(e) => {
            if (e.target.value === VALEUR_GROUPE) {
              setGroupeOuvert(true);
              onChange("");
            } else {
              setGroupeOuvert(false);
              onChange(e.target.value);
            }
          }}
        >
          <option value="">— Aucun —</option>
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      </label>
      {enGroupe && (
        <label className="fin-champ">
          <span>Lequel ? *</span>
          <select className="fin-input" required value={duGroupe.includes(valeur) ? valeur : ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Choisir —</option>
            {duGroupe.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
