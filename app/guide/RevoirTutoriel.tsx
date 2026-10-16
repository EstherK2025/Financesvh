"use client";

import { useCallback, useState } from "react";
import type { Etape } from "@/lib/tutoriel";
import Tutoriel from "../components/Tutoriel";

export default function RevoirTutoriel({ etapes }: { etapes: Etape[] }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <button type="button" className="fin-btn plein" onClick={() => setOuvert(true)}>
        Revoir le tutoriel
      </button>
      {ouvert && <Tutoriel etapes={etapes} onFermer={fermer} />}
    </>
  );
}
