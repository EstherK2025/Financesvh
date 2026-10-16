"use client";

import { useState } from "react";
import { appeler } from "../components/api";

type Props = { mdp: string; aUnLogo: boolean; version: number; deuxFacteurs: boolean };

export default function Reglages({ mdp, aUnLogo, version, deuxFacteurs }: Props) {
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
    if (activer && !confirm("Activer la double authentification ? À sa prochaine connexion, chaque personne devra configurer l'application Authenticator sur son téléphone (QR code à scanner), puis entrer le code à chaque connexion.")) return;
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
              <b>Activée</b> : après le mot de passe, chaque personne entre le code à 6 chiffres de son application{" "}
              <b>Authenticator</b> (Google ou Microsoft Authenticator). Au premier passage, elle scanne un QR code.
            </>
          ) : (
            <>
              <b>Désactivée</b> : l&apos;identifiant et le mot de passe suffisent. Une fois activée, chaque personne configure
              l&apos;application <b>Authenticator</b> (Google ou Microsoft Authenticator) sur son téléphone à sa prochaine connexion.
            </>
          )}
        </p>
        <button className={`fin-btn ${deuxFacteurs ? "non" : ""}`} onClick={basculerDoubleAuth}>
          {deuxFacteurs ? "Désactiver la double authentification" : "Activer la double authentification"}
        </button>
      </div>

      <form className="fin-carte" onSubmit={enregistrerMdp}>
        <h2 style={{ marginTop: 0 }}>Mot de passe temporaire universel</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          À donner aux personnes pour leur <b>première connexion</b> (identifiant + ce mot de passe). Elles créent ensuite leur
          propre mot de passe (et configurent l&apos;Authenticator si la double authentification est activée). Il ne fonctionne plus pour un compte dont le mot de passe a été
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
        <h2 style={{ marginTop: 0 }}>Logo Vases d&apos;Honneur</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>Le logo complet officiel s&apos;affiche par défaut (barre du haut, pages de connexion, fiches PDF). Pour le remplacer par une meilleure version : PNG ou JPG sur fond blanc, format horizontal, 2 Mo max.</p>
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
