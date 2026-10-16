"use client";

import { useState } from "react";
import Link from "next/link";
import { appeler } from "../components/api";

export default function OubliePage() {
  const [courriel, setCourriel] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [charge, setCharge] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    await appeler("/api/auth/oublie", { json: { courriel } });
    setCharge(false);
    setEnvoye(true);
  }

  return (
    <div className="fin-etroit">
      <h1>Mot de passe oublié</h1>
      <p className="sous">Recevez un lien pour choisir un nouveau mot de passe.</p>
      <form className="fin-carte" onSubmit={envoyer}>
        {envoye ? (
          <div className="fin-succes">Si un compte existe pour cette adresse, un lien vient d&apos;être envoyé (valable 24 h).</div>
        ) : (
          <>
            <label className="fin-champ">
              <span>Courriel</span>
              <input className="fin-input" type="email" required value={courriel} onChange={(e) => setCourriel(e.target.value)} />
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
