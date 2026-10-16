"use client";

import { useState } from "react";
import { appeler } from "../../components/api";

type Peut = { approuver: boolean; refuser: boolean; payer: boolean; reviser: boolean; annuler: boolean };

// Boutons de décision selon le rôle et l'étape de la demande.
export default function Decision({ demandeId, statut, peut }: { demandeId: string; statut: string; peut: Peut }) {
  const [commentaire, setCommentaire] = useState("");
  const [referencePaiement, setReference] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  if (!peut.approuver && !peut.payer && !peut.annuler && !peut.reviser) return null;

  async function agir(action: string) {
    setErreur("");
    if (action === "refuser" && !commentaire.trim()) return setErreur("Indiquez le motif du refus : il sera transmis au demandeur.");
    if (action === "annuler" && !confirm("Annuler définitivement cette demande ?")) return;
    setCharge(true);
    const r = await appeler(`/api/demandes/${demandeId}/action`, {
      json: { action, commentaire, reference: referencePaiement },
    });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  return (
    <div className="fin-carte" style={{ borderColor: "#000", marginBottom: 14 }}>
      {peut.approuver && (
        <>
          <h2 style={{ marginTop: 0 }}>{statut === "attente_leader" ? "Votre approbation (ministère)" : "Décision des finances"}</h2>
          <label className="fin-champ">
            <span>Commentaire (obligatoire en cas de refus)</span>
            <textarea className="fin-input" maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <div className="fin-actions">
            <button className="fin-btn ok" disabled={charge} onClick={() => agir("approuver")}>
              ✓ Approuver
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

      {(peut.reviser || peut.annuler) && (
        <>
          <h2 style={{ marginTop: peut.approuver || peut.payer ? 20 : 0 }}>Ma demande</h2>
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
