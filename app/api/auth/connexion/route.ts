import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerCode, egalConstant, ouvrirPremiere, trouverCompte, verifierMotDePasse, MAX_ECHECS, DUREE_VERROU_MS } from "@/lib/fin-auth";
import { courrielCode } from "@/lib/fin-email";
import { mdpTemporaire } from "@/lib/fin-reglages";
import { masquerCourriel, nomUtilisateur } from "@/lib/finances";

// Étape 1 : identifiant (ou courriel) + mot de passe.
//  • Compte déjà activé → envoi d'un code par courriel (double authentification).
//  • Première connexion (aucun mot de passe choisi) → le mot de passe temporaire
//    universel donne accès à l'écran « Créez votre mot de passe », puis au code.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const motDePasse = String(b.motDePasse || "");
  const refus = NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  if (!motDePasse) return refus;

  const u = await trouverCompte(b.identifiant ?? b.courriel);
  if (!u || !u.actif) return refus;
  if (u.verrouJusqua && u.verrouJusqua > new Date()) {
    const min = Math.ceil((u.verrouJusqua.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `Compte verrouillé après plusieurs essais. Réessayez dans ${min} min.` }, { status: 429 });
  }

  const premiere = !u.motDePasse;
  const valide = premiere ? egalConstant(motDePasse, await mdpTemporaire()) : verifierMotDePasse(motDePasse, u.motDePasse);
  if (!valide) {
    const echecs = u.echecs + 1;
    await prisma.finUtilisateur.update({
      where: { id: u.id },
      data: echecs >= MAX_ECHECS ? { echecs: 0, verrouJusqua: new Date(Date.now() + DUREE_VERROU_MS) } : { echecs },
    });
    return refus;
  }

  if (premiere) {
    await ouvrirPremiere(u.id);
    return NextResponse.json({ ok: true, etape: "premiere", prenom: nomUtilisateur(u), besoinCourriel: !u.courriel });
  }
  if (!u.courriel) return refus;

  try {
    const code = await creerCode(u.id);
    await courrielCode(u.courriel, nomUtilisateur(u), code);
  } catch (e) {
    console.error("[finances] envoi du code impossible :", e);
    return NextResponse.json({ error: "Impossible d'envoyer le code de vérification. Réessayez plus tard." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, etape: "code", courriel: masquerCourriel(u.courriel) });
}
