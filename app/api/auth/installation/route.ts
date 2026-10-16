import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, motDePasseInstallationValide } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { normaliserIdentifiant, problemeIdentifiant, nomUtilisateur } from "@/lib/finances";

// Création du tout premier super admin (possible uniquement quand aucun compte
// n'existe encore). Protégée par le mot de passe d'installation.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if ((await prisma.finUtilisateur.count()) > 0)
    return NextResponse.json({ error: "La plateforme est déjà installée." }, { status: 403 });
  if (!motDePasseInstallationValide(String(b.motDePasseInstallation || "")))
    return NextResponse.json({ error: "Mot de passe d'installation incorrect." }, { status: 401 });

  const prenom = String(b.prenom || "").trim().slice(0, 80);
  const nom = String(b.nom || "").trim().slice(0, 80);
  const courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160);
  const identifiant = normaliserIdentifiant(b.identifiant);
  if (!prenom || !nom || !courriel.includes("@"))
    return NextResponse.json({ error: "Prénom, nom et courriel requis." }, { status: 400 });
  const pb = problemeIdentifiant(identifiant);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });

  const u = await prisma.finUtilisateur.create({ data: { prenom, nom, identifiant, courriel, role: "superadmin" } });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, nomUtilisateur(u), jeton);
  // Le lien est aussi renvoyé directement (l'installateur connaît le mot de passe d'installation).
  return NextResponse.json({ ok: true, lien: lienFinances(`/activer/${jeton}`) });
}
