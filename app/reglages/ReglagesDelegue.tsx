"use client";

import { useState } from "react";
import { appeler } from "../components/api";

type Compte = { identifiant: string; actif: boolean; aTraiter: number } | null;

// Compte UNIQUE d'approbateur externe : identifiant et mot de passe fixes,
// partagés. À chaque décision, la personne saisit nom, fonction, signature et
// justification.
export default function ReglagesDelegue({ compte }: { compte: Compte }) {
  const [identifiant, setIdentifiant] = useState(compte?.identifiant || "approbateur");
  const [mdp, setMdp] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [charge, setCharge] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCharge(true);
    const corps: Record<string, string> = {};
    if (!compte || identifiant !== compte.identifiant) corps.identifiant = identifiant;
    if (mdp || !compte) corps.motDePasse = mdp;
    const r = await appeler("/api/reglages/delegue", { json: corps });
    setCharge(false);
    if (!r.ok) return setMsg({ ok: false, t: r.erreur });
    window.location.reload();
  }
  async function basculer() {
    const r = await appeler("/api/reglages/delegue", { method: "PATCH", json: { actif: !compte?.actif } });
    if (!r.ok) return setMsg({ ok: false, t: r.erreur });
    window.location.reload();
  }

  return (
    <form className="fin-carte" onSubmit={enregistrer}>
      <h2 style={{ marginTop: 0 }}>Approbateur externe (compte partagé)</h2>
      <p style={{ fontSize: 14, marginBottom: 12 }}>
        Un seul compte, avec un <b>identifiant</b> et un <b>mot de passe fixes</b>, pour les personnes qui ne sont ni super
        administrateur ni ministère / département. Vous lui attribuez une demande depuis la demande (« Attribuer la 1re approbation »)
        ou en l&apos;envoyant à « Approbateur externe ». Avant d&apos;approuver, la personne connectée indique son <b>nom complet</b>, sa{" "}
        <b>fonction dans l&apos;église</b>, sa <b>signature</b> et <b>pourquoi c&apos;est elle qui approuve</b>.
      </p>
      {compte && (
        <div className="fin-note">
          Compte <b>{compte.actif ? "actif" : "désactivé"}</b> · identifiant <code>{compte.identifiant}</code> · {compte.aTraiter} demande
          {compte.aTraiter > 1 ? "s" : ""} en attente
        </div>
      )}
      {msg && <div className={msg.ok ? "fin-succes" : "fin-erreur"}>{msg.t}</div>}
      <div className="fin-grille2">
        <label className="fin-champ">
          <span>Identifiant fixe</span>
          <input className="fin-input" autoCapitalize="none" autoCorrect="off" required value={identifiant} onChange={(e) => setIdentifiant(e.target.value.toLowerCase())} />
        </label>
        <label className="fin-champ">
          <span>{compte ? "Nouveau mot de passe fixe (laisser vide pour garder)" : "Mot de passe fixe"}</span>
          <input className="fin-input" autoCapitalize="none" autoCorrect="off" required={!compte} value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" />
        </label>
      </div>
      <div className="fin-actions">
        <button className="fin-btn" disabled={charge}>
          {charge ? "…" : compte ? "Enregistrer" : "Créer le compte partagé"}
        </button>
        {compte && (
          <button type="button" className={`fin-btn ${compte.actif ? "non" : "blanc"}`} onClick={basculer}>
            {compte.actif ? "Désactiver" : "Réactiver"}
          </button>
        )}
      </div>
    </form>
  );
}
