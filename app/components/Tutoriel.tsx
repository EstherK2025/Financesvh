"use client";

import { useEffect, useRef, useState } from "react";
import type { Etape } from "@/lib/tutoriel";
import Icone from "./Icone";

// Tutoriel en plein écran, étape par étape (boutons, points, flèches du
// clavier ou glissement gauche / droite sur téléphone).
export default function Tutoriel({ etapes, onFermer }: { etapes: Etape[]; onFermer: () => void }) {
  const [i, setI] = useState(0);
  const depart = useRef<number | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const derniere = i === etapes.length - 1;
  const e = etapes[i];

  useEffect(() => {
    bouton.current?.focus();
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onFermer();
      if (ev.key === "ArrowRight") setI((n) => Math.min(n + 1, etapes.length - 1));
      if (ev.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", clavier);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", clavier);
      document.body.style.overflow = avant;
    };
  }, [etapes.length, onFermer]);

  return (
    <div className="fin-tuto-fond" role="dialog" aria-modal="true" aria-labelledby="fin-tuto-titre" data-pas-glisser>
      <div
        className="fin-tuto"
        onTouchStart={(ev) => (depart.current = ev.touches[0].clientX)}
        onTouchEnd={(ev) => {
          if (depart.current === null) return;
          const dx = ev.changedTouches[0].clientX - depart.current;
          depart.current = null;
          if (dx < -60) setI((n) => Math.min(n + 1, etapes.length - 1));
          if (dx > 60) setI((n) => Math.max(n - 1, 0));
        }}
      >
        <div className="fin-tuto-haut">
          <span className="fin-tuto-compte">
            Étape {i + 1} sur {etapes.length}
          </span>
          <button type="button" className="fin-tuto-passer" onClick={onFermer}>
            {derniere ? "Fermer" : "Passer"}
          </button>
        </div>
        <div className="fin-tuto-corps" key={i}>
          <span className="fin-tuto-icone" aria-hidden="true">
            <Icone nom={e.icone} taille={30} />
          </span>
          <h2 id="fin-tuto-titre">{e.titre}</h2>
          {e.texte.map((t, k) => (
            <p key={k}>{t}</p>
          ))}
        </div>
        <div className="fin-tuto-points" aria-hidden="true">
          {etapes.map((_, k) => (
            <button type="button" key={k} tabIndex={-1} className={k === i ? "actif" : ""} onClick={() => setI(k)} />
          ))}
        </div>
        <div className="fin-tuto-actions">
          <button type="button" className="fin-btn blanc" onClick={() => setI(i - 1)} disabled={i === 0}>
            Précédent
          </button>
          <button ref={bouton} type="button" className="fin-btn plein" onClick={() => (derniere ? onFermer() : setI(i + 1))}>
            {derniere ? "Commencer" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
