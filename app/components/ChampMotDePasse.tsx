"use client";

import { useState } from "react";
import Icone from "./Icone";

// Champ mot de passe avec un petit œil pour afficher / masquer ce qu'on tape.
export default function ChampMotDePasse(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="fin-mdp-champ">
      <input {...props} className="fin-input" type={visible ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="fin-mdp-oeil"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        title={visible ? "Masquer" : "Afficher"}
      >
        <Icone nom={visible ? "oeilBarre" : "oeil"} taille={19} />
      </button>
    </span>
  );
}
