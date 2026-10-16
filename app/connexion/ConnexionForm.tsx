"use client";

import { useState } from "react";
import Link from "next/link";
import { appeler } from "../components/api";

// Connexion en 2 étapes : mot de passe, puis code reçu par courriel.
export default function ConnexionForm() {
  const [etape, setEtape] = useState<"mdp" | "code">("mdp");
  const [identifiant, setIdentifiant] = useState("");
  const [mdp, setMdp] = useState("");
  const [code, setCode] = useState("");
  const [masque, setMasque] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [charge, setCharge] = useState(false);

  async function envoyerMdp(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    setErreur("");
    const r = await appeler<{ courriel: string }>("/api/auth/connexion", { json: { identifiant, motDePasse: mdp } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setMasque(r.data.courriel);
    setMdp("");
    setEtape("code");
  }

  async function envoyerCode(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    setErreur("");
    const r = await appeler("/api/auth/code", { json: { code } });
    setCharge(false);
    if (!r.ok) {
      setCode("");
      return setErreur(r.erreur);
    }
    window.location.href = "/";
  }

  async function renvoyer() {
    setErreur("");
    setInfo("");
    const r = await appeler("/api/auth/renvoyer");
    if (!r.ok) {
      setEtape("mdp");
      return setErreur(r.erreur);
    }
    setInfo("Un nouveau code vient d'être envoyé.");
  }

  if (etape === "code")
    return (
      <form className="fin-carte" onSubmit={envoyerCode}>
        <div className="fin-note">
          🔐 <b>Double authentification</b> — un code à 6 chiffres a été envoyé à <b>{masque}</b>.
        </div>
        {erreur && <div className="fin-erreur">{erreur}</div>}
        {info && <div className="fin-succes">{info}</div>}
        <label className="fin-champ">
          <span>Code de vérification</span>
          <input
            className="fin-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ fontSize: 26, letterSpacing: 8, textAlign: "center" }}
          />
        </label>
        <button className="fin-btn plein" disabled={charge || code.length !== 6}>
          {charge ? "…" : "Valider"}
        </button>
        <div className="fin-actions" style={{ justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
          <button type="button" className="fin-btn blanc petit" onClick={renvoyer}>
            Renvoyer un code
          </button>
          <button type="button" className="fin-btn blanc petit" onClick={() => setEtape("mdp")}>
            Retour
          </button>
        </div>
      </form>
    );

  return (
    <form className="fin-carte" onSubmit={envoyerMdp}>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      <label className="fin-champ">
        <span>Identifiant ou courriel</span>
        <input
          className="fin-input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
        />
      </label>
      <label className="fin-champ">
        <span>Mot de passe</span>
        <input className="fin-input" type="password" autoComplete="current-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />
      </label>
      <button className="fin-btn plein" disabled={charge}>
        {charge ? "…" : "Continuer"}
      </button>
      <p style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}>
        <Link href="/oublie" style={{ color: "#000" }}>
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
