import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comptePremiere, creerCode, egalConstant, fermerPremiere, hacherMotDePasse, ouvrirSession } from "@/lib/fin-auth";
import { courrielCode } from "@/lib/fin-email";
import { doubleAuthActive, mdpTemporaire } from "@/lib/fin-reglages";
import { masquerCourriel, problemeMotDePasse, nomUtilisateur } from "@/lib/finances";

// Première connexion : la personne crée SON mot de passe (et donne son courriel
// si le compte n'en a pas et que la double authentification est activée), puis
// est connectée — ou reçoit d'abord son code si la double authentification est active.
export async function POST(req: Request) {
  const u = await comptePremiere();
  if (!u) return NextResponse.json({ error: "Session expirée. Reconnectez-vous avec le mot de passe temporaire." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const mdp = String(b.motDePasse || "");
  const pb = problemeMotDePasse(mdp);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  if (egalConstant(mdp, await mdpTemporaire()))
    return NextResponse.json({ error: "Choisissez un mot de passe différent du mot de passe temporaire." }, { status: 400 });

  const deuxFacteurs = await doubleAuthActive();
  let courriel = u.courriel;
  if (!courriel && deuxFacteurs) {
    courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel))
      return NextResponse.json({ error: "Indiquez un courriel valide : il recevra vos codes de connexion." }, { status: 400 });
    if (await prisma.finUtilisateur.findUnique({ where: { courriel } }))
      return NextResponse.json({ error: "Ce courriel est déjà utilisé par un autre compte." }, { status: 409 });
  }

  await prisma.finUtilisateur.update({
    where: { id: u.id },
    data: { courriel, motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
  });
  await fermerPremiere();

  if (!deuxFacteurs || !courriel) {
    await ouvrirSession(u.id);
    return NextResponse.json({ ok: true, etape: "connecte" });
  }

  try {
    const code = await creerCode(u.id);
    await courrielCode(courriel, nomUtilisateur(u), code);
  } catch (e) {
    console.error("[finances] envoi du code impossible :", e);
    return NextResponse.json({ error: "Mot de passe enregistré, mais le code n'a pas pu être envoyé. Reconnectez-vous." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, etape: "code", courriel: masquerCourriel(courriel) });
}
