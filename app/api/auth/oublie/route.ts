import { NextResponse } from "next/server";
import { nomUtilisateur } from "@/lib/finances";
import { creerJetonCompte, trouverCompte } from "@/lib/fin-auth";
import { courrielInvitation } from "@/lib/fin-email";
import { REGLES, bloque, compter, ipClient, journaliser } from "@/lib/fin-securite";
import { sansAccents } from "@/lib/finances";

// Mot de passe oublié : envoie un lien (réponse identique que le compte
// existe ou non, pour ne pas révéler les comptes inscrits).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const saisie = sansAccents(String(b.identifiant ?? b.courriel ?? "").trim()).toLowerCase().slice(0, 160);
  // Limite : 3 demandes par identifiant et 10 par adresse IP, par heure. Au-delà,
  // rien n'est envoyé, mais la réponse reste la même (aucun compte révélé).
  const cles = [`oublie:ip:${await ipClient()}`, `oublie:id:${saisie}`];
  if (!saisie || (await bloque(cles))) return NextResponse.json({ ok: true });
  await compter([
    [cles[0], REGLES.oublieIp],
    [cles[1], REGLES.oublieId],
  ]);
  const u = await trouverCompte(saisie);
  await journaliser("mdp_oublie", { utilisateurId: u?.id, identifiant: saisie });
  if (u?.actif && u.role !== "delegue") {
    const jeton = await creerJetonCompte(u.id, 1);
    await courrielInvitation(u.courriel, nomUtilisateur(u), jeton, true);
  }
  return NextResponse.json({ ok: true });
}
