"use client";

import { useState } from "react";
import { CATEGORIES, MODES_PAIEMENT, PIECES, TYPES, TYPES_AIDE, type TypeDemande } from "@/lib/finances";
import { appeler } from "./api";
import Icone from "./Icone";

export type ValeursDemande = {
  type: TypeDemande;
  categorie: string;
  objet: string;
  description: string;
  montant: string;
  dateDepense: string;
  beneficiaire: string;
  modePaiement: string;
  destinataireId: string;
};

type Props = {
  demandeId?: string; // présent = révision d'une demande refusée
  initial: ValeursDemande;
  piecesExistantes?: { id: string; nom: string }[];
  destinataires?: { id: string; nom: string }[]; // super admin : à qui envoyer sa demande
  circuit: string; // phrase expliquant le trajet de la demande
};

// Réduit les photos (factures prises au téléphone) avant l'envoi.
export async function compresser(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 600 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const echelle = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * echelle);
    c.height = Math.round(bmp.height * echelle);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f;
  }
}

export const tailleLisible = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(o / 1024)} Ko`);

export default function DemandeForm({ demandeId, initial, piecesExistantes = [], destinataires, circuit }: Props) {
  const [v, setV] = useState<ValeursDemande>(initial);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [aSupprimer, setASupprimer] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);
  const maj = (k: keyof ValeursDemande) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV({ ...v, [k]: e.target.value });

  const remboursement = v.type === "remboursement";
  const total = fichiers.reduce((s, f) => s + f.size, 0);

  async function ajouter(e: React.ChangeEvent<HTMLInputElement>) {
    const liste = Array.from(e.target.files || []);
    e.target.value = "";
    setErreur("");
    const prets = await Promise.all(liste.map(compresser));
    const refuses = prets.filter((f) => !(PIECES.types as readonly string[]).includes(f.type));
    if (refuses.length) setErreur(`Format non accepté : ${refuses.map((f) => f.name).join(", ")} (PDF ou photo).`);
    setFichiers((a) => [...a, ...prets.filter((f) => !refuses.includes(f))].slice(0, PIECES.maxFichiers));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    const restantes = piecesExistantes.length - aSupprimer.length + fichiers.length;
    if (remboursement && restantes === 0) return setErreur("Ajoutez la facture (photo ou PDF) : elle est obligatoire pour un remboursement.");
    if (total > PIECES.maxParRequete) return setErreur("Pièces jointes trop lourdes (4 Mo maximum au total).");
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.append(k, val);
    fichiers.forEach((f) => fd.append("pieces", f, f.name));
    aSupprimer.forEach((id) => fd.append("supprimerPieces", id));
    if (demandeId) fd.append("commentaire", commentaire);
    setCharge(true);
    const r = await appeler<{ id?: string }>(demandeId ? `/api/demandes/${demandeId}` : "/api/demandes", {
      method: demandeId ? "PUT" : "POST",
      body: fd,
    });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.href = `/demande/${demandeId || r.data.id}`;
  }

  return (
    <form onSubmit={envoyer}>
      <div className="fin-types">
        {(Object.keys(TYPES) as TypeDemande[]).map((t) => (
          <button type="button" key={t} className={`fin-type${v.type === t ? " actif" : ""}`} onClick={() => setV({ ...v, type: t })}>
            <b>{TYPES[t]}</b>
            <span>{TYPES_AIDE[t]}</span>
          </button>
        ))}
      </div>

      <div className="fin-carte">
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Catégorie *</span>
            <select className="fin-input" required value={v.categorie} onChange={maj("categorie")}>
              <option value="">— Choisir —</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="fin-champ">
            <span>Montant ($ CAD) *</span>
            <input className="fin-input" inputMode="decimal" placeholder="0,00" required value={v.montant} onChange={maj("montant")} />
          </label>
        </div>
        <label className="fin-champ">
          <span>Objet *</span>
          <input className="fin-input" maxLength={160} placeholder="Ex. Location de la salle — Méga Célébration" required value={v.objet} onChange={maj("objet")} />
        </label>
        <label className="fin-champ">
          <span>Détails</span>
          <textarea className="fin-input" maxLength={2000} placeholder="Précisions utiles pour l'approbation" value={v.description} onChange={maj("description")} />
        </label>
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>{remboursement ? "Date de la dépense" : "Date prévue de la dépense"}</span>
            <input className="fin-input" type="date" value={v.dateDepense} onChange={maj("dateDepense")} />
          </label>
          <label className="fin-champ">
            <span>Mode de paiement souhaité</span>
            <select className="fin-input" value={v.modePaiement} onChange={maj("modePaiement")}>
              {Object.entries(MODES_PAIEMENT).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="fin-champ">
          <span>{remboursement ? "Rembourser à (si autre que moi)" : "Payer à (fournisseur / bénéficiaire)"}</span>
          <input className="fin-input" maxLength={160} value={v.beneficiaire} onChange={maj("beneficiaire")} />
        </label>
      </div>

      <div className="fin-carte">
        <div className="fin-champ" style={{ marginBottom: 8 }}>
          <span>{remboursement ? "Facture / reçu *" : "Devis ou facture (facultatif)"}</span>
          <em>PDF ou photo · 4 Mo au total · les photos sont réduites automatiquement.</em>
        </div>
        <ul className="fin-pieces" style={{ marginBottom: 10 }}>
          {piecesExistantes.map((p) => (
            <li key={p.id}>
              <label style={{ textDecoration: aSupprimer.includes(p.id) ? "line-through" : undefined }}>
                <input
                  type="checkbox"
                  checked={!aSupprimer.includes(p.id)}
                  onChange={(e) => setASupprimer((a) => (e.target.checked ? a.filter((x) => x !== p.id) : [...a, p.id]))}
                />
                <Icone nom="trombone" taille={16} /> {p.nom}
              </label>
            </li>
          ))}
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
        <label className="fin-btn blanc" style={{ cursor: "pointer" }}>
          <Icone nom="trombone" taille={17} /> Ajouter une facture ou un fichier
          <input type="file" accept="application/pdf,image/*" multiple onChange={ajouter} style={{ display: "none" }} />
        </label>
      </div>

      <div className="fin-carte">
        {destinataires && (
          <label className="fin-champ">
            <span>Envoyer ma demande à</span>
            <select className="fin-input" value={v.destinataireId} onChange={maj("destinataireId")}>
              <option value="">Directement aux finances (autres super admins)</option>
              {destinataires.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </select>
            <em>La personne choisie approuve d&apos;abord, puis la demande va aux finances.</em>
          </label>
        )}
        {demandeId && (
          <label className="fin-champ">
            <span>Note pour l&apos;approbateur (ce qui a été corrigé)</span>
            <textarea className="fin-input" maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
        )}
        <div className="fin-note">{circuit}</div>
        {erreur && <div className="fin-erreur">{erreur}</div>}
        <button className="fin-btn plein" disabled={charge}>
          {charge ? "Envoi…" : demandeId ? "Renvoyer la demande corrigée" : "Soumettre la demande"}
        </button>
      </div>
    </form>
  );
}
