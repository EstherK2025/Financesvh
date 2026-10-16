import { NextResponse } from "next/server";
import { codeEnAttente, creerCode } from "@/lib/fin-auth";
import { courrielCode } from "@/lib/fin-email";

// Renvoyer un nouveau code (tant que l'étape 1 est encore valide).
export async function POST() {
  const c = await codeEnAttente();
  if (!c || !c.utilisateur.courriel) return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  try {
    const code = await creerCode(c.utilisateurId);
    await courrielCode(c.utilisateur.courriel!, c.utilisateur.prenom, code);
  } catch {
    return NextResponse.json({ error: "Impossible d'envoyer le code." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
