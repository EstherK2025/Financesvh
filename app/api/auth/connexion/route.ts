import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerCode, verifierMotDePasse, MAX_ECHECS, DUREE_VERROU_MS } from "@/lib/fin-auth";
import { courrielCode } from "@/lib/fin-email";

// Étape 1 : courriel + mot de passe → envoi d'un code par courriel.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const courriel = String(b.courriel || "").trim().toLowerCase();
  const motDePasse = String(b.motDePasse || "");
  const refus = NextResponse.json({ error: "Courriel ou mot de passe incorrect." }, { status: 401 });
  if (!courriel || !motDePasse) return refus;

  const u = await prisma.finUtilisateur.findUnique({ where: { courriel } });
  if (!u || !u.actif || !u.motDePasse) return refus;
  if (u.verrouJusqua && u.verrouJusqua > new Date()) {
    const min = Math.ceil((u.verrouJusqua.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `Compte verrouillé après plusieurs essais. Réessayez dans ${min} min.` }, { status: 429 });
  }
  if (!verifierMotDePasse(motDePasse, u.motDePasse)) {
    const echecs = u.echecs + 1;
    await prisma.finUtilisateur.update({
      where: { id: u.id },
      data: echecs >= MAX_ECHECS ? { echecs: 0, verrouJusqua: new Date(Date.now() + DUREE_VERROU_MS) } : { echecs },
    });
    return refus;
  }

  try {
    const code = await creerCode(u.id);
    await courrielCode(u.courriel, u.prenom, code);
  } catch (e) {
    console.error("[finances] envoi du code impossible :", e);
    return NextResponse.json({ error: "Impossible d'envoyer le code de vérification. Réessayez plus tard." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, courriel: masquer(u.courriel) });
}

function masquer(c: string) {
  const [nom, dom] = c.split("@");
  return `${nom.slice(0, 2)}${"•".repeat(Math.max(1, nom.length - 2))}@${dom}`;
}
