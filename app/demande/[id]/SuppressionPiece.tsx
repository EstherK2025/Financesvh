"use client";

import { useState } from "react";
import { appeler } from "../../components/api";

type Attente = { id: string; motif: string; par: string; autorises: string[]; dejaAutorise: boolean; estDemandeur: boolean };

// Super administrateur : demander la suppression d'un fichier, ou autoriser /
// refuser une suppression demandée (3 autorisations nécessaires).
export default function SuppressionPiece({ pieceId, nom, attente, requis, possible }: { pieceId: string; nom: string; attente: Attente | null; requis: number; possible: boolean }) {
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  async function demander() {
    setErreur("");
    if (!possible) return setErreur(`Il faut au moins ${requis} super administrateurs actifs pour supprimer un fichier.`);
    const motif = prompt(`Pourquoi supprimer « ${nom} » ?\n\nLa suppression n'aura lieu qu'après l'autorisation de ${requis} super administrateurs (vous compris).`);
    if (motif === null) return;
    const conf = prompt(`Confirmez : tapez SUPPRIMER pour demander la suppression de « ${nom} ».`);
    if (conf === null) return;
    setCharge(true);
    const r = await appeler(`/api/pieces/${pieceId}/suppression`, { json: { motif, confirmation: conf.trim().toUpperCase() } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function agir(action: "autoriser" | "refuser" | "annuler") {
    if (!attente) return;
    const textes = {
      autoriser: `Autoriser la suppression définitive de « ${nom} » ?\n\nMotif : ${attente.motif}`,
      refuser: `Refuser la suppression de « ${nom} » ? Le fichier sera conservé.`,
      annuler: `Annuler votre demande de suppression de « ${nom} » ?`,
    };
    if (!confirm(textes[action])) return;
    setCharge(true);
    const r = await appeler<{ effectuee?: boolean }>(`/api/suppressions/${attente.id}`, { json: { action } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  if (!attente)
    return (
      <>
        <button type="button" className="fin-btn non petit" style={{ marginLeft: 6 }} onClick={demander} disabled={charge}>
          Supprimer
        </button>
        {erreur && <div className="fin-erreur" style={{ marginTop: 6 }}>{erreur}</div>}
      </>
    );

  return (
    <div className="fin-suppression">
      <b>
        Suppression demandée — {attente.autorises.length}/{requis} autorisations
      </b>
      <div>
        Par {attente.par} · motif : « {attente.motif} »
      </div>
      <div style={{ color: "var(--fin-gris)" }}>Autorisée par : {attente.autorises.join(", ")}</div>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      <div className="fin-actions" style={{ marginTop: 6 }}>
        {!attente.dejaAutorise && (
          <button type="button" className="fin-btn non petit" disabled={charge} onClick={() => agir("autoriser")}>
            Autoriser la suppression
          </button>
        )}
        {!attente.estDemandeur && (
          <button type="button" className="fin-btn blanc petit" disabled={charge} onClick={() => agir("refuser")}>
            Refuser
          </button>
        )}
        {attente.estDemandeur && (
          <button type="button" className="fin-btn blanc petit" disabled={charge} onClick={() => agir("annuler")}>
            Annuler ma demande
          </button>
        )}
      </div>
    </div>
  );
}
