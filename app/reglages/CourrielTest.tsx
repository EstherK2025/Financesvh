"use client";

import { useState } from "react";
import { appeler } from "../components/api";

const MESSAGES: Record<string, string> = {
  envoye: "Courriel envoyé. Vérifiez la boîte de réception (et les indésirables).",
  simulation: "Non envoyé : Resend n'est pas configuré (RESEND_API_KEY manquante dans Vercel).",
  echec: "Échec de l'envoi",
};

export default function CourrielTest({ defaut }: { defaut: string }) {
  const [to, setTo] = useState(defaut);
  const [res, setRes] = useState<{ ok: boolean; texte: string } | null>(null);
  const [charge, setCharge] = useState(false);
  async function tester(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    const r = await appeler<{ statut?: string; erreur?: string }>("/api/reglages/courriel-test", { json: { to } });
    setCharge(false);
    if (!r.ok) return setRes({ ok: false, texte: r.erreur });
    const s = r.data.statut || "";
    setRes({ ok: s === "envoye", texte: (MESSAGES[s] || s) + (r.data.erreur ? ` : ${r.data.erreur}` : "") });
  }
  return (
    <form onSubmit={tester} className="fin-actions" style={{ alignItems: "flex-end" }}>
      <label className="fin-champ" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
        <span>Envoyer un courriel de test à</span>
        <input className="fin-input" type="email" required value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <button className="fin-btn" disabled={charge}>
        {charge ? "…" : "Tester"}
      </button>
      {res && <div className={res.ok ? "fin-succes" : "fin-erreur"} style={{ width: "100%", marginTop: 10 }}>{res.texte}</div>}
    </form>
  );
}
