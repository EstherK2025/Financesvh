"use client";

import { useState } from "react";
import { appeler } from "../components/api";

type Props = { cle: "titres" | "categories"; valeurs: string[]; titre: string; aide: string; exemple: string; max: number; libelle: string };

// Liste modifiable (titres des personnes, catégories de dépenses) : ajouter, retirer, réordonner.
export default function ReglagesListe({ cle, valeurs, titre, aide, exemple, max, libelle }: Props) {
  const [liste, setListe] = useState(valeurs);
  const [nouveau, setNouveau] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function enregistrer(l: string[]) {
    setMsg(null);
    const r = await appeler<{ liste: string[] }>("/api/reglages", { json: { [cle]: l } });
    if (!r.ok) return setMsg({ ok: false, t: r.erreur });
    setListe(r.data.liste);
    setMsg({ ok: true, t: "Liste enregistrée." });
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
      <h2 style={{ marginTop: 0 }}>{titre}</h2>
      <p style={{ fontSize: 14, marginBottom: 12 }}>{aide}</p>
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
        <input className="fin-input" style={{ flex: 1, minWidth: 160 }} placeholder={exemple} value={nouveau} onChange={(e) => setNouveau(e.target.value)} maxLength={max} aria-label={libelle} />
        <button className="fin-btn">Ajouter</button>
      </form>
    </div>
  );
}
