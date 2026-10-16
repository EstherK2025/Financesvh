"use client";

import { useState } from "react";
import Link from "next/link";
import { problemeMotDePasse } from "@/lib/finances";
import { appeler } from "../components/api";
import { ChampsMotDePasse } from "../activer/[jeton]/ActiverForm";

// Connexion : mot de passe, puis code reçu par courriel.
// Première connexion : mot de passe temporaire universel → création de son
// propre mot de passe → code reçu par courriel.
export default function ConnexionForm() {
  const [etape, setEtape] = useState<"mdp" | "premiere" | "code">("mdp");
  const [prenom, setPrenom] = useState("");
  const [besoinCourriel, setBesoinCourriel] = useState(false);
  const [courriel, setCourriel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [nouveau2, setNouveau2] = useState("");
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
    const r = await appeler<{ etape: string; courriel?: string; prenom?: string; besoinCourriel?: boolean }>("/api/auth/connexion", {
      json: { identifiant, motDePasse: mdp },
    });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setMdp("");
    if (r.data.etape === "connecte") {
      window.location.href = "/";
      return;
    }
    if (r.data.etape === "premiere") {
      setPrenom(r.data.prenom || "");
      setBesoinCourriel(Boolean(r.data.besoinCourriel));
      return setEtape("premiere");
    }
    setMasque(r.data.courriel || "");
    setEtape("code");
  }

  async function creerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    const pb = problemeMotDePasse(nouveau) || (nouveau !== nouveau2 ? "Les deux mots de passe ne correspondent pas." : null);
    if (pb) return setErreur(pb);
    setCharge(true);
    setErreur("");
    const r = await appeler<{ etape: string; courriel?: string }>("/api/auth/premiere", { json: { motDePasse: nouveau, courriel } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    if (r.data.etape === "connecte") {
      window.location.href = "/";
      return;
    }
    setNouveau("");
    setNouveau2("");
    setMasque(r.data.courriel || "");
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

  if (etape === "premiere")
    return (
      <form className="fin-carte" onSubmit={creerMotDePasse}>
        <div className="fin-note">
          👋 Bienvenue {prenom} ! C&apos;est votre <b>première connexion</b> : créez votre propre mot de passe. Le mot de passe
          temporaire ne fonctionnera plus pour votre compte.
        </div>
        {erreur && <div className="fin-erreur">{erreur}</div>}
        {besoinCourriel && (
          <label className="fin-champ">
            <span>Votre courriel</span>
            <input className="fin-input" type="email" autoComplete="email" required value={courriel} onChange={(e) => setCourriel(e.target.value)} />
            <em>Vous y recevrez un code à chaque connexion.</em>
          </label>
        )}
        <ChampsMotDePasse mdp={nouveau} setMdp={setNouveau} mdp2={nouveau2} setMdp2={setNouveau2} libelle="Nouveau mot de passe" />
        <button className="fin-btn plein" disabled={charge}>
          {charge ? "…" : "Enregistrer mon mot de passe"}
        </button>
      </form>
    );

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
