"use client";

import { useState } from "react";
import { appeler } from "../components/api";

// Liste des titres proposés (GA, AP, PA…) : ajouter, retirer, réordonner.
export default function ReglagesTitres({ titres }: { titres: string[] }) {
  const [liste, setListe] = useState(titres);
  const [nouveau, setNouveau] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function enregistrer(l: string[]) {
    setMsg(null);
    const r = await appeler<{ titres: string[] }>("/api/reglages", { json: { titres: l } });
    if (!r.ok) return setMsg({ ok: false, t: r.erreur });
    setListe(r.data.titres);
    setMsg({ ok: true, t: "Liste des titres enregistrée." });
  }
  const deplacer = (i: number, d: number) => {
    const l = [...liste];
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    enregistrer(l);
  };

  return (
    <div className="fin-carte">
      <h2 style={{ marginTop: 0 }}>Titres des personnes</h2>
      <p style={{ fontSize: 14, marginBottom: 12 }}>
        Proposés dans la liste « Titre » (première connexion, comptes). Un titre retiré reste affiché pour les personnes qui l&apos;ont déjà.
      </p>
      {msg && <div className={msg.ok ? "fin-succes" : "fin-erreur"}>{msg.t}</div>}
      <ul className="fin-puces">
        {liste.map((t, i) => (
          <li key={t}>
            <b>{t}</b>
            <span className="fin-actions" style={{ flexWrap: "nowrap" }}>
              <button className="fin-btn blanc petit" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label={`Monter ${t}`}>
                ↑
              </button>
              <button className="fin-btn blanc petit" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1} aria-label={`Descendre ${t}`}>
                ↓
              </button>
              <button className="fin-btn non petit" onClick={() => enregistrer(liste.filter((x) => x !== t))} disabled={liste.length === 1}>
                Retirer
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="fin-actions"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (nouveau.trim()) enregistrer([...liste, nouveau.trim()]).then(() => setNouveau(""));
        }}
      >
        <input className="fin-input" style={{ flex: 1, minWidth: 160 }} placeholder="Nouveau titre (ex. Pasteur)" value={nouveau} onChange={(e) => setNouveau(e.target.value)} maxLength={30} />
        <button className="fin-btn">Ajouter</button>
      </form>
    </div>
  );
}
