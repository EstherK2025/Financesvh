import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte } from "@/lib/fin-auth";
import { courrielInvitation } from "@/lib/fin-email";

// Mot de passe oublié : envoie un lien (réponse identique que le compte
// existe ou non, pour ne pas révéler les adresses inscrites).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const courriel = String(b.courriel || "").trim().toLowerCase();
  const u = courriel ? await prisma.finUtilisateur.findUnique({ where: { courriel } }) : null;
  if (u?.actif) {
    const jeton = await creerJetonCompte(u.id, 1);
    await courrielInvitation(u.courriel, u.prenom, jeton, true);
  }
  return NextResponse.json({ ok: true });
}
