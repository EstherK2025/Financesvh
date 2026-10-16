import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fermerSessionsDe, hacherMotDePasse, utilisateurCourant } from "@/lib/fin-auth";
import { normaliserIdentifiant, problemeIdentifiant } from "@/lib/finances";
import { journaliser } from "@/lib/fin-securite";

// Compte UNIQUE d'approbateur externe (super administrateur) : identifiant et
// mot de passe fixes, partagés. À chaque décision, la personne connectée saisit
// son nom, sa fonction, sa signature et la justification.
//  POST { identifiant?, motDePasse? } → crée le compte, ou change son identifiant / mot de passe
//  PATCH { actif } → active / désactive
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const existant = await prisma.finUtilisateur.findFirst({ where: { role: "delegue" } });

  const data: Record<string, unknown> = {};
  if (b.identifiant !== undefined || !existant) {
    const identifiant = normaliserIdentifiant(b.identifiant || "approbateur");
    const pb = problemeIdentifiant(identifiant);
    if (pb) return NextResponse.json({ error: pb }, { status: 400 });
    const autre = await prisma.finUtilisateur.findUnique({ where: { identifiant } });
    if (autre && autre.id !== existant?.id) return NextResponse.json({ error: `L'identifiant « ${identifiant} » est déjà pris.` }, { status: 409 });
    data.identifiant = identifiant;
  }
  if (b.motDePasse !== undefined || !existant) {
    const mdp = String(b.motDePasse || "");
    if (mdp.length < 8 || /\s/.test(mdp)) return NextResponse.json({ error: "Mot de passe : 8 caractères minimum, sans espace." }, { status: 400 });
    data.motDePasse = hacherMotDePasse(mdp);
  }

  if (existant) {
    await prisma.finUtilisateur.update({ where: { id: existant.id }, data: { ...data, echecs: 0, verrouJusqua: null } });
    if (data.motDePasse) await fermerSessionsDe(existant.id);
  } else {
    await prisma.finUtilisateur.create({
      data: { ...(data as { identifiant: string; motDePasse: string }), role: "delegue", prenom: "Approbateur", nom: "externe" },
    });
  }
  await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: "Approbateur externe" });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const existant = await prisma.finUtilisateur.findFirst({ where: { role: "delegue" } });
  if (!existant) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  await prisma.finUtilisateur.update({ where: { id: existant.id }, data: { actif: Boolean(b.actif) } });
  if (!b.actif) await fermerSessionsDe(existant.id);
  await journaliser("reglage_modifie", { utilisateurId: moi.id, detail: `Approbateur externe ${b.actif ? "activé" : "désactivé"}` });
  return NextResponse.json({ ok: true });
}
