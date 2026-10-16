"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { problemeMotDePasse } from "@/lib/finances";
import { appeler } from "../components/api";
import { ChampsMotDePasse } from "../activer/[jeton]/ActiverForm";

type Etape = "mdp" | "premiere" | "enrolement" | "code";
type Suite = { etape: "connecte" | "premiere" | "enrolement" | "code"; compte?: string; prenom?: string; nom?: string };

// Connexion : identifiant + mot de passe, puis (si la double authentification
// est activée) code de l'application Authenticator.
// Première connexion : mot de passe temporaire universel → création de son
// propre mot de passe → (si activée) configuration de l'Authenticator.
export default function ConnexionForm() {
  const [etape, setEtape] = useState<Etape>("mdp");
  const [identifiant, setIdentifiant] = useState("");
  const [mdp, setMdp] = useState("");
  const [compte, setCompte] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [nouveau2, setNouveau2] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<{ qr: string; cle: string; lien: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  function suivre(s: Suite) {
    setErreur("");
    setCode("");
    if (s.etape === "connecte") {
      window.location.href = "/";
      return;
    }
    if (s.etape === "premiere") {
      setCompte(s.compte || "");
      setPrenom(s.prenom || "");
      setNomFamille(s.nom || "");
    }
    setEtape(s.etape);
  }

  // Au premier passage avec la double authentification : QR code à scanner.
  useEffect(() => {
    if (etape !== "enrolement" || qr) return;
    fetch("/api/auth/authenticator")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setEtape("mdp");
          setErreur(d.error || "Session expirée. Reconnectez-vous.");
        } else setQr(d);
      })
      .catch(() => setErreur("Connexion impossible. Vérifiez votre réseau."));
  }, [etape, qr]);

  async function envoyerMdp(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    setErreur("");
    const r = await appeler<Suite>("/api/auth/connexion", { json: { identifiant, motDePasse: mdp } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setMdp("");
    suivre(r.data);
  }

  async function creerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    const pb =
      (!prenom.trim() || !nomFamille.trim() ? "Indiquez votre prénom et votre nom." : null) ||
      problemeMotDePasse(nouveau) ||
      (nouveau !== nouveau2 ? "Les deux mots de passe ne correspondent pas." : null);
    if (pb) return setErreur(pb);
    setCharge(true);
    setErreur("");
    const r = await appeler<Suite>("/api/auth/premiere", { json: { motDePasse: nouveau, prenom, nom: nomFamille } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setNouveau("");
    setNouveau2("");
    suivre(r.data);
  }

  async function envoyerCode(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    setErreur("");
    const r = await appeler(etape === "enrolement" ? "/api/auth/authenticator" : "/api/auth/code", { json: { code } });
    setCharge(false);
    if (!r.ok) {
      setCode("");
      return setErreur(r.erreur);
    }
    window.location.href = "/";
  }

  const champCode = (
    <label className="fin-champ">
      <span>Code à 6 chiffres affiché dans l&apos;application</span>
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
  );

  if (etape === "premiere")
    return (
      <form className="fin-carte" onSubmit={creerMotDePasse}>
        <div className="fin-note">
          👋 Bienvenue ! C&apos;est la <b>première connexion</b> du compte <b>{compte}</b>. Indiquez votre nom (responsable de ce
          compte) et créez votre propre mot de passe. Le mot de passe temporaire ne fonctionnera plus pour ce compte.
        </div>
        {erreur && <div className="fin-erreur">{erreur}</div>}
        <div className="fin-grille2">
          <label className="fin-champ">
            <span>Prénom (ou titre + prénom)</span>
            <input className="fin-input" required autoComplete="given-name" placeholder="Ex. AP Cindy" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          </label>
          <label className="fin-champ">
            <span>Nom</span>
            <input className="fin-input" required autoComplete="family-name" value={nomFamille} onChange={(e) => setNomFamille(e.target.value)} />
          </label>
        </div>
        <ChampsMotDePasse mdp={nouveau} setMdp={setNouveau} mdp2={nouveau2} setMdp2={setNouveau2} libelle="Nouveau mot de passe" />
        <button className="fin-btn plein" disabled={charge}>
          {charge ? "…" : "Enregistrer mon mot de passe"}
        </button>
      </form>
    );

  if (etape === "enrolement")
    return (
      <form className="fin-carte" onSubmit={envoyerCode}>
        <div className="fin-note">
          🔐 <b>Double authentification</b> — à faire une seule fois : configurez l&apos;application <b>Authenticator</b> sur votre
          téléphone (Google Authenticator ou Microsoft Authenticator, gratuites).
        </div>
        <ol className="fin-instructions">
          <li>Ouvrez l&apos;application et touchez « + » (ajouter un compte).</li>
          <li>Scannez ce QR code — ou choisissez « saisir une clé » et tapez la clé ci-dessous.</li>
          <li>Entrez le code à 6 chiffres que l&apos;application affiche.</li>
        </ol>
        {qr ? (
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.qr} alt="QR code à scanner avec l'application Authenticator" width={220} height={220} className="fin-qr" />
            <div style={{ fontSize: 12, color: "var(--fin-gris)", marginTop: 8 }}>Clé (saisie manuelle) :</div>
            <code className="fin-cle">{qr.cle}</code>
            <div style={{ marginTop: 8 }}>
              <a href={qr.lien} style={{ fontSize: 13, color: "var(--fin-primaire)", fontWeight: 700 }}>
                Sur ce téléphone ? Ouvrir directement dans l&apos;application
              </a>
            </div>
          </div>
        ) : (
          <div className="fin-vide" style={{ marginBottom: 14 }}>
            Chargement du QR code…
          </div>
        )}
        {erreur && <div className="fin-erreur">{erreur}</div>}
        {champCode}
        <button className="fin-btn plein" disabled={charge || code.length !== 6}>
          {charge ? "…" : "Valider et me connecter"}
        </button>
      </form>
    );

  if (etape === "code")
    return (
      <form className="fin-carte" onSubmit={envoyerCode}>
        <div className="fin-note">
          🔐 <b>Double authentification</b> — ouvrez votre application <b>Authenticator</b> et entrez le code affiché pour « Finances VH ».
        </div>
        {erreur && <div className="fin-erreur">{erreur}</div>}
        {champCode}
        <button className="fin-btn plein" disabled={charge || code.length !== 6}>
          {charge ? "…" : "Valider"}
        </button>
        <p style={{ fontSize: 12, color: "var(--fin-gris)", marginTop: 12 }}>
          Téléphone perdu ou changé ? Demandez au super administrateur de réinitialiser votre Authenticator.
        </p>
        <button type="button" className="fin-btn blanc petit" style={{ marginTop: 4 }} onClick={() => setEtape("mdp")}>
          Retour
        </button>
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
