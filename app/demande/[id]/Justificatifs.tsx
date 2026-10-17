"use client";

import { useState } from "react";
import { appeler } from "../../components/api";
import { compresser, tailleLisible } from "../../components/DemandeForm";
import Icone from "../../components/Icone";

type Props = {
  demandeId: string;
  role: "demandeur" | "finances" | "lecture";
  recusLe: string | null; // date lisible, null = en attente
  nbRappels: number;
};

// Décaissement approuvé : preuves de dépense (factures, reçus) à fournir.
// Tant qu'elles manquent, un rappel est envoyé au demandeur tous les deux jours.
export default function Justificatifs({ demandeId, role, recusLe, nbRappels }: Props) {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  async function ajouter(e: React.ChangeEvent<HTMLInputElement>) {
    const liste = Array.from(e.target.files || []);
    e.target.value = "";
    const prets = await Promise.all(liste.map(compresser));
    setFichiers((a) => [...a, ...prets].slice(0, 6));
  }

  async function envoyer() {
    setErreur("");
    if (fichiers.length === 0) return setErreur("Ajoutez au moins une facture ou un reçu.");
    const fd = new FormData();
    fichiers.forEach((f) => fd.append("pieces", f));
    fd.set("commentaire", commentaire);
    setCharge(true);
    const r = await appeler(`/api/demandes/${demandeId}/justificatifs`, { body: fd });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function marquerRecus() {
    if (!confirm("Marquer les justificatifs comme reçus (remis en main propre, par exemple) ? Les rappels s'arrêteront.")) return;
    const r = await appeler(`/api/demandes/${demandeId}/justificatifs`, { method: "PATCH", json: {} });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  return (
    <div className={`fin-carte fin-justificatifs${recusLe ? "" : " attente"}`}>
      <h2 style={{ marginTop: 0 }}>Justificatifs de dépense</h2>
      {recusLe ? (
        <p className="fin-succes" style={{ marginBottom: 12 }}>
          <Icone nom="valide" taille={17} /> Justificatifs reçus le {recusLe}.
        </p>
      ) : (
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          {role === "demandeur"
            ? "Votre décaissement a été approuvé. Ajoutez ici les factures ou reçus des dépenses faites avec ces fonds."
            : "En attente des factures ou reçus du demandeur."}{" "}
          <span style={{ color: "var(--fin-gris)" }}>
            Rappel par courriel tous les deux jours{nbRappels ? ` · ${nbRappels} rappel${nbRappels > 1 ? "s" : ""} envoyé${nbRappels > 1 ? "s" : ""}` : ""}.
          </span>
        </p>
      )}
      {erreur && <div className="fin-erreur">{erreur}</div>}

      {role === "demandeur" && (
        <>
          {fichiers.length > 0 && (
            <ul className="fin-pieces" style={{ marginBottom: 10 }}>
              {fichiers.map((f, i) => (
                <li key={i}>
                  <label>
                    <Icone nom="trombone" taille={16} /> {f.name} <span style={{ color: "var(--fin-gris)" }}>({tailleLisible(f.size)})</span>
                    <button type="button" className="fin-btn blanc petit" onClick={() => setFichiers((a) => a.filter((_, j) => j !== i))}>
                      Retirer
                    </button>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="fin-actions">
            <label className="fin-btn blanc" style={{ cursor: "pointer" }}>
              <Icone nom="trombone" taille={17} /> {recusLe ? "Ajouter d'autres justificatifs" : "Choisir les factures / reçus"}
              <input type="file" accept="application/pdf,image/*" multiple onChange={ajouter} style={{ display: "none" }} />
            </label>
          </div>
          {fichiers.length > 0 && (
            <>
              <label className="fin-champ" style={{ marginTop: 12 }}>
                <span>Commentaire (facultatif)</span>
                <input className="fin-input" maxLength={500} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. reste 12,50 $ remis en espèces" />
              </label>
              <button className="fin-btn plein" disabled={charge} onClick={envoyer}>
                {charge ? "…" : "Envoyer les justificatifs"}
              </button>
            </>
          )}
        </>
      )}

      {role === "finances" && !recusLe && (
        <button className="fin-btn blanc petit" onClick={marquerRecus}>
          Marquer comme reçus
        </button>
      )}
    </div>
  );
}
