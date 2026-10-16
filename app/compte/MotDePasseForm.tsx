"use client";

import { useState } from "react";
import { problemeMotDePasse } from "@/lib/finances";
import { appeler } from "../components/api";
import { ChampsMotDePasse } from "../activer/[jeton]/ActiverForm";
import ChampMotDePasse from "../components/ChampMotDePasse";

export default function MotDePasseForm() {
  const [actuel, setActuel] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState(false);
  const [charge, setCharge] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const pb = problemeMotDePasse(mdp) || (mdp !== mdp2 ? "Les deux mots de passe ne correspondent pas." : null);
    if (pb) return setErreur(pb);
    setErreur("");
    setCharge(true);
    const r = await appeler("/api/auth/motdepasse", { json: { actuel, nouveau: mdp } });
    setCharge(false);
    if (!r.ok) return setErreur(r.erreur);
    setActuel("");
    setMdp("");
    setMdp2("");
    setOk(true);
  }

  return (
    <form className="fin-carte" onSubmit={valider}>
      {erreur && <div className="fin-erreur">{erreur}</div>}
      {ok && <div className="fin-succes">Mot de passe modifié. Vos autres appareils ont été déconnectés.</div>}
      <label className="fin-champ">
        <span>Mot de passe actuel</span>
        <ChampMotDePasse autoComplete="current-password" required value={actuel} onChange={(e) => setActuel(e.target.value)} />
      </label>
      <ChampsMotDePasse mdp={mdp} setMdp={setMdp} mdp2={mdp2} setMdp2={setMdp2} libelle="Nouveau mot de passe" />
      <button className="fin-btn" disabled={charge}>
        {charge ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}
