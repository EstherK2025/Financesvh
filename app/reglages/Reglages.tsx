"use client";

import { useState } from "react";
import { appeler } from "../components/api";

type Props = { mdp: string; aUnLogo: boolean; version: number; deuxFacteurs: boolean; resend: boolean };

export default function Reglages({ mdp, aUnLogo, version, deuxFacteurs, resend }: Props) {
  const [valeur, setValeur] = useState(mdp);
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState("");
  const [charge, setCharge] = useState(false);

  async function enregistrerMdp(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setOk("");
    setCharge(true);
    const r = await appeler("/api/reglages", { json: { mdpTemporaire: valeur } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setOk("Mot de passe temporaire modifié.");
  }

  async function basculerDoubleAuth() {
    const activer = !deuxFacteurs;
    if (activer && !confirm("Activer la double authentification ? Chaque connexion demandera un code envoyé au courriel du compte : vérifiez d'abord que les courriels arrivent bien.")) return;
    setErreur("");
    const r = await appeler("/api/reglages", { json: { doubleAuth: activer } });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function envoyerLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErreur("");
    const fd = new FormData();
    fd.append("logo", f);
    const r = await appeler("/api/reglages/logo", { body: fd });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  async function retirerLogo() {
    if (!confirm("Retirer le logo ?")) return;
    const r = await appeler("/api/reglages/logo", { method: "DELETE" });
    if (!r.ok) return setErreur(r.erreur);
    window.location.reload();
  }

  return (
    <>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      {ok && <div className="fin-succes">{ok}</div>}

      <div className="fin-carte">
        <h2 style={{ marginTop: 0 }}>Double authentification</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          {deuxFacteurs ? (
            <>
              <b>Activée</b> : après le mot de passe, chaque personne reçoit un code à 6 chiffres sur le courriel de son compte.
            </>
          ) : (
            <>
              <b>Désactivée</b> : l&apos;identifiant et le mot de passe suffisent. À activer quand les courriels (@evhnb.ca) et
              Resend seront prêts.
            </>
          )}
        </p>
        {!resend && !deuxFacteurs && (
          <div className="fin-note">Resend n&apos;est pas encore configuré (RESEND_API_KEY) : les codes ne pourraient pas être envoyés.</div>
        )}
        <button className={`fin-btn ${deuxFacteurs ? "non" : ""}`} onClick={basculerDoubleAuth} disabled={!deuxFacteurs && !resend}>
          {deuxFacteurs ? "Désactiver la double authentification" : "Activer la double authentification"}
        </button>
      </div>

      <form className="fin-carte" onSubmit={enregistrerMdp}>
        <h2 style={{ marginTop: 0 }}>Mot de passe temporaire universel</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          À donner aux personnes pour leur <b>première connexion</b> (identifiant + ce mot de passe). Elles créent ensuite leur
          propre mot de passe (et reçoivent un code par courriel si la double authentification est activée). Il ne fonctionne plus pour un compte dont le mot de passe a été
          choisi.
        </p>
        <div className="fin-mdp-temp">{mdp}</div>
        <label className="fin-champ">
          <span>Changer le mot de passe temporaire</span>
          <input className="fin-input" value={valeur} onChange={(e) => setValeur(e.target.value)} autoCapitalize="none" autoCorrect="off" />
        </label>
        <button className="fin-btn" disabled={charge || valeur === mdp}>
          {charge ? "…" : "Enregistrer"}
        </button>
      </form>

      <div className="fin-carte">
        <h2 style={{ marginTop: 0 }}>Logo de la barre du haut</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>Le monogramme VH officiel s&apos;affiche par défaut dans la barre du haut. Pour le remplacer : image carrée (PNG, JPG, WebP ou SVG, 2 Mo max).</p>
        {aUnLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/logo?v=${version}`} alt="Logo actuel" style={{ maxWidth: 140, maxHeight: 140, border: "1px solid var(--fin-trait)", borderRadius: 10, padding: 8, marginBottom: 12, display: "block" }} />
        )}
        <div className="fin-actions">
          <label className="fin-btn" style={{ cursor: "pointer" }}>
            {aUnLogo ? "Remplacer le logo" : "Téléverser le logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={envoyerLogo} style={{ display: "none" }} />
          </label>
          {aUnLogo && (
            <button className="fin-btn non" onClick={retirerLogo}>
              Retirer
            </button>
          )}
        </div>
      </div>
    </>
  );
}
