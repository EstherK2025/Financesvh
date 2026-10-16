"use client";

import { useCallback, useState } from "react";
import type { Etape } from "@/lib/tutoriel";
import Tutoriel from "./Tutoriel";

// Affiché une seule fois, après la première connexion.
export default function TutorielBienvenue({ etapes }: { etapes: Etape[] }) {
  const [ouvert, setOuvert] = useState(true);
  const fermer = useCallback(() => {
    setOuvert(false);
    fetch("/api/tutoriel", { method: "POST" }).catch(() => {});
  }, []);
  return ouvert ? <Tutoriel etapes={etapes} onFermer={fermer} /> : null;
}
