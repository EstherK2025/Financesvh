"use client";

import { useState } from "react";
import { appeler } from "../../components/api";
import SignaturePad from "../../components/SignaturePad";

type Peut = { approuver: boolean; refuser: boolean; payer: boolean; reviser: boolean; annuler: boolean };
type Props = {
  demandeId: string;
  statut: string;
  peut: Peut;
  externe?: boolean; // compte partagé d'approbateur externe : identité à saisir
  attribution?: { actuel: string; choix: { id: string; nom: string }[] }; // super admin : confier la 1re approbation
};

// Décision selon le rôle et l'étape de la demande. Approuver = signer.
export default function Decision({ demandeId, statut, peut, externe = false, attribution }: Props) {
  const [commentaire, setCommentaire] = useState("");
  const [referencePaiement, setReference] = useState("");
  const [signature, setSignature] = useState("");
  const [identite, setIdentite] = useState({ signataireNom: "", signataireFonction: "", justification: "" });
  const [cible, setCible] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  if (!peut.approuver && !peut.payer && !peut.annuler && !peut.reviser && !attribution) return null;

  async function agir(action: string) {
    setErreur("");
    if (externe && (action === "approuver" || action === "refuser")) {
      if (!identite.signataireNom.trim() || !identite.signataireFonction.trim())
        return setErreur("Indiquez votre nom complet et votre fonction dans l'église.");
      if (!identite.justification.trim()) return setErreur("Expliquez pourquoi c'est vous qui approuvez cette demande.");
    }
    if (action === "approuver" && !signature) return setErreur("Signez dans le cadre avant d'approuver.");
    if (action === "refuser" && !commentaire.trim()) return setErreur("Indiquez le motif du refus : il sera transmis au demandeur.");
    if (action === "annuler" && !confirm("Annuler définitivement cette demande ?")) return;
    if (action === "attribuer" && !cible) return setErreur("Choisissez la personne.");
    setCharge(true);
    const r = await appeler(`/api/demandes/${demandeId}/action`, {
      json: { action, commentaire, reference: referencePaiement, signature, approbateurId: cible, ...identite },
    });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  const champ = (k: keyof typeof identite, libelle: string, aide?: string, long = false) => (
    <label className="fin-champ">
      <span>{libelle} *</span>
      {long ? (
        <textarea className="fin-input" maxLength={1000} value={identite[k]} onChange={(e) => setIdentite({ ...identite, [k]: e.target.value })} />
      ) : (
        <input className="fin-input" maxLength={120} value={identite[k]} onChange={(e) => setIdentite({ ...identite, [k]: e.target.value })} />
      )}
      {aide && <em>{aide}</em>}
    </label>
  );

  return (
    <div className="fin-carte fin-decision">
      {peut.approuver && (
        <>
          <h2 style={{ marginTop: 0 }}>
            {externe ? "Votre décision (approbateur externe)" : statut === "attente_leader" ? "Votre approbation (ministère)" : "Décision des finances"}
          </h2>
          {externe && (
            <>
              <div className="fin-note">
                Compte partagé : identifiez-vous. Votre nom, votre fonction, votre signature et votre justification figureront sur la
                fiche de la demande.
              </div>
              {champ("signataireNom", "Nom complet", "Ex. GA John Doe")}
              {champ("signataireFonction", "Fonction dans l'église", "Ex. Ancien, trésorier…")}
              {champ("justification", "Pourquoi est-ce vous qui approuvez cette demande ?", undefined, true)}
            </>
          )}
          <label className="fin-champ">
            <span>Commentaire (obligatoire en cas de refus)</span>
            <textarea className="fin-input" maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <div className="fin-champ">
            <span>Signature (obligatoire pour approuver)</span>
            <SignaturePad onChange={setSignature} />
            <em>La signature, votre nom et la date figureront automatiquement sur la fiche PDF.</em>
          </div>
          <div className="fin-actions">
            <button className="fin-btn ok" disabled={charge} onClick={() => agir("approuver")}>
              ✓ Signer et approuver
            </button>
            <button className="fin-btn non" disabled={charge} onClick={() => agir("refuser")}>
              ✕ Refuser (renvoyer au demandeur)
            </button>
          </div>
        </>
      )}

      {peut.payer && (
        <>
          <h2 style={{ marginTop: 0 }}>Paiement</h2>
          <label className="fin-champ">
            <span>Référence du paiement (n° Interac, chèque…)</span>
            <input className="fin-input" maxLength={120} value={referencePaiement} onChange={(e) => setReference(e.target.value)} />
          </label>
          <button className="fin-btn accent plein" disabled={charge} onClick={() => agir("payer")}>
            Marquer comme payée
          </button>
        </>
      )}

      {attribution && (
        <>
          <h2 style={{ marginTop: peut.approuver || peut.payer ? 20 : 0 }}>Attribuer la 1re approbation</h2>
          <p style={{ fontSize: 13, color: "var(--fin-gris)", marginBottom: 8 }}>
            Actuellement : <b>{attribution.actuel}</b>. Confiez-la à une autre personne (ex. l&apos;approbateur externe).
          </p>
          <div className="fin-actions">
            <select className="fin-input" style={{ flex: 1, minWidth: 180 }} value={cible} onChange={(e) => setCible(e.target.value)}>
              <option value="">— Choisir —</option>
              {attribution.choix.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <button className="fin-btn blanc" disabled={charge} onClick={() => agir("attribuer")}>
              Attribuer
            </button>
          </div>
        </>
      )}

      {(peut.reviser || peut.annuler) && (
        <>
          <h2 style={{ marginTop: peut.approuver || peut.payer || attribution ? 20 : 0 }}>Ma demande</h2>
          <div className="fin-actions">
            {peut.reviser && (
              <a href="#reviser" className="fin-btn">
                Corriger et renvoyer
              </a>
            )}
            {peut.annuler && (
              <button className="fin-btn non" disabled={charge} onClick={() => agir("annuler")}>
                Annuler la demande
              </button>
            )}
          </div>
        </>
      )}

      {erreur && (
        <div className="fin-erreur" style={{ marginTop: 12, marginBottom: 0 }}>
          {erreur}
        </div>
      )}
    </div>
  );
}
