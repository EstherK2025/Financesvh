"use client";

import { useState } from "react";
import { appeler } from "../components/api";

// Zone sensible : supprimer TOUTES les demandes (remise à zéro).
export default function ReglagesPurge({ nbDemandes }: { nbDemandes: number }) {
  const [confirmation, setConfirmation] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [charge, setCharge] = useState(false);

  async function purger(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Supprimer définitivement les ${nbDemandes} demandes (annulées ou non), leurs factures et leur historique ? Cette action est irréversible.`)) return;
    setCharge(true);
    setMsg(null);
    const r = await appeler<{ supprimees: number }>("/api/reglages/purge", { json: { confirmation } });
    setCharge(false);
    if (!r.ok) return setMsg({ ok: false, t: r.erreur });
    setMsg({ ok: true, t: `${r.data.supprimees} demande(s) supprimée(s).` });
    setConfirmation("");
    setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <form className="fin-carte fin-zone-sensible" onSubmit={purger}>
      <h2 style={{ marginTop: 0 }}>Zone sensible — supprimer toutes les demandes</h2>
      <p style={{ fontSize: 14, marginBottom: 12 }}>
        Remise à zéro : supprime les <b>{nbDemandes}</b> demande{nbDemandes > 1 ? "s" : ""} (annulées ou non), avec leurs factures et leur
        historique. Les comptes ne sont pas touchés. <b>Irréversible.</b> Pensez à télécharger les fiches PDF à conserver avant.
      </p>
      {msg && <div className={msg.ok ? "fin-succes" : "fin-erreur"}>{msg.t}</div>}
      <label className="fin-champ">
        <span>Tapez SUPPRIMER pour confirmer</span>
        <input className="fin-input" autoCapitalize="characters" autoCorrect="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </label>
      <button className="fin-btn non" disabled={charge || confirmation !== "SUPPRIMER" || nbDemandes === 0}>
        {charge ? "…" : "Supprimer toutes les demandes"}
      </button>
    </form>
  );
}
