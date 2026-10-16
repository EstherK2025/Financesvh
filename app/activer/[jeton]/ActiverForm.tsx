"use client";

import { useState } from "react";
import Link from "next/link";
import { problemeMotDePasse } from "@/lib/finances";
import { appeler } from "../../components/api";
import ChampMotDePasse from "../../components/ChampMotDePasse";

export default function ActiverForm({ jeton, demanderCourriel = false }: { jeton: string; demanderCourriel?: boolean }) {
  const [courriel, setCourriel] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState(false);
  const [charge, setCharge] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    const pb = problemeMotDePasse(mdp) || (mdp !== mdp2 ? "Les deux mots de passe ne correspondent pas." : null);
    if (pb) return setErreur(pb);
    setCharge(true);
    const r = await appeler("/api/auth/activer", { json: { jeton, motDePasse: mdp, courriel } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setFait(true);
  }

  if (fait)
    return (
      <div className="fin-carte">
        <div className="fin-succes">Mot de passe enregistré.</div>
        <Link href="/connexion" className="fin-btn plein">
          Se connecter
        </Link>
      </div>
    );

  return (
    <form className="fin-carte" onSubmit={valider}>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      {demanderCourriel && (
        <label className="fin-champ">
          <span>Votre courriel</span>
          <input className="fin-input" type="email" autoComplete="email" required value={courriel} onChange={(e) => setCourriel(e.target.value)} />
          <em>Vous y recevrez un code à chaque connexion (double authentification).</em>
        </label>
      )}
      <ChampsMotDePasse mdp={mdp} setMdp={setMdp} mdp2={mdp2} setMdp2={setMdp2} />
      <button className="fin-btn plein" disabled={charge}>
        {charge ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function ChampsMotDePasse(p: { mdp: string; setMdp: (v: string) => void; mdp2: string; setMdp2: (v: string) => void; libelle?: string }) {
  return (
    <>
      <label className="fin-champ">
        <span>{p.libelle || "Mot de passe"}</span>
        <ChampMotDePasse autoComplete="new-password" required value={p.mdp} onChange={(e) => p.setMdp(e.target.value)} />
        <em>10 caractères minimum, avec une majuscule, une minuscule et un chiffre.</em>
      </label>
      <label className="fin-champ">
        <span>Confirmer</span>
        <ChampMotDePasse autoComplete="new-password" required value={p.mdp2} onChange={(e) => p.setMdp2(e.target.value)} />
      </label>
    </>
  );
}
