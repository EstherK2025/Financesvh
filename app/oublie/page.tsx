"use client";

import { useState } from "react";
import Link from "next/link";
import { appeler } from "../components/api";

export default function OubliePage() {
  const [identifiant, setIdentifiant] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [charge, setCharge] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    await appeler("/api/auth/oublie", { json: { identifiant } });
    setCharge(false);
    setEnvoye(true);
  }

  return (
    <div className="fin-etroit">
      <h1>Mot de passe oublié</h1>
      <p className="sous">Recevez un lien pour choisir un nouveau mot de passe.</p>
      <form className="fin-carte" onSubmit={envoyer}>
        {envoye ? (
          <div className="fin-succes">Si ce compte existe, un lien vient d&apos;être envoyé (valable 24 h).</div>
        ) : (
          <>
            <label className="fin-champ">
              <span>Identifiant ou courriel</span>
              <input className="fin-input" autoCapitalize="none" autoCorrect="off" required value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} />
            </label>
            <button className="fin-btn plein" disabled={charge}>
              {charge ? "…" : "Envoyer le lien"}
            </button>
          </>
        )}
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}>
          <Link href="/connexion" style={{ color: "#000" }}>
            Retour à la connexion
          </Link>
        </p>
      </form>
    </div>
  );
}
