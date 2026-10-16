"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Animation d'entrée de chaque page : glissement dans le sens de la navigation
// (gauche / droite), sinon simple fondu.
export default function Transition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [classe, setClasse] = useState("fin-entree");
  useEffect(() => {
    let sens = "";
    try {
      sens = sessionStorage.getItem("fin-sens") || "";
      sessionStorage.removeItem("fin-sens");
    } catch {
      sens = "";
    }
    setClasse(sens === "gauche" ? "fin-entree-gauche" : sens === "droite" ? "fin-entree-droite" : "fin-entree");
  }, [path]);
  return (
    <div key={path} className={`fin-page ${classe}`}>
      {children}
    </div>
  );
}
