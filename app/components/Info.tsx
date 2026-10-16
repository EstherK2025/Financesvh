"use client";

import { useId, useState } from "react";

// Petit « i » : un clic affiche l'explication, un autre la cache.
function BoutonInfo({ ouvert, onClick, sujet, controle }: { ouvert: boolean; onClick: () => void; sujet: string; controle: string }) {
  return (
    <button
      type="button"
      className={`fin-info-i${ouvert ? " ouvert" : ""}`}
      onClick={onClick}
      aria-expanded={ouvert}
      aria-controls={controle}
      aria-label={`${ouvert ? "Masquer" : "Afficher"} l'explication : ${sujet}`}
      title="Explication"
    >
      i
    </button>
  );
}

// Titre suivi d'un « i » ; l'explication se déroule en dessous.
export function TitreInfo({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <>
      <span className="fin-info-ligne">
        <b className="fin-titre-note">{titre}</b>
        <BoutonInfo ouvert={ouvert} onClick={() => setOuvert(!ouvert)} sujet={titre} controle={id} />
      </span>
      {ouvert && (
        <span id={id} className="fin-info-bulle" role="note">
          {children}
        </span>
      )}
    </>
  );
}

// Rangée d'étiquettes, chacune avec son « i » ; l'explication choisie s'affiche sous la rangée.
export function EtiquettesInfo({ items }: { items: { titre: string; texte: string }[] }) {
  const [choisi, setChoisi] = useState<number | null>(null);
  const id = useId();
  return (
    <div className="fin-etiquettes-info">
      <div className="fin-etiquettes">
        {items.map((it, k) => (
          <span key={it.titre} className={`fin-etiquette${choisi === k ? " ouvert" : ""}`}>
            <BoutonInfo ouvert={choisi === k} onClick={() => setChoisi(choisi === k ? null : k)} sujet={it.titre} controle={id} />
            {it.titre}
          </span>
        ))}
      </div>
      {choisi !== null && (
        <div id={id} className="fin-info-bulle" role="note">
          <b>{items[choisi].titre}</b> — {items[choisi].texte}
        </div>
      )}
    </div>
  );
}
