"use client";

import { useState } from "react";
import { PREMIER_ADMIN } from "@/lib/finances";
import { appeler } from "../components/api";
import ChampTitre from "../components/ChampTitre";

export default function InstallationForm({ titres }: { titres: string[] }) {
  const [f, setF] = useState({ motDePasseInstallation: "", ...PREMIER_ADMIN, courriel: "" } as Record<string, string>);
  const [erreur, setErreur] = useState("");
  const [lien, setLien] = useState("");
  const [charge, setCharge] = useState(false);
  const maj = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    setErreur("");
    const r = await appeler<{ lien: string }>("/api/auth/installation", { json: f });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setLien(r.data.lien);
  }

  if (lien)
    return (
      <div className="fin-carte">
        <div className="fin-succes">Compte créé.</div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>Choisissez maintenant votre mot de passe :</p>
        <a href={lien} className="fin-btn plein">
          Choisir le mot de passe
        </a>
      </div>
    );

  return (
    <form className="fin-carte" onSubmit={valider}>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      <label className="fin-champ">
        <span>Mot de passe d&apos;installation</span>
        <input className="fin-input" type="password" required value={f.motDePasseInstallation} onChange={maj("motDePasseInstallation")} />
        <em>Valeur de la variable FIN_SETUP_PASSWORD (réglée dans Vercel).</em>
      </label>
      <ChampTitre valeur={f.titre} onChange={(v) => setF({ ...f, titre: v })} titres={titres} />
      <div className="fin-grille2">
        <label className="fin-champ">
          <span>Prénom</span>
          <input className="fin-input" required value={f.prenom} onChange={maj("prenom")} placeholder="Ex. John" />
        </label>
        <label className="fin-champ">
          <span>Nom</span>
          <input className="fin-input" value={f.nom} onChange={maj("nom")} placeholder="Ex. Doe" />
        </label>
      </div>
      <label className="fin-champ">
        <span>Identifiant (pour se connecter)</span>
        <input className="fin-input" autoCapitalize="none" autoCorrect="off" required value={f.identifiant} onChange={maj("identifiant")} />
      </label>
      <label className="fin-champ">
        <span>Courriel</span>
        <input
          className="fin-input"
          type="email"
          placeholder={`${f.identifiant || "identifiant"}@evhnb.ca`}
          value={f.courriel}
          onChange={maj("courriel")}
        />
        <em>Facultatif — laisser vide : {f.identifiant || "identifiant"}@evhnb.ca.</em>
      </label>
      <button className="fin-btn plein" disabled={charge}>
        {charge ? "…" : "Créer le super admin"}
      </button>
    </form>
  );
}
