import { NextResponse } from "next/server";
import { nomUtilisateur } from "@/lib/finances";
import { creerJetonCompte, trouverCompte } from "@/lib/fin-auth";
import { courrielInvitation } from "@/lib/fin-email";

// Mot de passe oublié : envoie un lien (réponse identique que le compte
// existe ou non, pour ne pas révéler les comptes inscrits).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const u = await trouverCompte(b.identifiant ?? b.courriel);
  if (u?.actif) {
    const jeton = await creerJetonCompte(u.id, 1);
    await courrielInvitation(u.courriel, nomUtilisateur(u), jeton, true);
  }
  return NextResponse.json({ ok: true });
}
