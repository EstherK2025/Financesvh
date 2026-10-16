"use client";

import { useEffect, useRef, useState } from "react";
import { FIN } from "@/lib/finances";

// Logo VH (public/vh-logo.png) ; à défaut, le sigle texte.
export default function Logo({ taille = 38 }: { taille?: number }) {
  const [erreur, setErreur] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // L'image a pu échouer avant l'hydratation (onError alors manqué).
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setErreur(true);
  }, []);
  if (erreur)
    return (
      <span className="fin-sigle" style={{ width: taille, height: taille, fontSize: taille * 0.42 }}>
        {FIN.sigle}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={FIN.logo} alt={FIN.organisation} width={taille} height={taille} className="fin-logo" onError={() => setErreur(true)} />
  );
}
